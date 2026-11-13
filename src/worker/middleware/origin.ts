import { createMiddleware } from "hono/factory";
import type { AppEnvironment } from "../types";
import { HttpError } from "../http/errors";

export function requireSameOrigin(request: Request): void {
  if (request.headers.get("Origin") !== new URL(request.url).origin) {
    throw new HttpError(403, "Invalid request origin.");
  }
}

export const protectWrites = createMiddleware<AppEnvironment>(
  async (context, next) => {
    if (!["GET", "HEAD"].includes(context.req.method)) {
      requireSameOrigin(context.req.raw);
    }
    await next();
  },
);
