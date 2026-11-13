import { HttpError } from "../http/errors";

const DAY_MS = 86_400_000;
const MAX_RANGE_DAYS = 366;
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

function validateDate(value: string): void {
  const timestamp = Date.parse(value);
  const validFormat = /^\d{4}-\d{2}-\d{2}$/.test(value);
  if (!validFormat || !Number.isFinite(timestamp)) {
    throw new HttpError(400, "Invalid date.");
  }
  if (new Date(timestamp).toISOString().slice(0, 10) !== value) {
    throw new HttpError(400, "Invalid date.");
  }
}

export function dateRange(params: URLSearchParams) {
  const now = Date.now();
  const to = params.get("to") || new Date(now).toISOString().slice(0, 10);
  const from =
    params.get("from") ||
    new Date(now - 29 * DAY_MS).toISOString().slice(0, 10);
  validateDate(from);
  validateDate(to);

  const start = Date.parse(from);
  const end = Date.parse(to) + DAY_MS; // Exclusive end includes the entire selected last day.
  if (start >= end || end - start > MAX_RANGE_DAYS * DAY_MS) {
    throw new HttpError(400, "Choose a date range of at most 366 days.");
  }
  return { from, to, start, end };
}

/** Only allowlisted column names enter SQL; all visitor values remain bindings. */
export function buildHitFilter(params: URLSearchParams) {
  const range = dateRange(params);
  const clauses = ["time >= ?", "time < ?"];
  const bindings: (string | number)[] = [range.start, range.end];
  const slug = params.get("slug");
  if (slug) {
    clauses.push("slug = ?");
    bindings.push(slug);
  }
  for (const dimension of dimensions) {
    const value = params.get(dimension);
    if (!value) continue;
    clauses.push(`${dimension} = ?`);
    bindings.push(value === "(none)" ? "" : value);
  }
  return { range, slug, where: clauses.join(" AND "), bindings };
}
