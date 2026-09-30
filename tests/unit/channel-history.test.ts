import { describe, expect, it } from "vitest";
import { normalizeHistoryMessage } from "@/lib/channels/adapters/waha-history";
import { contactPhotoRecipient, isContactPhotoUrl } from "@/lib/channels/profile-recipient";
import { readHistoryCursor, signHistoryCursor } from "@/lib/contacts/history-cursor";

const scope = { organization_id: "00000000-0000-4000-8000-000000000001", channel_id: "00000000-0000-4000-8000-000000000002", user_id: "00000000-0000-4000-8000-000000000003" };
const now = 1_800_000_000_000;
const cursor = { ...scope, since: 1_799_000_000, until: 1_800_000_000, offset: 100, expires_at: now + 100_000 };
const raw = { id: "false_551188887777@c.us_ABC", timestamp: cursor.until - 60, fromMe: false, body: "Histórico de teste", ack: 3, _data: { pushName: "Contato de teste" } };

describe("historical channel boundary", () => {
  it("preserves the original timestamp, sender, identity and external deduplication key", () => {
    expect(normalizeHistoryMessage(raw, cursor.since, cursor.until)).toMatchObject({
      external_id: raw.id, external_key: "ABC", chat_id: "551188887777@c.us", direction: "inbound",
      phone_number: "+551188887777", display_name: "Contato de teste", sent_at: new Date(raw.timestamp * 1000).toISOString(),
    });
  });
  it("finds the contact in an outgoing message without mistaking the owner for the contact", () => {
    expect(normalizeHistoryMessage({ ...raw, id: "true_123456789@lid_ABC", fromMe: true, from: "owner@c.us" }, cursor.since, cursor.until))
      .toMatchObject({ lid: "123456789", direction: "outbound", display_name: null });
  });
  it.each(["12345@g.us", "status@broadcast", "12345@newsletter"])("ignores %s", (chat) => {
    expect(normalizeHistoryMessage({ ...raw, id: `false_${chat}_ABC` }, cursor.since, cursor.until)).toBeNull();
  });
  it("rejects invalid timestamps and messages outside the fixed import window", () => {
    expect(normalizeHistoryMessage({ ...raw, timestamp: 1e20 }, cursor.since, cursor.until)).toBeNull();
    expect(normalizeHistoryMessage({ ...raw, timestamp: cursor.until + 1 }, cursor.since, cursor.until)).toBeNull();
    expect(normalizeHistoryMessage({ ...raw, timestamp: cursor.since - 1 }, cursor.since, cursor.until)).toBeNull();
  });
  it("preserves attachment type without pretending the attachment was recovered", () => {
    expect(normalizeHistoryMessage({ ...raw, body: null, hasMedia: true, _data: { message: { imageMessage: {} } } }, cursor.since, cursor.until))
      .toMatchObject({ type: "image", body: null });
  });
});

describe("history cursor authorization", () => {
  it("accepts only the originating user, organization and channel", () => {
    const token = signHistoryCursor(cursor, "test-only-secret");
    expect(readHistoryCursor(token, "test-only-secret", scope, now)).toEqual(cursor);
    for (const key of ["organization_id", "channel_id", "user_id"] as const) {
      expect(readHistoryCursor(token, "test-only-secret", { ...scope, [key]: "00000000-0000-4000-8000-000000000099" }, now)).toBeNull();
    }
  });
  it("rejects tampering, expiration and the wrong signing key", () => {
    const token = signHistoryCursor(cursor, "test-only-secret");
    expect(readHistoryCursor(`x${token}`, "test-only-secret", scope, now)).toBeNull();
    expect(readHistoryCursor(token, "other-secret", scope, now)).toBeNull();
    expect(readHistoryCursor(token, "test-only-secret", scope, cursor.expires_at)).toBeNull();
  });
});

describe("contact photo identity and CDN safety", () => {
  it("prefers a LID, then the actual chat address instead of inventing a ninth digit", () => {
    expect(contactPhotoRecipient({ wa_lid: "123456789", source_metadata: { waha_chat_id: "551188887777@c.us" } })).toBe("123456789@lid");
    expect(contactPhotoRecipient({ phone_number: "+5511988887777", source_metadata: { waha_chat_id: "551188887777@c.us" } })).toBe("551188887777@c.us");
  });
  it("accepts HTTPS platform CDNs, not internal addresses, redirects or look-alike hosts", () => {
    expect(isContactPhotoUrl("https://pps.whatsapp.net/photo.jpg")).toBe(true);
    expect(isContactPhotoUrl("https://scontent.fbcdn.net/photo.jpg")).toBe(true);
    for (const url of ["http://127.0.0.1/photo", "https://localhost/photo", "https://whatsapp.net.evil.test/photo", "https://user:pass@pps.whatsapp.net/photo"]) expect(isContactPhotoUrl(url)).toBe(false);
  });
});
