/**
 * contact-avatars — baixa e mantém atualizada a foto de perfil dos contatos.
 *
 * POR QUE UM CRON, E NÃO NA INGESTÃO
 * O webhook de entrada precisa responder rápido: baixar e subir uma imagem no meio
 * dele atrasaria a gravação da mensagem e, num pico, faria o canal reenfileirar.
 * Aqui vale a mesma regra do resto do repo — trabalho pesado sai do caminho
 * quente e vira varredura periódica.
 *
 * POR QUE O ARQUIVO, E NÃO A URL
 * O canal devolve uma URL assinada do CDN do WhatsApp, com `oe=<expiração>` no
 * fim. Medido numa instalação real: 9 dias. Guardar a URL faria todo avatar
 * sumir da tela em pouco mais de uma semana, sem erro nenhum. Então o arquivo
 * vai para o bucket privado `whatsapp-media`, como já se faz com a mídia das
 * mensagens, e a tela pede URL assinada na hora.
 *
 * ORDEM DA VARREDURA: `avatar_updated_at nulls first` — quem nunca teve foto
 * entra antes de quem só está desatualizado. O rosto que falta incomoda mais
 * que o rosto velho.
 *
 * Chamado pelo cron autenticado e por rotas com escopo de organização confiável.
 */

import { DEFAULT_CHANNEL_PROVIDER, getAdapter, type ChannelProvider } from "@/lib/channels";
import { CHANNEL_SESSION_REF_COLUMNS, resolveSessionRef, type ChannelSessionRef } from "@/lib/channels/session-ref";
import { contactPhotoRecipient, isContactPhotoUrl } from "@/lib/channels/profile-recipient";
import { logger } from "@/lib/logger";
import { createAdminClient } from "@/lib/supabase/admin";
import { PROVIDERS_DE_MENSAGEM } from "@/lib/channels/capabilities";



/** Contatos por invocação. Baixar imagem é I/O: cap baixo evita segurar o cron. */
const SCAN_LIMIT = 25;
/** Revisita a foto a cada 7 dias — gente troca de foto, mas não toda hora. */
const REFRESH_AFTER_DAYS = 7;
/** Foto de perfil do WhatsApp é pequena; acima disto é resposta errada. */
const MAX_BYTES = 2 * 1024 * 1024;

interface ContactRow {
  id: string;
  organization_id: string;
  wa_identity: string | null;
  wa_lid: string | null;
  phone_number: string | null;
  avatar_storage_path: string | null;
  source_metadata?: Record<string, unknown> | null;
}

/**
 * Identidade do contato → o chatId que o adapter espera.
 *
 * A ordem vem da fronteira de canal: identidade opaca primeiro, telefone por
 * último. Esta função só lia `wa_identity` — que é GERADA com o telefone antes
 * do lid (migration 0122). Num número BR cujo wa_id não tem o nono dígito, isso
 * produzia `55AA9BBBBCCCC@c.us`, endereço inexistente: o provider devolvia
 * `profilePictureURL: null`, o job carimbava "sem foto" e o avatar nunca vinha.
 * O lid não depende do telefone, por isso vem na frente.
 */
export async function refreshContactAvatars(options: {
  requestId: string; organizationId?: string; channelId?: string;
  afterId?: string; limit?: number; contactIds?: string[]; channelByContact?: Record<string, string>;
}) {
  const { requestId } = options;
  const admin = createAdminClient();
  const cutoff = new Date(Date.now() - REFRESH_AFTER_DAYS * 86_400_000).toISOString();

  // Nunca buscados (null) OU buscados há mais de REFRESH_AFTER_DAYS.
  //
  // `is_anonymized` fora é OBRIGATÓRIO, não otimização: sem esse filtro, um
  // contato anonimizado por pedido LGPD voltaria a ser varrido no refresh
  // seguinte e o cron BAIXARIA O ROSTO DELE DE NOVO — reintroduzindo, sozinho e
  // periodicamente, o dado pessoal que acabara de ser apagado. A anonimização é
  // declarada irreversível no produto; esta linha é o que sustenta isso.
  let ids = options.contactIds;
  let nextAfter: string | null = null;
  if (options.channelId) {
    if (!options.organizationId) throw new Error("avatar_scope_required");
    let conversations = admin.from("conversations").select("contact_id")
      .eq("organization_id", options.organizationId).eq("channel_session_id", options.channelId)
      .order("contact_id", { ascending: true }).limit(options.limit ?? 5);
    if (options.afterId) conversations = conversations.gt("contact_id", options.afterId);
    const { data, error } = await conversations;
    if (error) throw new Error("avatar_query_failed");
    ids = (data ?? []).map((row) => row.contact_id as string);
    nextAfter = ids.at(-1) ?? null;
    if (!ids.length) return { scanned: 0, updated: 0, no_picture: 0, failed: 0, after_id: null, done: true };
  }
  let query = admin.from("contacts")
    .select("id, organization_id, wa_identity, wa_lid, phone_number, avatar_storage_path, source_metadata")
    .not("wa_identity", "is", null).eq("is_anonymized", false).is("is_merged_into", null);
  if (options.organizationId) query = query.eq("organization_id", options.organizationId);
  if (ids) query = query.in("id", ids);
  if (!options.channelId) query = query.or(`avatar_updated_at.is.null,avatar_updated_at.lt.${cutoff}`);
  const { data: contatos, error: queryError } = await query
    .order("avatar_updated_at", { ascending: true, nullsFirst: true })
    .limit(options.limit ?? SCAN_LIMIT);

  if (queryError) {
    logger.error("[contact-avatars] query failed", { detail: queryError.message, requestId });
    throw new Error("avatar_query_failed");
  }

  const rows = (contatos ?? []) as ContactRow[];
  let atualizados = 0;
  let semFoto = 0;
  let falhas = 0;

  for (const c of rows) {
    const chatId = contactPhotoRecipient(c);
    // Carimba mesmo sem conseguir resolver o chatId: sem isso o contato voltaria
    // em TODA rodada do cron, para sempre, batendo no canal à toa.
    //
    // `is_anonymized = false` no UPDATE não repete o filtro do SELECT — fecha uma
    // corrida. Entre a seleção do lote e esta gravação há I/O de rede por contato
    // (canal, download, upload), e a anonimização em escopo de tenant percorre
    // centenas de contatos enquanto isto roda. Se o pedido LGPD alcançar este
    // contato no meio do caminho, sem esta cláusula o cron gravaria o rosto de
    // volta num contato JÁ anonimizado — e o filtro do SELECT nunca mais o
    // escolheria para corrigir. Devolve as linhas afetadas para que quem chamou
    // saiba se a gravação valeu.
    const carimbar = async (path: string | null): Promise<boolean> => {
      const { data: afetadas } = await admin
        .from("contacts")
        .update({
          ...(path !== null ? { avatar_storage_path: path } : {}),
          avatar_updated_at: new Date().toISOString(),
        })
        .eq("id", c.id)
        .eq("organization_id", c.organization_id)
        .eq("is_anonymized", false)
        .select("id");
      return (afetadas ?? []).length > 0;
    };

    if (!chatId) {
      await carimbar(null);
      semFoto++;
      continue;
    }

    try {
      let sessionQuery = admin
        .from("channel_sessions")
        .select(CHANNEL_SESSION_REF_COLUMNS)
        .eq("organization_id", c.organization_id)
        .eq("status", "WORKING")
        // Sem o filtro, a linha de chamada de voz (spec 18) — que nasce
        // `WORKING` ao parear — podia ganhar este `limit(1)` sem ordenação e
        // devolver identificador de sessão nulo: a foto de todo mundo parava de
        // atualizar em silêncio, com o `carimbar(null)` logo abaixo parecendo
        // "este contato não tem foto".
        .in("provider", [...PROVIDERS_DE_MENSAGEM])
        .limit(1);
      const preferred = options.channelId ?? options.channelByContact?.[c.id];
      if (preferred) sessionQuery = sessionQuery.eq("id", preferred);
      const { data: sessao, error: sessionError } = await sessionQuery.maybeSingle();
      const ref = sessao ? resolveSessionRef(sessao as ChannelSessionRef) : null;
      if (sessionError || !ref) {
        falhas++;
        continue;
      }

      // Pelo adapter, nunca falando com o canal direto: a doutrina
      // `restricao-de-canal` proíbe nomear provider fora de lib/channels/, e o
      // `pnpm lint:channels` reprova o build se acontecer (foi o que pegou a
      // primeira versão desta rota). Testar a PRESENÇA do método é como se
      // pergunta "este canal sabe fazer isso?" sem perguntar qual canal é.
      const adapter = getAdapter(
        (sessao as { provider?: ChannelProvider | null } | null)?.provider ??
          DEFAULT_CHANNEL_PROVIDER,
      );
      if (!adapter.fetchProfilePictureUrl) {
        await carimbar(null);
        semFoto++;
        continue;
      }
      const profilePictureURL = await adapter.fetchProfilePictureUrl({
        organizationId: c.organization_id,
        sessionRef: ref,
        recipient: chatId,
      });
      if (!profilePictureURL) {
        // Contato sem foto ou com privacidade fechada: estado normal, não erro.
        await carimbar(null);
        semFoto++;
        continue;
      }

      if (!isContactPhotoUrl(profilePictureURL)) { falhas++; continue; }
      const img = await fetch(profilePictureURL, { signal: AbortSignal.timeout(10_000), redirect: "error" });
      if (!img.ok) {
        falhas++;
        continue;
      }
      const contentType = img.headers.get("content-type")?.split(";")[0] ?? "image/jpeg";
      if (!["image/jpeg", "image/png", "image/webp", "image/gif"].includes(contentType)) { falhas++; continue; }
      const reader = img.body?.getReader();
      if (!reader) { falhas++; continue; }
      const chunks: Uint8Array[] = [];
      let bytes = 0;
      try {
        while (true) {
          const part = await reader.read();
          if (part.done) break;
          bytes += part.value.byteLength;
          if (bytes > MAX_BYTES) { await reader.cancel(); break; }
          chunks.push(part.value);
        }
      } finally { reader.releaseLock(); }
      const buf = bytes > MAX_BYTES ? Buffer.alloc(0) : Buffer.concat(chunks);
      if (buf.byteLength === 0 || buf.byteLength > MAX_BYTES) {
        falhas++;
        continue;
      }

      // Caminho estável por contato: `upsert` sobrescreve a foto antiga em vez
      // de acumular um arquivo órfão por refresh (7 dias × N contatos viraria
      // lixo pago no bucket).
      const path = `${c.organization_id}/avatars/${c.id}.jpg`;
      const { error: upErr } = await admin.storage
        .from("whatsapp-media")
        .upload(path, buf, { contentType, upsert: true });
      if (upErr) {
        falhas++;
        continue;
      }

      const gravou = await carimbar(path);
      if (!gravou) {
        // O contato foi anonimizado enquanto baixávamos a foto dele. O arquivo
        // já subiu, então bloquear a gravação não basta: sem isto o objeto ficaria
        // no bucket sem ponteiro nenhum — pior que o defeito original, porque
        // invisível. Devolvemos à fila de redação, o mesmo caminho que a cascata
        // usa, e o worker de limpeza remove.
        await admin.from("storage_redaction_queue").upsert(
          {
            organization_id: c.organization_id,
            bucket: "whatsapp-media",
            object_path: path,
            status: "pending",
            attempts: 0,
            processed_at: null,
            error_message: null,
          },
          { onConflict: "bucket,object_path" },
        );
        logger.warn("[contact-avatars] anonimizado durante a busca; foto devolvida à fila", {
          contact_id: c.id,
          organization_id: c.organization_id,
          requestId,
        });
        semFoto++;
        continue;
      }
      atualizados++;
    } catch {
      falhas++;
      logger.warn("[contact-avatars] contato falhou", {
        contact_id: c.id,
        detail: "avatar_refresh_failed",
        requestId,
      });
    }
  }

  return { scanned: rows.length, updated: atualizados, no_picture: semFoto, failed: falhas,
    after_id: nextAfter, done: nextAfter === null };
}

const warming = new Map<string, { busy: boolean; next: number }>();
/** Small cold-photo batches after Inbox reads: no scheduler required for an active Inbox. */
export async function warmVisibleContactAvatars(organizationId: string, visible: { contact_id: string; channel_session_id: string }[], requestId: string) {
  if (!visible.length) return;
  const now = Date.now();
  const state = warming.get(organizationId);
  if (state?.busy || (state && state.next > now)) return;
  if (warming.size > 256) for (const [key, value] of warming) if (!value.busy && value.next <= now) warming.delete(key);
  warming.set(organizationId, { busy: true, next: now + 30_000 });
  try {
    await refreshContactAvatars({ organizationId, requestId, contactIds: visible.map((c) => c.contact_id),
      channelByContact: Object.fromEntries(visible.map((c) => [c.contact_id, c.channel_session_id])), limit: 3 });
  } catch { logger.warn("[contact-avatars] background refresh failed", { organization_id: organizationId, requestId }); }
  finally { warming.set(organizationId, { busy: false, next: Date.now() + 30_000 }); }
}
