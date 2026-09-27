import { createAdminClient } from "@/lib/supabase/admin";

export interface PublicCaptureSource {
  organization_id: string;
  is_active: boolean;
  capture_mode: "crm" | "html";
  capture_html: string | null;
}

export async function sourceForToken(token: string): Promise<PublicCaptureSource | null> {
  if (!token || token.length < 8) return null;
  const { data } = await createAdminClient()
    .from("webhook_sources")
    .select("organization_id, is_active, capture_mode, capture_html")
    .eq("path_token", token)
    .maybeSingle();
  return data as PublicCaptureSource | null;
}
