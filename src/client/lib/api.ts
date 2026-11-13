import type { AnalyticsQuery, CreateLinkInput, ShortLink } from "../types";

/** Only expose known Error messages, not arbitrary values thrown by a dependency. */
export function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

async function readApiError(response: Response): Promise<string> {
  const fallback = `The request failed (${response.status}). Please try again.`;
  try {
    const body: unknown = await response.json();
    if (typeof body === "object" && body !== null && "error" in body) {
      if (typeof body.error === "string" && body.error.length > 0) {
        return body.error;
      }
    }
  } catch {
    // A proxy error or expired login can return HTML instead of JSON.
  }
  return fallback;
}

export async function requestJson<T>(
  path: string,
  options?: RequestInit,
): Promise<T> {
  const response = await fetch(path, {
    credentials: "same-origin",
    ...options,
  });
  if (response.status === 401 || response.status === 403) {
    throw new Error(
      "Your admin session has expired or access was denied. Reload to sign in again.",
    );
  }
  if (!response.ok) {
    throw new Error(await readApiError(response));
  }
  if (!response.headers.get("content-type")?.includes("application/json")) {
    throw new Error(
      "Please reload this page to sign in through Cloudflare Access.",
    );
  }
  return response.json();
}

export function statsEndpoint(query: AnalyticsQuery): string {
  const parameters = new URLSearchParams({ from: query.from, to: query.to });
  if (query.slug) {
    parameters.set("slug", query.slug);
  }
  for (const [dimension, value] of Object.entries(query.filters)) {
    if (value) {
      parameters.set(dimension, value);
    }
  }
  return `/api/stats?${parameters}`;
}

export async function createLink(input: CreateLinkInput): Promise<ShortLink> {
  const result = await requestJson<ShortLink | { link: ShortLink }>(
    "/api/links",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    },
  );
  return "link" in result ? result.link : result;
}
