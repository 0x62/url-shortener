import { describe, expect, it } from "vitest";
import {
  createWorkerHarness,
  jsonPost,
  localRequest,
  PUBLIC_ORIGIN,
} from "./helpers/worker";

describe("admin authentication", () => {
  it.each([
    "/admin",
    "/admin/",
    "/admin/assets/app.js",
    "/%61dmin/campaign",
    "/%61pi/links",
    "/api",
    "/api/links",
    "/api/stats",
  ])("fails closed for missing or forged Access tokens on %s", async (path) => {
    const { fetch, store, env } = createWorkerHarness();
    for (const headers of [
      new Headers(),
      new Headers({ "Cf-Access-Jwt-Assertion": "forged" }),
    ]) {
      const response = await fetch(
        new Request(PUBLIC_ORIGIN + path, { headers }),
      );
      expect(response.status).toBe(401);
    }
    expect(store.list).not.toHaveBeenCalled();
    expect(env.ASSETS.fetch).not.toHaveBeenCalled();
  });

  it("permits an explicitly enabled local development session", async () => {
    const { fetch, store } = createWorkerHarness();
    const response = await fetch(localRequest("/api/links"));
    expect(response.status).toBe(200);
    expect(store.list).toHaveBeenCalledOnce();
  });

  it("requires authentication locally when the bypass is disabled", async () => {
    const { fetch, env } = createWorkerHarness();
    env.DEV_AUTH_BYPASS = "false";
    expect((await fetch(localRequest("/api/links"))).status).toBe(401);
  });

  it("rejects cross-origin writes before touching the store", async () => {
    const { fetch, store } = createWorkerHarness();
    const response = await fetch(
      jsonPost(
        "/api/links",
        { destination: "https://example.com" },
        "https://evil.test",
      ),
    );
    expect(response.status).toBe(403);
    expect(store.create).not.toHaveBeenCalled();
  });
});
