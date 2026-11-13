export const RESERVED = new Set([
  "admin",
  "api",
  "_collect",
  "favicon.ico",
  "robots.txt",
]);
export function validSlug(value: string) {
  return (
    /^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/.test(value) &&
    !RESERVED.has(value.toLowerCase())
  );
}
export function destination(value: unknown, origin: string) {
  if (typeof value !== "string" || value.length > 4096)
    throw new Error("Enter a valid destination URL.");
  const url = new URL(value);
  if (
    !["https:", "http:"].includes(url.protocol) ||
    url.username ||
    url.password
  )
    throw new Error("Only HTTP(S) URLs without credentials are allowed.");
  if (url.origin === new URL(origin).origin)
    throw new Error("Destination cannot point back to this shortener.");
  return url.href;
}
export function randomSlug() {
  const bytes = crypto.getRandomValues(new Uint8Array(8));
  return Array.from(
    bytes,
    (x) =>
      "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"[x % 62],
  ).join("");
}
export function agentInfo(ua: string) {
  const browser = /Edg\//.test(ua)
    ? "Edge"
    : /OPR\//.test(ua)
      ? "Opera"
      : /Firefox\//.test(ua)
        ? "Firefox"
        : /Chrome\/|CriOS\//.test(ua)
          ? "Chrome"
          : /Safari\//.test(ua)
            ? "Safari"
            : "Other";
  const os = /Android/.test(ua)
    ? "Android"
    : /iPhone|iPad|iPod/.test(ua)
      ? "iOS"
      : /Windows/.test(ua)
        ? "Windows"
        : /Macintosh/.test(ua)
          ? "macOS"
          : /Linux/.test(ua)
            ? "Linux"
            : "Other";
  return {
    browser,
    os,
    bot: /bot|crawler|spider|preview|facebookexternalhit|slackbot|headless/i.test(
      ua,
    ),
  };
}
export function referrer(url: URL, header: string | null) {
  const ref = url.searchParams.get("ref");
  if (ref) return "ref: " + ref.slice(0, 120);
  try {
    return header ? new URL(header).hostname.slice(0, 253) : "";
  } catch {
    return "";
  }
}
export function escapeHtml(s: string) {
  return s.replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!,
  );
}
export const dimensions = [
  "campaign",
  "country",
  "city",
  "browser",
  "os",
  "screen",
  "referrer",
] as const;
export type Dimension = (typeof dimensions)[number];
export function dateRange(params: URLSearchParams) {
  const now = new Date();
  const to = params.get("to") || now.toISOString().slice(0, 10);
  const from =
    params.get("from") ||
    new Date(now.getTime() - 29 * 86400000).toISOString().slice(0, 10);
  for (const x of [from, to])
    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(x) ||
      !Number.isFinite(Date.parse(x)) ||
      new Date(x).toISOString().slice(0, 10) !== x
    )
      throw new Error("Invalid date.");
  const start = Date.parse(from),
    end = Date.parse(to) + 86400000;
  if (start >= end || end - start > 366 * 86400000)
    throw new Error("Choose a date range of at most 366 days.");
  return { from, to, start, end };
}
