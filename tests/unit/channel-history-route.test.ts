import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { GET, POST } from "@/app/api/v1/channel-sessions/[id]/history/route";

const ORG = "00000000-0000-4000-8000-000000000001";
const OTHER = "00000000-0000-4000-8000-000000000002";
const CHANNEL = "00000000-0000-4000-8000-000000000003";
const USER = "00000000-0000-4000-8000-000000000004";
const { eqs, rpc, page, status, audit, requireRole } = vi.hoisted(() => ({
  eqs: [] as Array<[string, unknown]>,
  rpc: vi.fn(), page: vi.fn(), status: vi.fn(),
  audit: vi.fn(async () => undefined), requireRole: vi.fn(),
}));

vi.mock("@/lib/auth/require-role", () => ({ requireRole }));
vi.mock("@/lib/impersonate/support", () => ({ requireSupportWrite: async () => null }));
vi.mock("@/lib/auth/server", () => ({ mfaEmDivida: async () => false }));
vi.mock("@/lib/env", () => ({ env: { INTERNAL_CRON_SECRET: "fixture-only-secret" } }));
vi.mock("@/lib/audit", () => ({ audit }));
vi.mock("@/lib/channels", () => ({
  CHANNEL_SESSION_REF_COLUMNS: "waha_session_name, provider",
  resolveSessionRef: () => "trusted-session",
  getAdapter: () => ({ history: { page, status } }),
}));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => ({
  from: () => {
    const query = {
      select: () => query,
      eq: (column: string, value: unknown) => { eqs.push([column, value]); return query; },
      maybeSingle: async () => ({ data: eqs.some(([key, value]) => key === "organization_id" && value === ORG)
        ? { id: CHANNEL, organization_id: ORG, provider: "waha", archived_at: null } : null, error: null }),
    };
    return query;
  },
  rpc,
}) }));

function request(method: "GET" | "POST", body?: object): NextRequest {
  return new NextRequest(`https://crm.example/api/v1/channel-sessions/${CHANNEL}/history`, {
    method, ...(body ? { body: JSON.stringify(body), headers: { "Content-Type": "application/json" } } : {}),
  });
}
const context = { params: Promise.resolve({ id: CHANNEL }) };

beforeEach(() => {
  eqs.length = 0;
  vi.clearAllMocks();
  requireRole.mockResolvedValue({ ok: true, org: { orgId: ORG }, user: { id: USER, idioma: "pt-BR" } });
  status.mockResolvedValue({ available: true, reason: "ready" });
  page.mockResolvedValue({ messages: [{ external_id: "fixture", sent_at: "2026-09-01T00:00:00.000Z" }], scanned: 1 });
  rpc.mockResolvedValue({ data: { imported: 1, skipped: 0 }, error: null });
});

describe("channel history route", () => {
  it("checks trusted organization before touching the provider or RPC", async () => {
    requireRole.mockResolvedValue({ ok: true, org: { orgId: OTHER }, user: { id: USER, idioma: "pt-BR" } });
    const response = await POST(request("POST", { days: 90 }), context);
    expect(response.status).toBe(404);
    expect(eqs).toContainEqual(["organization_id", OTHER]);
    expect(status).not.toHaveBeenCalled();
    expect(rpc).not.toHaveBeenCalled();
  });

  it("only exposes availability to an authenticated admin", async () => {
    const response = await GET(request("GET"), context);
    expect(response.status).toBe(200);
    expect(requireRole).toHaveBeenCalledWith("admin", expect.objectContaining({ resource: "channel_sessions" }));
    expect(await response.json()).toMatchObject({ data: { available: true, reason: "ready" } });
  });

  it("keeps an existing session untouched when its store is off", async () => {
    status.mockResolvedValue({ available: false, reason: "storage_disabled" });
    const response = await POST(request("POST", { days: 90 }), context);
    expect(response.status).toBe(409);
    expect(page).not.toHaveBeenCalled();
    expect(rpc).not.toHaveBeenCalled();
  });

  it("imports with a tenant-scoped receipt and continues from a signed cursor", async () => {
    const first = await POST(request("POST", { days: 90 }), context);
    expect(first.status).toBe(200);
    const firstBody = await first.json();
    expect(firstBody.data).toMatchObject({ imported: 1, scanned: 1, done: false });
    expect(firstBody.data.cursor).toEqual(expect.any(String));
    expect(rpc).toHaveBeenCalledWith("fn_import_channel_history", expect.objectContaining({
      p_org: ORG, p_channel: CHANNEL, p_messages: expect.arrayContaining([expect.objectContaining({ external_id: "fixture" })]),
    }));
    expect(audit).toHaveBeenCalledWith(expect.objectContaining({ action: "channel.history_imported", organizationId: ORG }));

    page.mockResolvedValue({ messages: [], scanned: 0 });
    eqs.length = 0;
    const second = await POST(request("POST", { days: 90, cursor: firstBody.data.cursor }), context);
    expect(second.status).toBe(200);
    expect(await second.json()).toMatchObject({ data: { done: true, cursor: null } });
    expect(page).toHaveBeenLastCalledWith(expect.objectContaining({ offset: 100, limit: 100 }));
  });
});
