import * as Sentry from "@sentry/nextjs";

/**
 * EasyPanel's current WAHA image listens on port 80 inside the service
 * network, while older CRM templates still provide the legacy :3000 value.
 * Normalize only that exact production default so custom/local transports are
 * left untouched and every server route (including direct QR proxies) agrees.
 */
function normalizeWahaUrlForProduction() {
  if (
    process.env.NODE_ENV === "production" &&
    process.env.WAHA_API_BASE_URL === "http://waha:3000"
  ) {
    process.env.WAHA_API_BASE_URL = "http://waha:80";
  }
}

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    normalizeWahaUrlForProduction();
    await import("./sentry.server.config");
  }

  if (process.env.NEXT_RUNTIME === "edge") {
    await import("./sentry.edge.config");
  }
}

export const onRequestError = Sentry.captureRequestError;
