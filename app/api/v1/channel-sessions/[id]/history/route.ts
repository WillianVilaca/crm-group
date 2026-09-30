import { randomUUID } from "node:crypto";
import { z } from "zod";
import type { NextRequest } from "next/server";
import { requireSupportWrite } from "@/lib/impersonate/support";
import { requireRole } from "@/lib/auth/require-role";
import { mfaEmDivida } from "@/lib/auth/server";
import { ok, fail } from "@/lib/api/wrappers";
import { audit } from "@/lib/audit";
import { getAdapter, CHANNEL_SESSION_REF_COLUMNS, resolveSessionRef, type ChannelSessionRef } from "@/lib/channels";
import { createAdminClient } from "@/lib/supabase/admin";
import { env } from "@/lib/env";
import { readHistoryCursor, signHistoryCursor } from "@/lib/contacts/history-cursor";
import { traduzir } from "@/lib/i18n/dicionario";

export const dynamic = "force-dynamic";
const inputSchema = z.object({ days: z.union([z.literal(30), z.literal(90), z.literal(365)]).default(90), cursor: z.string().max(2048).optional() }).strict();
const receiptSchema = z.object({ imported: z.number().int().nonnegative(), skipped: z.number().int().nonnegative() });
const PAGE_SIZE = 100;

async function handle(req: NextRequest, context: { params: Promise<{ id: string }> }): Promise<Response> {
  if (req.method === "POST") {
    const denied = await requireSupportWrite();
    if (denied) return denied;
  }
  const requestId = randomUUID();
  const auth = await requireRole("admin", { requestId, resource: "channel_sessions", allowPlatformAdmin: true });
  if (!auth.ok) return auth.response;
  const t = (text: string) => traduzir(text, auth.user.idioma);
  if (await mfaEmDivida()) return fail("mfa_required", t("Confirme a verificação em duas etapas."), 403, { requestId });
  const params = z.object({ id: z.string().uuid() }).safeParse(await context.params);
  if (!params.success) return fail("validation_failed", t("Conexão inválida."), 422, { requestId });
  const orgId = auth.org.orgId;
  const channelId = params.data.id;
  const admin = createAdminClient();
  const { data: channel, error } = await admin.from("channel_sessions")
    .select(`id, archived_at, ${CHANNEL_SESSION_REF_COLUMNS}`)
    .eq("organization_id", orgId).eq("id", channelId).maybeSingle();
  if (error) return fail("internal_error", t("Não foi possível consultar a conexão."), 500, { requestId });
  if (!channel) return fail("not_found", t("Conexão não encontrada."), 404, { requestId });
  if (channel.archived_at) return fail("channel_archived", t("Esta conexão foi arquivada."), 409, { requestId });
  const adapter = getAdapter(channel.provider);
  if (!adapter.history) {
    if (req.method === "GET") return ok({ available: false, reason: "unsupported" }, { requestId });
    return fail("history_unavailable", t("Esta conexão não oferece importação de histórico."), 409, { requestId });
  }
  const sessionRef = resolveSessionRef(channel as ChannelSessionRef);
  try {
    const status = await adapter.history.status({ organizationId: orgId, sessionRef });
    if (req.method === "GET") return ok(status, { requestId, headers: { "Cache-Control": "no-store" } });
    if (!status.available) return fail("history_unavailable", t("O histórico não está disponível nesta sessão. A conexão atual foi preservada."), 409, { requestId, details: { reason: status.reason } });
    const input = inputSchema.safeParse(await req.json().catch(() => null));
    if (!input.success) return fail("validation_failed", t("Escolha um período válido."), 422, { requestId });
    const scope = { organization_id: orgId, channel_id: channelId, user_id: auth.user.id };
    const secret = env.INTERNAL_CRON_SECRET || env.INTERNAL_SECRET || env.SUPABASE_SERVICE_ROLE_KEY;
    const until = Math.floor(Date.now() / 1000);
    const cursor = input.data.cursor ? readHistoryCursor(input.data.cursor, secret, scope) : {
      ...scope, since: until - input.data.days * 86_400, until, offset: 0, expires_at: Date.now() + 86_400_000,
    };
    if (!cursor) return fail("invalid_cursor", t("A importação expirou. Inicie novamente; mensagens já importadas não serão duplicadas."), 400, { requestId });
    const page = await adapter.history.page({ organizationId: orgId, sessionRef, offset: cursor.offset, limit: PAGE_SIZE, since: cursor.since, until: cursor.until });
    const { data, error: importError } = await admin.rpc("fn_import_channel_history", {
      p_org: orgId, p_channel: channelId, p_messages: page.messages,
    });
    if (importError) return fail(importError.code === "PGRST202" ? "history_schema_required" : "history_import_failed",
      t(importError.code === "PGRST202" ? "A atualização do banco para importar histórico ainda não foi aplicada." : "Este lote não foi importado. Você pode tentar novamente sem duplicar mensagens."), 503, { requestId });
    const receipt = receiptSchema.safeParse(data);
    if (!receipt.success) return fail("history_import_failed", t("Não foi possível confirmar o resultado. Tente novamente sem duplicar mensagens."), 502, { requestId });
    const done = page.scanned === 0;
    const nextCursor = done ? null : signHistoryCursor({ ...cursor, offset: cursor.offset + PAGE_SIZE }, secret);
    await audit({ action: "channel.history_imported", organizationId: orgId, actorUserId: auth.user.id, resourceType: "channel_sessions", resourceId: channelId,
      requestId, bypassedRls: true, metadata: { ...receipt.data, scanned: page.scanned, done } });
    return ok({ ...receipt.data, skipped: receipt.data.skipped + page.scanned - page.messages.length, scanned: page.scanned, done, cursor: nextCursor }, { requestId });
  } catch {
    return fail("history_import_failed", t("O serviço de WhatsApp não respondeu à consulta de histórico. A conexão foi preservada; tente novamente."), 502, { requestId });
  }
}

export const GET = handle;
export const POST = handle;
