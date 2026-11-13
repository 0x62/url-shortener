# l.bl.je

A small Cloudflare Workers URL shortener with a React/TypeScript/Tailwind analytics dashboard, Cloudflare Access authentication and a SQLite-backed Durable Object. No Next.js server or external database is required.

## Features

- `/cv` or generated eight-character short paths; custom slugs are case-sensitive.
- `/cv/candidate42` automatically attributes traffic to campaign `candidate42`. Campaigns are path components, **never query parameters**. No campaign creation step.
- The default `/admin` dashboard combines all links. Filter by short link, date, campaign, country, city, browser, OS, screen and referrer. Click a breakdown row to filter.
- `?ref=email` takes precedence over the referring hostname and appears as `ref: email`. Destination query parameters are preserved; incoming query parameters are not forwarded.
- Daily hit chart (UTC), breakdowns, and a link directory with a create form.
- Cryptographic Access JWT validation on **both** the admin assets and API, in addition to Access at Cloudflare's edge.

## Local development

Node 22+ recommended.

```sh
npm ci
cp .dev.vars.example .dev.vars
npm run build
npm run dev
```

Open `http://localhost:8787/admin`. The development bypass only works for loopback hostnames and must not be configured in Cloudflare. Wrangler uses a local SQLite database. For UI hot reload, run `npm run dev:ui` alongside Wrangler; use `http://127.0.0.1:5173/admin/` (API requests proxy to Wrangler).

```sh
npm run check # TypeScript, tests and production UI build
```

## Cloudflare setup (not deployed automatically)

1. Ensure your account manages `bl.je`. SQLite Durable Objects are available on Workers Free; free quotas still apply. See [current limits and pricing](https://developers.cloudflare.com/durable-objects/platform/pricing/).
2. In Zero Trust → Access → Applications create a self-hosted application protecting `l.bl.je/admin*` **and** `l.bl.je/api*`. Allow only your identity/email using your preferred Access identity provider or one-time PIN. Do not protect the public short-link paths or `/_collect`.
3. Set `ACCESS_TEAM_DOMAIN` to your team hostname, e.g. `your-team.cloudflareaccess.com`, and `ACCESS_AUD` to the application's audience tag in `wrangler.jsonc`. Both path rules should use the same application/audience. These values are identifiers, not secrets. Authentication fails closed when missing.
4. Generate at least 32 random secret characters, then run `npx wrangler secret put ANALYTICS_SECRET`. This signs short-lived analytics enrichment tokens. Do not commit the secret. Without it, redirects still work but resolution remains unknown.
5. Bind the custom domain using Workers dashboard, or add `"routes": [{"pattern":"l.bl.je", "custom_domain":true}]` to Wrangler config once ready. Disable the workers.dev route and preview URLs in production (`"workers_dev": false`, `"preview_urls": false`) to avoid alternate public origins. The code independently validates Access on those routes as well.
6. Run `npm run deploy` after authorizing deployment. The migration creates the SQLite Durable Object. Verify that `/admin` and `/api/links` require login, that a permitted user can create a link, and that public campaign links work without login.

Access documentation: [Protect self-hosted applications](https://developers.cloudflare.com/cloudflare-one/access-controls/applications/http-apps/self-hosted-public-app/) and [Validate JWTs](https://developers.cloudflare.com/cloudflare-one/access-controls/applications/http-apps/authorization-cookie/validating-json/).

## Analytics accuracy and privacy

A plain HTTP redirect cannot reveal screen resolution. Human visits therefore receive a tiny first-party redirect page that sends a signed, one-time enrichment beacon and immediately navigates to the destination. With JavaScript disabled, a one-second meta-refresh and visible destination link provide fallback. Without JavaScript/beacon delivery, resolution is unknown; **the initial hit is still counted once**. Screen values are CSS pixels (`screen.width` × `screen.height`), not physical panel pixels or viewport size.

Country/city come from Cloudflare request metadata (approximate IP geolocation). UA-derived browser/OS are approximate and may be reduced or spoofed. No raw IPs, full user agents, cookies, fingerprints or referrer URLs/query strings are stored. Explicit `ref` labels are stored, so avoid placing sensitive data in them or campaign IDs. Do not use campaign IDs to expose names or email addresses. City and small campaign datasets may still identify people; decide whether this level of measurement is appropriate for your audience and provide a privacy notice.

These are **hits, not unique people**. Reloads count; known bots/previews and HEAD requests do not. Unknown security scanners can still count. Campaigns and dimensions can be spoofed by visitors; the dashboard is not proof that a particular recipient read a CV. Screen enrichment tokens expire after five minutes and only update an existing hit, once. There is no public arbitrary event-ingestion endpoint.

Raw hit retention defaults to 365 days (configurable 1–365). A daily Durable Object alarm purges older hits, so retention may lag by a day. No permanent campaign profile is retained after its hits expire. Dashboard queries are bounded to 366 days and breakdowns display the top 100 values. Link-list counts are retained hits, not lifetime hits.

## Architecture and limits

One Durable Object serializes the directory and analytics writes, using parameterized SQLite queries and time/link indexes. This deliberately suits a personal CV/link shortener, not a public multi-tenant service. All campaigns are derived from stored events. At high traffic volume, move analytics to per-link objects or a separate analytics service; do not assume Workers Free offers unlimited writes, storage or requests. Retention deletes and aggregate scans count toward resource use. [Workers pricing](https://developers.cloudflare.com/workers/platform/pricing/) and [DO limits](https://developers.cloudflare.com/durable-objects/platform/limits/) are authoritative.

Analytics storage failure falls back to an untracked redirect so a transient measurement failure does not strand visitors. Missing links return 404, invalid slugs cannot collide with admin/API routes, and destinations cannot redirect back to this origin. Link creation is atomic and rejects duplicates. An authenticated write also requires a same-origin request to reduce CSRF risk. The initial version supports creation and viewing only; no destructive edit/delete operations are exposed.

Never commit `.dev.vars`, `.env` or `.wrangler` state. No Cloudflare credentials are included. Deployments and Access/DNS changes are explicit operator actions.

## Validation

The initial implementation passed TypeScript, 11 unit/security tests, a production UI build, and a Wrangler deployment dry-run (no deployment). A local Workerd/SQLite smoke test passed concurrent duplicate creation, campaign/ref attribution, single-count enrichment/replay protection, filters, invalid-date handling, and admin asset serving. Re-run it against local Wrangler with `node test/smoke.mjs`; it creates uniquely named local test links.

Live Cloudflare Access login, custom-domain routing and production geolocation require the above account setup and have not been verified. Automated visual/browser QA was blocked in the build environment by Chromium's socket restriction; responsive styling is implemented but the finished page still needs browser review before deployment.
