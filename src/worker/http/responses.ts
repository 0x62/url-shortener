import type { ContentfulStatusCode } from "hono/utils/http-status";

export function json(
  data: unknown,
  status: ContentfulStatusCode = 200,
): Response {
  return Response.json(data, {
    status,
    headers: {
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

export function redirect(destination: string): Response {
  return new Response(null, {
    status: 302,
    headers: { Location: destination, "Cache-Control": "no-store" },
  });
}
