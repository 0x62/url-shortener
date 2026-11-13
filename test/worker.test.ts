import { vi, describe, it, expect } from "vitest";
vi.mock("../src/worker/store", () => ({ LinkStore: class {} }));
import worker from "../src/worker/index";
const link = {
  slug: "cv",
  destination: "https://example.com/cv",
  title: "CV",
  createdAt: 0,
};
function setup() {
  const records: unknown[] = [];
  const enrichments: unknown[] = [];
  const store = {
    get: async () => link,
    record: async (x: unknown) => records.push(x),
    enrich: async (...x: unknown[]) => enrichments.push(x),
    list: async () => [link],
    create: async () => true,
    stats: async () => ({ total: 1 }),
  };
  const env = {
    STORE: { idFromName: () => "", get: () => store },
    ASSETS: { fetch: async () => new Response("asset") },
    PUBLIC_ORIGIN: "https://l.bl.je",
    ACCESS_TEAM_DOMAIN: "",
    ACCESS_AUD: "",
    DEV_AUTH_BYPASS: "true",
    ANALYTICS_SECRET: "test-secret-with-at-least-thirty-two-characters",
  };
  const fetch = (req: Request) =>
    worker.fetch(req, env as never, {} as ExecutionContext);
  return { fetch, records, enrichments };
}
describe("Worker security and redirect", () => {
  it("rejects production missing or forged Access including assets", async () => {
    const { fetch } = setup();
    for (const path of ["/admin", "/admin/assets/a.js", "/api/links"]) {
      const r = await fetch(
        new Request("https://l.bl.je" + path, {
          headers: { "Cf-Access-Jwt-Assertion": "forged" },
        }),
      );
      expect(r.status).toBe(401);
    }
  });
  it("rejects cross-origin admin writes", async () => {
    const { fetch } = setup();
    const r = await fetch(
      new Request("http://localhost/api/links", {
        method: "POST",
        headers: {
          Origin: "https://evil.test",
          "Content-Type": "application/json",
        },
        body: "{}",
      }),
    );
    expect(r.status).toBe(403);
  });
  it("records a path campaign once, enriches without adding hits, rejects tampering", async () => {
    const { fetch, records, enrichments } = setup();
    const r = await fetch(
      new Request("http://localhost/cv/campaign1?campaign=ignored&ref=email", {
        headers: { "User-Agent": "Chrome/123 Windows" },
      }),
    );
    expect(r.status).toBe(200);
    const html = await r.text();
    expect(records).toHaveLength(1);
    expect(records[0]).toMatchObject({
      campaign: "campaign1",
      referrer: "ref: email",
    });
    const token = JSON.parse(html.match(/\.\.\.(\{"id".*?\}),w:screen/)![1]);
    const post = (body: unknown) =>
      fetch(
        new Request("http://localhost/_collect", {
          method: "POST",
          headers: { Origin: "http://localhost" },
          body: JSON.stringify(body),
        }),
      );
    expect((await post({ ...token, w: 1920, h: 1080 })).status).toBe(204);
    expect(enrichments).toHaveLength(1);
    expect(records).toHaveLength(1);
    expect((await post({ ...token, sig: "x", w: 1, h: 1 })).status).toBe(403);
    expect((await post({ ...token, expires: 0, w: 1, h: 1 })).status).toBe(403);
    expect((await post(null)).status).toBe(403);
  });
  it("does not count HEAD requests or recognized bots", async () => {
    const { fetch, records } = setup();
    expect(
      (await fetch(new Request("http://localhost/cv", { method: "HEAD" })))
        .status,
    ).toBe(302);
    expect(
      (
        await fetch(
          new Request("http://localhost/cv", {
            headers: { "User-Agent": "Slackbot" },
          }),
        )
      ).status,
    ).toBe(302);
    expect(records).toHaveLength(0);
  });
  it("bounds collector body and rejects malformed bodies", async () => {
    const { fetch } = setup();
    expect(
      (
        await fetch(
          new Request("http://localhost/_collect", {
            method: "POST",
            headers: { Origin: "http://localhost" },
            body: "x".repeat(513),
          }),
        )
      ).status,
    ).toBe(413);
    expect(
      (
        await fetch(
          new Request("http://localhost/_collect", {
            method: "POST",
            headers: { Origin: "http://localhost" },
            body: "{",
          }),
        )
      ).status,
    ).toBe(400);
  });
});
