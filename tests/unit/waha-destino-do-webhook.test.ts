import { afterEach, describe, expect, it, vi } from "vitest";
import {
  CONVERSAS_IGNORADAS,
  normalizarBaseUrlWaha,
  resolverBaseDoWebhook,
  WahaClient,
} from "@/lib/waha/client";

const dns = vi.hoisted(() => ({ lookup: vi.fn() }));
vi.mock("node:dns/promises", () => ({ lookup: dns.lookup }));

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("o destino do canal pertence à instalação configurada", () => {
  it("não adivinha a porta nem troca um host válido", () => {
    expect(normalizarBaseUrlWaha(" http://waha:3000/ ")).toBe("http://waha:3000");
    expect(normalizarBaseUrlWaha("http://crm-group_waha:80//")).toBe("http://crm-group_waha:80");
    expect(normalizarBaseUrlWaha("https://meu-canal.example.com")).toBe(
      "https://meu-canal.example.com",
    );
  });

  it("resolve o nome completo do Swarm sem expor o webhook à internet", async () => {
    dns.lookup.mockResolvedValue({ address: "10.11.0.29", family: 4 });
    expect(await resolverBaseDoWebhook("http://crm-group_app:3000")).toBe("http://10.11.0.29:3000");
    expect(dns.lookup).toHaveBeenCalledWith("crm-group_app", { family: 4 });
  });

  it("mantém URLs normais e recusa DNS quebrado sem cair no alias de outra instalação", async () => {
    expect(await resolverBaseDoWebhook("https://crm.example.com/")).toBe("https://crm.example.com");
    dns.lookup.mockRejectedValueOnce(new Error("ENOTFOUND"));
    await expect(resolverBaseDoWebhook("http://crm-group_app:3000")).rejects.toThrow(
      "waha_webhook_dns_unavailable",
    );
  });

  it("substitui o callback antigo e preserva integrações e configuração da sessão", async () => {
    dns.lookup.mockResolvedValue({ address: "10.11.0.29", family: 4 });
    vi.stubEnv("WAHA_WEBHOOK_BASE_URL", "http://crm-group_app:3000/");
    vi.stubEnv("WAHA_HMAC_SECRET", "segredo-de-teste-nao-real");
    const externo = { url: "https://integracao.example.com/eventos", events: ["message.any"] };
    const antiga = { url: "http://app:3000/api/v1/webhooks/waha", events: ["message.any"] };
    const config = {
      ignore: CONVERSAS_IGNORADAS,
      webhooks: [externo, antiga],
      noweb: { store: { enabled: true } },
    };
    const fetchMock = vi.fn(
      async (_url: unknown, init?: RequestInit) =>
        new Response(
          JSON.stringify(
            init?.method === "PUT"
              ? { name: "s1", status: "WORKING" }
              : { name: "s1", status: "WORKING", engine: { engine: "NOWEB" }, config },
          ),
          { status: 200, headers: { "content-type": "application/json" } },
        ),
    );
    vi.stubGlobal("fetch", fetchMock);
    await new WahaClient("http://crm-group_waha:80", "chave-de-teste").convergirConfigDaSessao(
      "s1",
    );
    const put = fetchMock.mock.calls.find(([, init]) => init?.method === "PUT");
    expect(put).toBeDefined();
    const enviado = JSON.parse(String(put?.[1]?.body));
    expect(enviado.config.noweb).toEqual(config.noweb);
    expect(enviado.config.webhooks).toHaveLength(2);
    expect(enviado.config.webhooks).toContainEqual(externo);
    expect(enviado.config.webhooks).not.toContainEqual(antiga);
    expect(enviado.config.webhooks[1]).toMatchObject({
      url: "http://10.11.0.29:3000/api/v1/webhooks/waha",
      hmac: { key: "segredo-de-teste-nao-real" },
      events: expect.arrayContaining(["message.any", "session.status", "message.ack"]),
    });
  });
});
