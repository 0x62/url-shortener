import { Hono } from "hono";
import type { AppEnvironment } from "../types";
import type { Hit } from "../store";
import { isValidSlug } from "../links/validation";
import { inferAgent, referrer } from "../analytics/attribution";
import { createEnrichmentToken } from "../analytics/enrichment";
import { getStore } from "../services/store";
import { redirect } from "../http/responses";
import { measuredRedirect } from "../views/redirect";

export const redirectRoutes = new Hono<AppEnvironment>();

redirectRoutes.on(
  ["GET", "HEAD"],
  ["/:slug", "/:slug/:campaign"],
  async (context) => {
    const request = context.req.raw;
    const url = new URL(request.url);
    const slug = context.req.param("slug");
    const campaign = context.req.param("campaign") || "";
    if (
      !isValidSlug(slug) ||
      (campaign && !/^[A-Za-z0-9_-]{1,128}$/.test(campaign))
    ) {
      return context.text("Link not found", 404);
    }

    const store = getStore(context.env);
    const link = await store.get(slug);
    if (!link) return context.text("Link not found", 404);

    const agent = inferAgent(request.headers.get("User-Agent") || "");
    const isPrefetch =
      request.headers.get("Purpose") === "prefetch" ||
      request.headers.get("Sec-Purpose")?.includes("prefetch");
    if (request.method === "HEAD" || agent.bot || isPrefetch) {
      return redirect(link.destination);
    }

    const hit: Hit = {
      id: crypto.randomUUID(),
      slug,
      time: Date.now(),
      campaign,
      country:
        typeof request.cf?.country === "string" ? request.cf.country : "",
      city: typeof request.cf?.city === "string" ? request.cf.city : "",
      browser: agent.browser,
      os: agent.os,
      screen: "",
      referrer: referrer(url, request.headers.get("Referer")),
    };
    const retentionDays = Math.max(
      1,
      Math.min(365, Number(context.env.RETENTION_DAYS) || 365),
    );
    try {
      // Persist first: the enrichment endpoint may only update this existing hit.
      await store.record(hit, retentionDays);
    } catch {
      console.error("Analytics write failed");
      return redirect(link.destination);
    }

    const secret = context.env.ANALYTICS_SECRET;
    if (!secret || secret.length < 32) return redirect(link.destination);
    const token = await createEnrichmentToken(secret, hit.id);
    return measuredRedirect(link.destination, token);
  },
);
