import { createMiddleware } from "hono/factory";
import type { AppEnvironment } from "../types";
import { authorized } from "../services/access";
import { HttpError } from "../http/errors";

export const requireAccess = createMiddleware<AppEnvironment>(
  async (context, next) => {
    if (!(await authorized(context.req.raw, context.env))) {
      throw new HttpError(401, "Cloudflare Access authentication required.");
    }
    await next();
  },
);
