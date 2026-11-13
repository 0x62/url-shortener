// Run against a local Wrangler server only: node test/smoke.mjs
import assert from "node:assert/strict";
const origin = process.env.TEST_ORIGIN || "http://127.0.0.1:8787";
if (!["127.0.0.1", "localhost"].includes(new URL(origin).hostname))
  throw new Error("Local server only");
const slug = "smoke" + Date.now();
const post = (path, body) =>
  fetch(origin + path, {
    method: "POST",
    headers: { Origin: origin, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
const body = {
  slug,
  destination: "https://example.com/cv",
  title: "Smoke test",
};
const results = await Promise.all(
  Array.from({ length: 4 }, () => post("/api/links", body)),
);
assert.deepEqual(results.map((r) => r.status).sort(), [201, 409, 409, 409]);
const html = await (
  await fetch(`${origin}/${slug}/candidate?ref=email&campaign=ignored`)
).text();
const token = JSON.parse(html.match(/const token = (\{.*?\});/)[1]);
assert.equal(
  (await post("/_collect", { ...token, w: 1920, h: 1080 })).status,
  204,
);
assert.equal(
  (await post("/_collect", { ...token, w: 1280, h: 720 })).status,
  204,
);
const stats = await (
  await fetch(`${origin}/api/stats?slug=${slug}&campaign=candidate`)
).json();
assert.equal(stats.total, 1);
assert.equal(stats.dimensions.screen[0].value, "1920×1080");
assert.equal(stats.dimensions.referrer[0].value, "ref: email");
assert.equal(
  (
    await (
      await fetch(`${origin}/api/stats?slug=${slug}&campaign=ignored`)
    ).json()
  ).total,
  0,
);
assert.equal((await fetch(`${origin}/api/stats?from=2026-99-99`)).status, 400);
assert.equal((await fetch(`${origin}/admin`)).status, 200);
console.log(
  "Smoke passed: atomic creation, campaign/ref attribution, one-time enrichment, filters, invalid dates, admin assets.",
);
