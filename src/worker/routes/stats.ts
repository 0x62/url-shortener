import { Hono } from "hono";
import type { AppEnvironment } from "../types";
import { getStore } from "../services/store";
import { json } from "../http/responses";
import { dateRange } from "../analytics/filters";

export const statsRoutes = new Hono<AppEnvironment>();
statsRoutes.get("/", async (context) => {
  const query = new URL(context.req.url).search;
  // Validate before the RPC boundary so expected errors preserve their HTTP status.
  dateRange(new URLSearchParams(query));
  return json(await getStore(context.env).stats(query));
});
