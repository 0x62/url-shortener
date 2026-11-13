# Architecture

## Router choice

Cloudflare supports Express on Workers through `nodejs_compat` and its Node HTTP-server adapter. Express v5 is a viable option; it is not inherently incompatible with Workers. See Cloudflare's [Express tutorial](https://developers.cloudflare.com/workers/tutorials/deploy-an-express-app/) and [Node HTTP documentation](https://developers.cloudflare.com/workers/runtime-apis/nodejs/http/).

This application uses **Hono** because it is a new, small Workers application rather than an existing Express server. Hono provides familiar route registration, nested routers and middleware while operating directly on Fetch `Request`/`Response` and typed Cloudflare bindings. It avoids a Node server compatibility layer. Express would make more sense if reusing an existing Express application or middleware ecosystem were a requirement.

The router choice is independent of the storage and business rules: handlers delegate to services and repositories rather than embedding the whole application inside route conditionals.

## Server layout

- `src/worker/index.ts`: Cloudflare exports only. `LinkStore` remains exported under its original name for migrations.
- `app.ts`: route composition, authentication boundaries, not-found and centralized error handling.
- `routes/`: focused HTTP handlers for links, statistics, admin assets, public redirects and screen enrichment.
- `middleware/`: Access authentication and same-origin write checks.
- `http/`: bounded request-body reads, typed HTTP errors and consistent responses.
- `links/`: slug and destination validation.
- `analytics/`: visitor attribution, query filters and enrichment payload validation.
- `services/`: JWT verification, signed tokens and Durable Object lookup.
- `views/`: escaped HTML redirect template.
- `storage/`: schema, typed records, directory/event repositories and analytics queries.
- `store.ts`: Durable Object RPC facade and retention alarm lifecycle.

## Request paths

1. `/admin` and all descendants require a verified Access JWT before serving any UI asset.
2. `/api` and all descendants require the same JWT. Mutations also require same-origin headers.
3. `/api/links` lists/creates links; `/api/stats` aggregates all links or a selected link.
4. `/:slug` and `/:slug/:campaign` resolve a stored link, record one eligible hit, and redirect.
5. `/_collect` accepts a bounded, signed short-lived enrichment payload. It can fill an existing hit's empty screen field once, but cannot create a hit.

All SQL values are bound parameters. The only dynamic SQL identifiers come from the fixed dimension allowlist. Duplicate creation is a single `INSERT OR IGNORE ... RETURNING` statement, not a check-then-write race.

## Refactor compatibility

The Worker name, Durable Object class, stable object name (`links-v1`), SQLite schema, endpoint URLs and JSON shapes are unchanged. Existing links and analytics survive deployment of the refactor without a new migration. All-link analytics remains the default. Campaign IDs remain path components, never query parameters.

## Tests

Unit tests cover pure validation and attribution. Request tests use a named in-memory store harness to verify routing, authentication and error behavior. `test/smoke.mjs` runs against local Wrangler/SQLite to cover persistence, atomic duplicate creation and single-update enrichment. It is deliberately local-only and must never run against production.

## Frontend layout

- `src/client/main.tsx` only mounts React and imports the stylesheet entry point.
- `App.tsx` owns the application shell, switching between analytics and link management, and opening the create-link dialog.
- `components/` owns rendering and local interaction state. `Dashboard` composes the heading, date controls, filter bar, and analytics panels; `Chart` and `DimensionCard` render their own data. `LinkList` and `CreateLinkDialog` handle link management. Shared icons, copy controls, and feedback states are separate components.
- `hooks/` owns asynchronous resource loading and navigation. `useApiResource` cancels stale requests on filter changes or unmount; `useLinks` and `useAnalytics` expose view-specific resources. `useAdminNavigation` handles the selected shortlink and browser history.
- `lib/` owns API requests, endpoint serialization, dimension labels, and display formatting. API errors are surfaced to the UI rather than silently ignored. `types.ts` describes the client-facing API shapes.
- `styles.css` is only the stylesheet import entry point. `styles/base.css` owns shared tokens, typography, controls, and feedback; `layout.css` owns the application shell; `links.css` owns the management view; `dashboard.css` owns analytics; and `dialog.css` owns the create form. Responsive rules stay beside their owning styles and preserve their relative cascade order.
- `lib/__tests__/api.test.ts` covers combined query filters, all-link scope, authentication failures, non-JSON login responses, error messages, and link-creation requests.

Frontend components do not contain database queries or authentication decisions. They call the same-origin JSON API; the Worker remains responsible for validating Access credentials and all inputs. All-link analytics is the initial view, with the selected shortlink combined with the other filters rather than acting as a separate analytics mode.
