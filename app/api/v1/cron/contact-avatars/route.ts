/**
 * Bounded, authenticated sweep; the same worker powers manual refresh.
 * Photo I/O stays outside live inbound processing.
 */
import { randomUUID } from "node:crypto";
import type { NextRequest } from "next/server";
import { ok, fail } from "@/lib/api/wrappers";
import { env } from "@/lib/env";
import { refreshContactAvatars } from "@/lib/contacts/avatars";

export const dynamic = "force-dynamic";
async function handle(req: NextRequest): Promise<Response> {
  const requestId = randomUUID();
  const auth = req.headers.get("authorization") ?? "";
  const provided = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";
  const accepted = [env.INTERNAL_CRON_SECRET, env.INTERNAL_SECRET].filter(Boolean);
  if (!provided || !accepted.includes(provided)) return fail("forbidden", "Cron secret missing or invalid.", 403, { requestId });
  try {
    const { scanned, updated, no_picture, failed } = await refreshContactAvatars({ requestId });
    return ok({ scanned, updated, no_picture, failed }, { requestId });
  } catch {
    return fail("internal_error", "Não foi possível atualizar as fotos.", 500, { requestId });
  }
}
export const GET = handle;
export const POST = handle;
