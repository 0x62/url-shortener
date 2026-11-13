import type { ContentfulStatusCode } from "hono/utils/http-status";

/** An expected client error, safe to return without exposing implementation details. */
export class HttpError extends Error {
  constructor(
    public readonly status: ContentfulStatusCode,
    message: string,
  ) {
    super(message);
    this.name = "HttpError";
  }
}
