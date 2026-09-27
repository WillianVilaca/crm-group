/**
 * Regras compartilhadas da página pública de captação.
 *
 * O HTML personalizado é conteúdo fornecido por um administrador da empresa,
 * mas ainda assim não deve ganhar acesso ao documento do CRM. A página o
 * renderiza em iframe sandboxed; aqui ficam os limites que mantêm esse
 * contrato explícito na entrada da API.
 */

export const MODOS_DE_CAPTURA = ["crm", "html"] as const;
export type ModoDeCaptura = (typeof MODOS_DE_CAPTURA)[number];

export const LIMITE_HTML_DE_CAPTURA = 200_000;

export function validarHtmlDeCaptura(html: string | null | undefined): string | null {
  if (!html || !html.trim()) return "Cole ou envie um arquivo HTML para esta fonte.";
  if (html.length > LIMITE_HTML_DE_CAPTURA) {
    return "O HTML da página deve ter no máximo 200 KB.";
  }
  if (!/<form\b/i.test(html)) {
    return "O HTML precisa conter pelo menos um formulário (<form>).";
  }
  if (/<script\b|javascript:|\son[a-z]+\s*=/i.test(html)) {
    return "Por segurança, o HTML não pode conter scripts ou eventos inline.";
  }
  if (/<iframe\b|<object\b|<embed\b/i.test(html)) {
    return "Por segurança, o HTML não pode incorporar frames ou objetos externos.";
  }
  return null;
}

function escapeHtmlAttribute(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

/**
 * Prepara o HTML para uma fonte específica.
 *
 * `{{CAPTURE_URL}}` e `{{BRAND_NAME}}` são os placeholders documentados para
 * quem entrega um template. Como fallback, o primeiro form recebe o endpoint
 * mesmo se o template não tiver usado o placeholder.
 */
export function prepararHtmlDeCaptura(html: string, endpoint: string, brandName: string): string {
  const endpointSeguro = escapeHtmlAttribute(endpoint);
  const nomeSeguro = escapeHtmlAttribute(brandName);
  let preparado = html
    .replaceAll("{{CAPTURE_URL}}", endpointSeguro)
    .replaceAll("{{BRAND_NAME}}", nomeSeguro);

  if (!/{{CAPTURE_URL}}/.test(html)) {
    preparado = preparado.replace(/<form\b([^>]*)>/i, (_match, rawAttributes: string) => {
      const attributes = rawAttributes
        .replace(/\saction\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/i, "")
        .replace(/\smethod\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/i, "");
      return `<form${attributes} action="${endpointSeguro}" method="POST">`;
    });
  }

  return preparado;
}
