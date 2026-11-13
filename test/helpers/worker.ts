import { vi } from "vitest";

// Durable Objects need the Workers runtime. Unit tests exercise HTTP routing
// against an isolated store double; smoke.mjs covers real SQLite persistence.
vi.mock("../../src/worker/store", () => ({ LinkStore: class {} }));
import worker from "../../src/worker/index";

export const LOCAL_ORIGIN = "http://localhost";
export const PUBLIC_ORIGIN = "https://l.bl.je";
export const TEST_LINK = {
  slug: "cv",
  destination: "https://example.com/cv",
  title: "CV",
  createdAt: 0,
};

export interface RecordedHit {
  id: string;
  slug: string;
  campaign: string;
  referrer: string;
  screen: string;
}

export function createWorkerHarness() {
  const records: RecordedHit[] = [];
  const enrichments: { id: string; screen: string }[] = [];
  const store = {
    get: vi.fn(async () => TEST_LINK),
    record: vi.fn(async (hit: RecordedHit) => {
      records.push(hit);
    }),
    enrich: vi.fn(async (id: string, screen: string) => {
      const hit = records.find((record) => record.id === id);
      if (hit && hit.screen === "") {
        hit.screen = screen;
        enrichments.push({ id, screen });
      }
    }),
    list: vi.fn(async () => [TEST_LINK]),
    create: vi.fn(async () => true),
    stats: vi.fn(async () => ({ total: 1 })),
  };
  const env = {
    STORE: { idFromName: () => "", get: () => store },
    ASSETS: { fetch: vi.fn(async () => new Response("asset")) },
    PUBLIC_ORIGIN,
    ACCESS_TEAM_DOMAIN: "",
    ACCESS_AUD: "",
    DEV_AUTH_BYPASS: "true",
    ANALYTICS_SECRET: "test-secret-with-at-least-thirty-two-characters",
  };
  const fetch = async (request: Request): Promise<Response> =>
    await worker.fetch(request, env as never, {} as ExecutionContext);
  return { fetch, store, env, records, enrichments };
}

export function localRequest(path: string, init?: RequestInit) {
  return new Request(LOCAL_ORIGIN + path, init);
}

export function jsonPost(path: string, body: unknown, origin = LOCAL_ORIGIN) {
  return localRequest(path, {
    method: "POST",
    headers: { Origin: origin, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export function collectorRequest(body: unknown) {
  return jsonPost("/_collect", body);
}

export function readEnrichmentToken(html: string) {
  const serialized = html.match(/const token\s*=\s*(\{[^;]+\});/)?.[1];
  if (!serialized) throw new Error("Missing enrichment token in redirect HTML");
  const token = JSON.parse(serialized) as {
    id: string;
    expires: number;
    sig: string;
  };
  if (!token.id || !Number.isInteger(token.expires) || !token.sig) {
    throw new Error("Invalid enrichment token in redirect HTML");
  }
  return token;
}
