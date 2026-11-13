import { Hono } from "hono";
import type { AppEnvironment } from "../types";
import { readBody } from "../http/body";
import { requireSameOrigin } from "../middleware/origin";
import { getStore } from "../services/store";
import {
  isValidEnrichmentToken,
  hasValidScreenSize,
  type EnrichmentPayload,
} from "../analytics/enrichment";

export const collectRoutes = new Hono<AppEnvironment>();
collectRoutes.post("/", async (context) => {
  requireSameOrigin(context.req.raw);
  const body: unknown = JSON.parse(await readBody(context.req.raw, 512));
  if (!(await isValidEnrichmentToken(body, context.env.ANALYTICS_SECRET))) {
    return new Response(null, { status: 403 });
  }
  const payload = body as EnrichmentPayload;
  if (!hasValidScreenSize(payload)) {
    return new Response(null, { status: 400 });
  }
  await getStore(context.env).enrich(payload.id, `${payload.w}×${payload.h}`);
  return new Response(null, {
    status: 204,
    headers: { "Cache-Control": "no-store" },
  });
});
collectRoutes.all("*", () => new Response(null, { status: 405 }));
