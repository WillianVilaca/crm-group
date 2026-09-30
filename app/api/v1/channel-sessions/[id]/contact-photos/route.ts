import { randomUUID } from "node:crypto";
import type { NextRequest } from "next/server";
import { z } from "zod";
import { requireSupportWrite } from "@/lib/impersonate/support";
import { requireRole } from "@/lib/auth/require-role";
import { mfaEmDivida } from "@/lib/auth/server";
import { ok, fail } from "@/lib/api/wrappers";
import { audit } from "@/lib/audit";
import { createAdminClient } from "@/lib/supabase/admin";
import { refreshContactAvatars } from "@/lib/contacts/avatars";
import { traduzir } from "@/lib/i18n/dicionario";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest, context: { params: Promise<{ id: string }> }): Promise<Response> {
  const denied = await requireSupportWrite();
  if (denied) return denied;
  const requestId = randomUUID();
  const auth = await requireRole("admin", { requestId, resource: "channel_sessions", allowPlatformAdmin: true });
  if (!auth.ok) return auth.response;
  const t = (text: string) => traduzir(text, auth.user.idioma);
  if (await mfaEmDivida()) return fail("mfa_required", t("Confirme a verificação em duas etapas."), 403, { requestId });
  const params = z.object({ id: z.string().uuid() }).safeParse(await context.params);
  const body = z.object({ after_id: z.string().uuid().optional() }).strict().safeParse(await req.json().catch(() => null));
  if (!params.success || !body.success) return fail("validation_failed", t("Dados inválidos."), 422, { requestId });
  const { data: channel, error } = await createAdminClient().from("channel_sessions").select("id, status, archived_at")
    .eq("organization_id", auth.org.orgId).eq("id", params.data.id).maybeSingle();
  if (error) return fail("internal_error", t("Não foi possível consultar a conexão."), 500, { requestId });
  if (!channel) return fail("not_found", t("Conexão não encontrada."), 404, { requestId });
  if (channel.archived_at) return fail("channel_archived", t("Esta conexão foi arquivada."), 409, { requestId });
  if (channel.status !== "WORKING") return fail("state_conflict", t("Conecte este número antes de buscar as fotos."), 409, { requestId });
  try {
    const result = await refreshContactAvatars({ organizationId: auth.org.orgId, channelId: channel.id, requestId, afterId: body.data.after_id, limit: 3 });
    await audit({ action: "channel.contact_photos_refreshed", organizationId: auth.org.orgId, actorUserId: auth.user.id,
      resourceType: "channel_sessions", resourceId: channel.id, requestId, bypassedRls: true,
      metadata: { scanned: result.scanned, updated: result.updated, no_picture: result.no_picture, failed: result.failed } });
    return ok(result, { requestId });
  } catch {
    return fail("internal_error", t("Não foi possível buscar as fotos. Tente novamente."), 502, { requestId });
  }
}
