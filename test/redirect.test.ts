import { describe, expect, it } from "vitest";
import {
  collectorRequest,
  createWorkerHarness,
  localRequest,
  readEnrichmentToken,
  TEST_LINK,
} from "./helpers/worker";

describe("public redirects", () => {
  it("records the second path segment as campaign and ref query as attribution", async () => {
    const { fetch, records } = createWorkerHarness();
    const response = await fetch(
      localRequest("/cv/campaign1?campaign=ignored&ref=email", {
        headers: { "User-Agent": "Chrome/123 Windows" },
      }),
    );
    expect(response.status).toBe(200);
    expect(records).toHaveLength(1);
    expect(records[0]).toMatchObject({
      slug: "cv",
      campaign: "campaign1",
      referrer: "ref: email",
    });
    expect(await response.text()).toContain(TEST_LINK.destination);
  });

  it("never interprets a campaign query parameter as a campaign", async () => {
    const { fetch, records } = createWorkerHarness();
    await fetch(localRequest("/cv?campaign=ignored"));
    expect(records[0].campaign).toBe("");
  });

  it("enriches an existing visit without creating additional hits", async () => {
    const { fetch, records, enrichments } = createWorkerHarness();
    const response = await fetch(localRequest("/cv/campaign1"));
    const token = readEnrichmentToken(await response.text());
    expect(
      (await fetch(collectorRequest({ ...token, w: 1920, h: 1080 }))).status,
    ).toBe(204);
    expect(records).toHaveLength(1);
    expect(enrichments).toEqual([{ id: token.id, screen: "1920×1080" }]);
    expect(
      (await fetch(collectorRequest({ ...token, w: 800, h: 600 }))).status,
    ).toBe(204);
    expect(records).toHaveLength(1);
    expect(enrichments).toHaveLength(1);
  });

  it.each([
    { method: "HEAD" },
    { headers: new Headers({ "User-Agent": "Slackbot" }) },
    { headers: new Headers({ Purpose: "prefetch" }) },
  ])(
    "does not record HEAD, known bot or prefetch requests: %j",
    async (init) => {
      const { fetch, records } = createWorkerHarness();
      const response = await fetch(localRequest("/cv", init));
      expect(response.status).toBe(302);
      expect(response.headers.get("Location")).toBe(TEST_LINK.destination);
      expect(records).toHaveLength(0);
    },
  );

  it("still redirects if analytics storage fails", async () => {
    const { fetch, store } = createWorkerHarness();
    store.record.mockRejectedValueOnce(new Error("Storage unavailable"));
    const response = await fetch(localRequest("/cv"));
    expect(response.status).toBe(302);
    expect(response.headers.get("Location")).toBe(TEST_LINK.destination);
  });

  it.each([
    "/cv/",
    "/cv/a/b",
    "/cv//campaign",
    "/cv/%2F",
    "/ADMIN/campaign",
    "/api-ish/invalid!",
    "/",
  ])("rejects invalid or reserved short-link routes: %s", async (path) => {
    const { fetch, records } = createWorkerHarness();
    expect((await fetch(localRequest(path))).status).toBe(404);
    expect(records).toHaveLength(0);
  });

  it("rejects malformed URL encoding without recording a hit", async () => {
    const { fetch, records } = createWorkerHarness();
    // Hono keeps undecodable parameter text; slug validation rejects it.
    expect((await fetch(localRequest("/cv/%E0%A4%A"))).status).toBe(404);
    expect(records).toHaveLength(0);
  });
});
