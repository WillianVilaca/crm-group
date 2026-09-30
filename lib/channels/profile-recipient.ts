/** Keep transport addresses and stored aliases at the channel boundary. */
export function contactPhotoRecipient(c: {
  wa_lid?: string | null; wa_identity?: string | null; phone_number?: string | null;
  source_metadata?: Record<string, unknown> | null;
}): string | null {
  if (c.wa_lid) return `${c.wa_lid}@lid`;
  if (c.wa_identity?.startsWith("lid:")) return `${c.wa_identity.slice(4)}@lid`;
  const original = c.source_metadata?.waha_chat_id;
  if (typeof original === "string" && /^\d+@(c\.us|lid)$/.test(original)) return original;
  const phone = c.wa_identity?.startsWith("phone:") ? c.wa_identity.slice(6) : c.phone_number;
  return phone ? `${phone.replace(/\D/g, "")}@c.us` : null;
}

/** Signed photo URLs are only downloaded from the platform's public CDNs. */
export function isContactPhotoUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password && (!url.port || url.port === "443") &&
      ["whatsapp.net", "fbcdn.net"].some((domain) => url.hostname === domain || url.hostname.endsWith(`.${domain}`));
  } catch { return false; }
}
