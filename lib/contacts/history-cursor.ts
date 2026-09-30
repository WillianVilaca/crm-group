import { createHmac, timingSafeEqual } from "node:crypto";
import { z } from "zod";

const cursorSchema = z.object({
  organization_id: z.string().uuid(), channel_id: z.string().uuid(), user_id: z.string().uuid(),
  since: z.number().int().positive(), until: z.number().int().positive(),
  offset: z.number().int().min(0).max(1_000_000), expires_at: z.number().int().positive(),
}).strict();
export type HistoryCursor = z.infer<typeof cursorSchema>;

export function signHistoryCursor(cursor: HistoryCursor, secret: string): string {
  if (!secret) throw new Error("history_cursor_secret_missing");
  const payload = Buffer.from(JSON.stringify(cursorSchema.parse(cursor))).toString("base64url");
  const signature = createHmac("sha256", secret).update(`channel-history:v1:${payload}`).digest("base64url");
  return `${payload}.${signature}`;
}

export function readHistoryCursor(token: string, secret: string, scope: {
  organization_id: string; channel_id: string; user_id: string;
}, now = Date.now()): HistoryCursor | null {
  try {
    if (!secret || token.length > 2048) return null;
    const parts = token.split(".");
    if (parts.length !== 2) return null;
    const [payload, signed] = parts;
    if (!payload || !signed) return null;
    const signature = Buffer.from(signed, "base64url");
    const expected = createHmac("sha256", secret).update(`channel-history:v1:${payload}`).digest();
    if (signature.length !== expected.length || !timingSafeEqual(signature, expected)) return null;
    const cursor = cursorSchema.parse(JSON.parse(Buffer.from(payload, "base64url").toString("utf8")));
    if (cursor.expires_at <= now || cursor.until > Math.floor(now / 1000) || cursor.since > cursor.until) return null;
    return cursor.organization_id === scope.organization_id && cursor.channel_id === scope.channel_id &&
      cursor.user_id === scope.user_id ? cursor : null;
  } catch { return null; }
}
