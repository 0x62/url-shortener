import { HttpError } from "../http/errors";

const RESERVED_SLUGS = new Set([
  "admin",
  "api",
  "_collect",
  "favicon.ico",
  "robots.txt",
]);
const SLUG_ALPHABET =
  "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

export function isValidSlug(value: string): boolean {
  return (
    /^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/.test(value) &&
    !RESERVED_SLUGS.has(value.toLowerCase())
  );
}

export function validateDestination(
  value: unknown,
  publicOrigin: string,
): string {
  if (typeof value !== "string" || value.length > 4096) {
    throw new HttpError(400, "Enter a valid destination URL.");
  }
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new HttpError(400, "Enter a valid destination URL.");
  }
  if (
    !["https:", "http:"].includes(url.protocol) ||
    url.username ||
    url.password
  ) {
    throw new HttpError(
      400,
      "Only HTTP(S) URLs without credentials are allowed.",
    );
  }
  if (url.origin === new URL(publicOrigin).origin) {
    throw new HttpError(
      400,
      "Destination cannot point back to this shortener.",
    );
  }
  return url.href;
}

export function generateRandomSlug(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(8));
  return Array.from(
    bytes,
    (byte) => SLUG_ALPHABET[byte % SLUG_ALPHABET.length],
  ).join("");
}
