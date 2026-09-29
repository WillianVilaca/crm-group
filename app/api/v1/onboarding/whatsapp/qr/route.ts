import { loadOnboardingChannel } from "@/lib/channels/onboarding-session";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { loadAuthUser, resolveActiveOrg } from "@/lib/auth/server";
import { normalizarBaseUrlWaha } from "@/lib/waha/client";

/**
 * Proxy WAHA's QR endpoint so the browser can <img src="..." /> without
 * exposing the API key.
 *
 * WAHA exposes: GET /api/{session}/auth/qr?format=image → image/png bytes.
 */
export async function GET() {
  const user = await loadAuthUser();
  if (!user) return new NextResponse(null, { status: 401 });
  const activeOrg = await resolveActiveOrg(user);
  if (!activeOrg) return new NextResponse(null, { status: 404 });

  const baseUrl = process.env.WAHA_API_BASE_URL ? normalizarBaseUrlWaha(process.env.WAHA_API_BASE_URL) : null;
  const apiKey = process.env.WAHA_API_KEY;
  if (!baseUrl || !apiKey || apiKey === "dev_plaintext_change_me") {
    return new NextResponse(null, { status: 503 });
  }

  const channel = await loadOnboardingChannel(await createClient(), activeOrg.orgId);
  if (!channel || channel.archived_at) return new NextResponse(null, { status: 404 });
  const sessionName = channel.waha_session_name;
  const upstream = await fetch(
    `${baseUrl}/api/${encodeURIComponent(sessionName)}/auth/qr?format=image`,
    { headers: { "X-Api-Key": apiKey }, cache: "no-store" },
  );
  // Depois do pareamento o WAHA deixa de expor um QR e responde 422. Isso é
  // estado normal da sessão, não erro do usuário; devolver 204 evita um falso
  // erro vermelho no console enquanto o polling troca a tela para "Conectado".
  if (upstream.status === 422) {
    return new NextResponse(null, {
      status: 204,
      headers: { "cache-control": "no-store, max-age=0", "x-waha-status": "422" },
    });
  }
  if (!upstream.ok) {
    return new NextResponse(null, {
      status: upstream.status,
      headers: { "x-waha-status": String(upstream.status) },
    });
  }

  const ct = upstream.headers.get("content-type") ?? "image/png";
  const buf = await upstream.arrayBuffer();
  return new NextResponse(buf, {
    status: 200,
    headers: {
      "content-type": ct,
      "cache-control": "no-store, max-age=0",
    },
  });
}
