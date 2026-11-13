import { describe, expect, it } from "vitest";
import {
  collectorRequest,
  createWorkerHarness,
  localRequest,
  readEnrichmentToken,
} from "./helpers/worker";

describe("analytics enrichment security", () => {
  it("rejects tampered and expired signatures", async () => {
    const { fetch, enrichments } = createWorkerHarness();
    const response = await fetch(localRequest("/cv"));
    const token = readEnrichmentToken(await response.text());
    for (const changed of [
      { sig: "x" },
      { expires: 0 },
      { id: crypto.randomUUID() },
    ]) {
      expect(
        (await fetch(collectorRequest({ ...token, ...changed, w: 1, h: 1 })))
          .status,
      ).toBe(403);
    }
    expect(enrichments).toHaveLength(0);
  });

  it("rejects an enrichment request from a different origin", async () => {
    const { fetch, store } = createWorkerHarness();
    const response = await fetch(
      localRequest("/_collect", {
        method: "POST",
        headers: { Origin: "https://evil.test" },
        body: "{}",
      }),
    );
    expect(response.status).toBe(403);
    expect(store.enrich).not.toHaveBeenCalled();
  });

  it.each([null, [], {}, { id: "bad" }])(
    "rejects malformed token payloads: %j",
    async (payload) => {
      const { fetch } = createWorkerHarness();
      expect((await fetch(collectorRequest(payload))).status).toBe(403);
    },
  );

  it.each([
    { w: 0, h: 1080 },
    { w: 20001, h: 1080 },
    { w: 100.5, h: 100 },
    { w: "1920", h: 1080 },
  ])("rejects invalid screen dimensions: %j", async (screen) => {
    const { fetch } = createWorkerHarness();
    const token = readEnrichmentToken(
      await (await fetch(localRequest("/cv"))).text(),
    );
    expect(
      (await fetch(collectorRequest({ ...token, ...screen }))).status,
    ).toBe(400);
  });

  it.each([
    { body: "x".repeat(513), status: 413 },
    { body: "{", status: 400 },
  ])(
    "bounds and validates request bodies: $status",
    async ({ body, status }) => {
      const { fetch } = createWorkerHarness();
      const response = await fetch(
        localRequest("/_collect", {
          method: "POST",
          headers: { Origin: "http://localhost" },
          body,
        }),
      );
      expect(response.status).toBe(status);
    },
  );
});
