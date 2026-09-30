import { z } from "zod";
import { getWahaClient } from "@/lib/waha/client";
import { bareWaMessageId, chatIdFromWaMessageId } from "@/lib/waha/message-id";
import type { ChannelHistoryOps, HistoricalMessage } from "../history-types";

const messageSchema = z.object({
  id: z.string().min(1).max(512),
  timestamp: z.number().finite().positive(),
  fromMe: z.boolean(),
  from: z.string().optional(),
  to: z.string().nullable().optional(),
  body: z.string().max(100_000).nullable().optional(),
  hasMedia: z.boolean().optional(),
  ack: z.number().int().min(-1).max(4).nullable().optional(),
  _data: z.object({
    pushName: z.string().max(200).optional(),
    key: z.object({ remoteJid: z.string().optional(), remoteJidAlt: z.string().optional() }).optional(),
    message: z.record(z.string(), z.unknown()).optional(),
  }).passthrough().optional(),
}).passthrough();

/** Engine-specific identity and message shapes stop at this boundary. */
export function normalizeHistoryMessage(raw: unknown, since: number, until: number): HistoricalMessage | null {
  const parsed = messageSchema.safeParse(raw);
  if (!parsed.success) return null;
  const m = parsed.data;
  const timestamp = m.timestamp > 1e12 ? Math.floor(m.timestamp / 1000) : Math.floor(m.timestamp);
  if (timestamp < since || timestamp > until) return null;
  const chat = (chatIdFromWaMessageId(m.id) ?? m._data?.key?.remoteJid ??
    (m.fromMe ? m.to ?? m.from : m.from) ?? "").replace(/@s\.whatsapp\.net$/, "@c.us");
  const identity = /^(\d{5,20})@(c\.us|lid)$/.exec(chat);
  if (!identity) return null; // No groups, statuses, newsletters or system events.
  const alt = /^(\d{5,20})@(c\.us|s\.whatsapp\.net)$/.exec(m._data?.key?.remoteJidAlt ?? "");
  const kind = identity[2] === "lid" ? "lid" : "phone";
  const content = m._data?.message ?? {};
  let type: HistoricalMessage["type"] = "text";
  if ("imageMessage" in content) type = "image";
  else if ("audioMessage" in content) type = "audio";
  else if ("videoMessage" in content) type = "video";
  else if ("documentMessage" in content) type = "document";
  else if ("stickerMessage" in content) type = "sticker";
  else if ("locationMessage" in content || "liveLocationMessage" in content) type = "location";
  else if ("contactMessage" in content || "contactsArrayMessage" in content) type = "contact";
  else if (m.hasMedia) type = "document";
  const body = m.body ?? (typeof content.conversation === "string" ? content.conversation : null);
  if (!body && type === "text") return null;
  return {
    external_id: m.id, external_key: bareWaMessageId(m.id), chat_id: chat,
    identity_kind: kind, phone_number: kind === "phone" ? `+${identity[1]}` : alt ? `+${alt[1]}` : null,
    lid: kind === "lid" ? identity[1] ?? null : null,
    // fromMe pushName is the owner, not the contact.
    display_name: m.fromMe ? null : m._data?.pushName ?? null,
    direction: m.fromMe ? "outbound" : "inbound", type, body,
    sent_at: new Date(timestamp * 1000).toISOString(), ack: m.ack ?? null,
  };
}

export const wahaHistory: ChannelHistoryOps = {
  async status({ sessionRef }) {
    const client = getWahaClient();
    if (!client) throw new Error("history_transport_unavailable");
    const session = await client.getVerifiedSession(sessionRef);
    if (!session || session.status !== "WORKING") return { available: false, reason: "disconnected" };
    const config = z.object({ noweb: z.object({ store: z.object({ enabled: z.boolean() }).passthrough() }).passthrough() })
      .safeParse(session.config);
    return config.success && config.data.noweb.store.enabled
      ? { available: true, reason: "ready" }
      : { available: false, reason: "storage_disabled" };
  },
  async page(input) {
    const client = getWahaClient();
    if (!client) throw new Error("history_transport_unavailable");
    const raw = await client.getHistoryMessages(input.sessionRef, input);
    const rows = z.array(z.unknown()).parse(raw);
    return {
      messages: rows.flatMap((row) => {
        const message = normalizeHistoryMessage(row, input.since, input.until);
        return message ? [message] : [];
      }),
      scanned: rows.length,
    };
  },
};
