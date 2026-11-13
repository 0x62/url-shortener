import { escapeHtml } from "./html";
import type { EnrichmentToken } from "../analytics/enrichment";

export function measuredRedirect(
  destination: string,
  token: EnrichmentToken,
): Response {
  const nonce = crypto.randomUUID();
  const escapedDestination = escapeHtml(destination);
  const scriptDestination = JSON.stringify(destination).replace(
    /</g,
    "\\u003c",
  );
  const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width">
    <meta http-equiv="refresh" content="1;url=${escapedDestination}">
    <title>Redirecting…</title>
  </head>
  <body>
    <p>Redirecting to <a rel="noreferrer" href="${escapedDestination}">your destination</a>…</p>
    <script nonce="${nonce}">
      const token = ${JSON.stringify(token)};
      try {
        navigator.sendBeacon('/_collect', JSON.stringify({
          ...token,
          w: screen.width,
          h: screen.height
        }));
      } catch (error) {
        // Analytics must never prevent navigation.
      }
      location.replace(${scriptDestination});
    </script>
  </body>
</html>`;
  return new Response(html, {
    headers: {
      "Content-Type": "text/html;charset=utf-8",
      "Cache-Control": "no-store",
      "Referrer-Policy": "no-referrer",
      "X-Robots-Tag": "noindex, nofollow",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": `default-src 'none'; script-src 'nonce-${nonce}'; connect-src 'self'; base-uri 'none'; frame-ancestors 'none'`,
    },
  });
}
