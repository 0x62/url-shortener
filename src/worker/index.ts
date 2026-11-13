import { createRemoteJWKSet, jwtVerify } from "jose";
import {
  agentInfo,
  destination,
  escapeHtml,
  randomSlug,
  referrer,
  validSlug,
} from "./core";
import { LinkStore, type Hit } from "./store";
export { LinkStore };
interface Env {
  STORE: DurableObjectNamespace<LinkStore>;
  ASSETS: Fetcher;
  PUBLIC_ORIGIN: string;
  ACCESS_TEAM_DOMAIN: string;
  ACCESS_AUD: string;
  ANALYTICS_SECRET?: string;
  DEV_AUTH_BYPASS?: string;
  RETENTION_DAYS?: string;
}
const json = (data: unknown, status = 200) =>
  Response.json(data, {
    status,
    headers: {
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
async function readBody(req: Request, limit: number) {
  const reader = req.body?.getReader();
  if (!reader) return "";
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > limit) {
      await reader.cancel();
      throw new Error("Request too large.");
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const c of chunks) {
    bytes.set(c, offset);
    offset += c.byteLength;
  }
  return new TextDecoder().decode(bytes);
}
const keys = new Map<string, ReturnType<typeof createRemoteJWKSet>>();
async function authorized(req: Request, env: Env) {
  const host = new URL(req.url).hostname;
  if (
    env.DEV_AUTH_BYPASS === "true" &&
    ["localhost", "127.0.0.1", "[::1]"].includes(host)
  )
    return true;
  if (
    !/^[a-z0-9-]+\.cloudflareaccess\.com$/.test(env.ACCESS_TEAM_DOMAIN) ||
    !env.ACCESS_AUD
  )
    return false;
  const token = req.headers.get("Cf-Access-Jwt-Assertion");
  if (!token) return false;
  try {
    const issuer = `https://${env.ACCESS_TEAM_DOMAIN}`;
    let jwks = keys.get(issuer);
    if (!jwks) {
      jwks = createRemoteJWKSet(new URL(`${issuer}/cdn-cgi/access/certs`));
      keys.set(issuer, jwks);
    }
    await jwtVerify(token, jwks, {
      issuer,
      audience: env.ACCESS_AUD,
      algorithms: ["RS256"],
    });
    return true;
  } catch {
    return false;
  }
}
async function signature(secret: string, message: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return Array.from(
    new Uint8Array(
      await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(message)),
    ),
    (x) => x.toString(16).padStart(2, "0"),
  ).join("");
}
async function validToken(secret: string, message: string, sig: string) {
  const expected = await signature(secret, message);
  if (sig.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < sig.length; i++)
    diff |= sig.charCodeAt(i) ^ expected.charCodeAt(i);
  return diff === 0;
}
export default {
  async fetch(
    req: Request,
    env: Env,
    ctx: ExecutionContext,
  ): Promise<Response> {
    const url = new URL(req.url);
    const store = env.STORE.get(env.STORE.idFromName("links-v1"));
    try {
      if (
        url.pathname === "/admin" ||
        url.pathname.startsWith("/admin/") ||
        url.pathname === "/api" ||
        url.pathname.startsWith("/api/")
      ) {
        if (!(await authorized(req, env)))
          return json(
            { error: "Cloudflare Access authentication required." },
            401,
          );
        if (url.pathname.startsWith("/api/")) {
          if (req.method !== "GET" && req.headers.get("Origin") !== url.origin)
            return json({ error: "Invalid request origin." }, 403);
          if (url.pathname === "/api/links" && req.method === "GET")
            return json({ links: await store.list() });
          if (url.pathname === "/api/stats" && req.method === "GET")
            return json(await store.stats(url.search));
          if (url.pathname === "/api/links" && req.method === "POST") {
            if (
              !req.headers.get("Content-Type")?.startsWith("application/json")
            )
              return json({ error: "JSON body required." }, 415);
            const raw = await readBody(req, 8192);
            const body = JSON.parse(raw) as Record<string, unknown>;
            if (!body || typeof body !== "object" || Array.isArray(body))
              return json({ error: "Invalid request." }, 400);
            const target = destination(body.destination, env.PUBLIC_ORIGIN);
            const title =
              typeof body.title === "string"
                ? body.title.trim().slice(0, 120)
                : "";
            const custom =
              typeof body.slug === "string" && body.slug.trim() !== "";
            const slug = custom ? (body.slug as string).trim() : randomSlug();
            if (!validSlug(slug))
              return json(
                {
                  error:
                    "Use 1–64 letters, numbers, underscores or hyphens; reserved routes cannot be used.",
                },
                400,
              );
            for (let i = 0; i < 5; i++) {
              const candidate = i === 0 ? slug : randomSlug();
              const link = {
                slug: candidate,
                destination: target,
                title,
                createdAt: Date.now(),
              };
              if (await store.create(link)) return json({ link }, 201);
              if (custom)
                return json({ error: "That short link already exists." }, 409);
            }
            return json(
              { error: "Could not allocate a short link. Try again." },
              503,
            );
          }
          return json({ error: "Not found." }, 404);
        }
        if (!["GET", "HEAD"].includes(req.method))
          return new Response(null, { status: 405 });
        const path = url.pathname.startsWith("/admin/assets/")
          ? url.pathname.replace("/admin", "")
          : "/index.html";
        const asset = await env.ASSETS.fetch(
          new Request(new URL(path, url.origin), req),
        );
        const headers = new Headers(asset.headers);
        headers.set("Cache-Control", "no-store");
        headers.set("X-Content-Type-Options", "nosniff");
        headers.set("Referrer-Policy", "same-origin");
        headers.set(
          "Content-Security-Policy",
          "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'",
        );
        return new Response(asset.body, { status: asset.status, headers });
      }
      if (url.pathname === "/_collect") {
        if (req.method !== "POST") return new Response(null, { status: 405 });
        if (req.headers.get("Origin") !== url.origin)
          return new Response(null, { status: 403 });
        const raw = await readBody(req, 512);
        const b = JSON.parse(raw) as {
          id: string;
          expires: number;
          sig: string;
          w: number;
          h: number;
        };
        if (
          !b ||
          typeof b !== "object" ||
          !env.ANALYTICS_SECRET ||
          !/^\w{8}-[\w-]{27}$/.test(b.id) ||
          !Number.isInteger(b.expires) ||
          b.expires < Date.now() ||
          b.expires > Date.now() + 300000 ||
          typeof b.sig !== "string" ||
          !(await validToken(
            env.ANALYTICS_SECRET,
            `${b.id}.${b.expires}`,
            b.sig,
          ))
        )
          return new Response(null, { status: 403 });
        if (
          !Number.isInteger(b.w) ||
          !Number.isInteger(b.h) ||
          b.w < 1 ||
          b.h < 1 ||
          b.w > 20000 ||
          b.h > 20000
        )
          return new Response(null, { status: 400 });
        await store.enrich(b.id, `${b.w}×${b.h}`);
        return new Response(null, {
          status: 204,
          headers: { "Cache-Control": "no-store" },
        });
      }
      if (url.pathname === "/robots.txt")
        return new Response("User-agent: *\nDisallow: /\n");
      if (!["GET", "HEAD"].includes(req.method))
        return new Response("Method not allowed", { status: 405 });
      const parts = url.pathname.split("/").filter(Boolean);
      if (parts.length < 1 || parts.length > 2 || url.pathname.endsWith("/"))
        return new Response("Link not found", { status: 404 });
      const slug = decodeURIComponent(parts[0]);
      const campaign = parts[1] ? decodeURIComponent(parts[1]) : "";
      if (
        !validSlug(slug) ||
        (campaign && !/^[A-Za-z0-9_-]{1,128}$/.test(campaign))
      )
        return new Response("Link not found", { status: 404 });
      const link = await store.get(slug);
      if (!link) return new Response("Link not found", { status: 404 });
      if (req.method === "HEAD")
        return new Response(null, {
          status: 302,
          headers: { Location: link.destination, "Cache-Control": "no-store" },
        });
      const ua = agentInfo(req.headers.get("User-Agent") || "");
      const preview =
        req.headers.get("Purpose") === "prefetch" ||
        req.headers.get("Sec-Purpose")?.includes("prefetch");
      if (ua.bot || preview)
        return new Response(null, {
          status: 302,
          headers: { Location: link.destination, "Cache-Control": "no-store" },
        });
      const cf = req.cf;
      const hit: Hit = {
        id: crypto.randomUUID(),
        slug,
        time: Date.now(),
        campaign,
        country: typeof cf?.country === "string" ? cf.country : "",
        city: typeof cf?.city === "string" ? cf.city : "",
        browser: ua.browser,
        os: ua.os,
        screen: "",
        referrer: referrer(url, req.headers.get("Referer")),
      };
      // Persist once before enrichment; beacon never creates hits or campaigns.
      try {
        await store.record(
          hit,
          Math.max(1, Math.min(365, Number(env.RETENTION_DAYS) || 365)),
        );
      } catch {
        console.error("Analytics write failed");
        return new Response(null, {
          status: 302,
          headers: { Location: link.destination, "Cache-Control": "no-store" },
        });
      }
      if (!env.ANALYTICS_SECRET || env.ANALYTICS_SECRET.length < 32)
        return new Response(null, {
          status: 302,
          headers: { Location: link.destination, "Cache-Control": "no-store" },
        });
      const expires = Date.now() + 300000;
      const token = {
        id: hit.id,
        expires,
        sig: await signature(env.ANALYTICS_SECRET, `${hit.id}.${expires}`),
      };
      const nonce = crypto.randomUUID();
      const target = JSON.stringify(link.destination).replace(/</g, "\\u003c");
      const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><meta http-equiv="refresh" content="1;url=${escapeHtml(link.destination)}"><title>Redirecting…</title></head><body><p>Redirecting to <a rel="noreferrer" href="${escapeHtml(link.destination)}">your destination</a>…</p><script nonce="${nonce}">try{navigator.sendBeacon('/_collect',JSON.stringify({...${JSON.stringify(token)},w:screen.width,h:screen.height}));}catch(e){}location.replace(${target});</script></body></html>`;
      return new Response(html, {
        headers: {
          "Content-Type": "text/html;charset=utf-8",
          "Cache-Control": "no-store",
          "Referrer-Policy": "no-referrer",
          "X-Robots-Tag": "noindex, nofollow",
          "X-Content-Type-Options": "nosniff",
          "Content-Security-Policy": `default-src 'none'; script-src 'nonce-${nonce}'; connect-src 'self'; base-uri 'none'; frame-ancestors 'none'`,
        },
      });
    } catch (error) {
      if (error instanceof Error && error.message === "Request too large.")
        return json({ error: error.message }, 413);
      if (error instanceof SyntaxError || error instanceof URIError)
        return json({ error: "Invalid request." }, 400);
      if (
        error instanceof Error &&
        /URL|destination|date|range|HTTP/.test(error.message)
      )
        return json({ error: error.message }, 400);
      console.error("Request failed");
      return json({ error: "Request failed. Please try again." }, 500);
    }
  },
} satisfies ExportedHandler<Env>;
