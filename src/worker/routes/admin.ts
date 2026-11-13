import { Hono } from "hono";
import type { AppEnvironment } from "../types";

const ADMIN_CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data:",
  "connect-src 'self'",
  "frame-ancestors 'none'",
  "base-uri 'none'",
].join("; ");

export const adminRoutes = new Hono<AppEnvironment>();
adminRoutes.get("*", async (context) => {
  const url = new URL(context.req.url);
  const assetPath = url.pathname.startsWith("/admin/assets/")
    ? url.pathname.replace("/admin", "")
    : "/index.html";
  const response = await context.env.ASSETS.fetch(
    new Request(new URL(assetPath, url.origin), context.req.raw),
  );
  const headers = new Headers(response.headers);
  headers.set("Cache-Control", "no-store");
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("Referrer-Policy", "same-origin");
  headers.set("Content-Security-Policy", ADMIN_CSP);
  return new Response(response.body, { status: response.status, headers });
});
adminRoutes.all("*", () => new Response(null, { status: 405 }));
