import { Hono } from "hono";
import type { AppEnvironment } from "../types";
import { getStore } from "../services/store";
import { json } from "../http/responses";
import { readBody } from "../http/body";
import { HttpError } from "../http/errors";
import {
  validateDestination,
  generateRandomSlug,
  isValidSlug,
} from "../links/validation";

const MAX_CREATE_BODY_BYTES = 8192;
const MAX_RANDOM_SLUG_ATTEMPTS = 5;

export const linksRoutes = new Hono<AppEnvironment>();

linksRoutes.get("/", async (context) => {
  return json({ links: await getStore(context.env).list() });
});

linksRoutes.post("/", async (context) => {
  const request = context.req.raw;
  if (!request.headers.get("Content-Type")?.startsWith("application/json")) {
    throw new HttpError(415, "JSON body required.");
  }

  const body: unknown = JSON.parse(
    await readBody(request, MAX_CREATE_BODY_BYTES),
  );
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw new HttpError(400, "Invalid request.");
  }

  const input = body as Record<string, unknown>;
  const target = validateDestination(
    input.destination,
    context.env.PUBLIC_ORIGIN,
  );
  const title =
    typeof input.title === "string" ? input.title.trim().slice(0, 120) : "";
  const customSlug = typeof input.slug === "string" ? input.slug.trim() : "";

  if (customSlug && !isValidSlug(customSlug)) {
    throw new HttpError(
      400,
      "Use 1–64 letters, numbers, underscores or hyphens; reserved routes cannot be used.",
    );
  }

  const store = getStore(context.env);
  for (let attempt = 0; attempt < MAX_RANDOM_SLUG_ATTEMPTS; attempt++) {
    const link = {
      slug: customSlug || generateRandomSlug(),
      destination: target,
      title,
      createdAt: Date.now(),
    };
    if (await store.create(link)) {
      return json({ link }, 201);
    }
    if (customSlug) {
      throw new HttpError(409, "That short link already exists.");
    }
  }
  throw new HttpError(503, "Could not allocate a short link. Try again.");
});
