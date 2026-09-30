import { afterEach, describe, expect, it, vi } from "vitest";
import { WahaClient } from "@/lib/waha/client";

afterEach(() => vi.unstubAllGlobals());

describe("profile lookup distinguishes privacy from an outage", () => {
  it("returns null only for a valid no-picture response", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => Response.json({ profilePictureURL: null })));
    await expect(new WahaClient("http://w", "fixture").getProfilePictureUrl("s", "123456@lid")).resolves.toBeNull();
  });
  it("returns a valid URL", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => Response.json({ profilePictureURL: "https://cdn.whatsapp.net/photo.jpg" })));
    await expect(new WahaClient("http://w", "fixture").getProfilePictureUrl("s", "123456@lid"))
      .resolves.toBe("https://cdn.whatsapp.net/photo.jpg");
  });
  it("does not convert a server outage into a privacy result", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("unavailable", { status: 503 })));
    await expect(new WahaClient("http://w", "fixture").getProfilePictureUrl("s", "123456@lid"))
      .rejects.toThrow("waha_profile_503");
  });
  it("rejects malformed responses without exposing them", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => Response.json({ unexpected: "private detail" })));
    await expect(new WahaClient("http://w", "fixture").getProfilePictureUrl("s", "123456@lid"))
      .rejects.toThrow("waha_profile_invalid_response");
  });
});
