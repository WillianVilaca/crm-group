import { describe, expect, it } from "vitest";

import { prepararHtmlDeCaptura, validarHtmlDeCaptura } from "@/lib/webhooks/captura";

describe("página HTML de captação", () => {
  it("aceita um formulário simples e rejeita scripts", () => {
    expect(validarHtmlDeCaptura('<form><input name="nome" /></form>')).toBeNull();
    expect(validarHtmlDeCaptura("<form><script>alert(1)</script></form>")).toContain("scripts");
  });

  it("exige formulário para que a página possa virar fonte", () => {
    expect(validarHtmlDeCaptura("<main>Landing</main>")).toContain("formulário");
  });

  it("liga o primeiro formulário ao webhook quando o template não usa placeholder", () => {
    const html = prepararHtmlDeCaptura(
      '<form action="https://outro.site" method="GET"><input name="nome" /></form>',
      "/api/v1/webhooks/in/token123",
      "GroupCRM",
    );

    expect(html).toContain('action="/api/v1/webhooks/in/token123"');
    expect(html).toContain('method="POST"');
    expect(html).not.toContain("https://outro.site");
  });

  it("substitui os placeholders documentados e escapa atributos", () => {
    const html = prepararHtmlDeCaptura(
      '<form action="{{CAPTURE_URL}}"><h1>{{BRAND_NAME}}</h1></form>',
      '/api/v1/webhooks/in/a?x="b"',
      'A&B "Seguros"',
    );

    expect(html).toContain("/api/v1/webhooks/in/a?x=&quot;b&quot;");
    expect(html).toContain("A&amp;B &quot;Seguros&quot;");
  });
});
