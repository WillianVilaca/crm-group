/** Historical reads never enter the live inbound dispatcher. */
export interface HistoricalMessage {
  external_id: string;
  external_key: string;
  chat_id: string;
  identity_kind: "phone" | "lid";
  phone_number: string | null;
  lid: string | null;
  display_name: string | null;
  direction: "inbound" | "outbound";
  type: "text" | "image" | "audio" | "video" | "document" | "sticker" | "location" | "contact";
  body: string | null;
  sent_at: string;
  ack: number | null;
}

export interface HistoryStatus {
  available: boolean;
  reason: "ready" | "disconnected" | "storage_disabled" | "unsupported";
}

export interface ChannelHistoryOps {
  status(input: { organizationId: string; sessionRef: string }): Promise<HistoryStatus>;
  page(input: {
    organizationId: string;
    sessionRef: string;
    offset: number;
    limit: number;
    since: number;
    until: number;
  }): Promise<{ messages: HistoricalMessage[]; scanned: number }>;
}
