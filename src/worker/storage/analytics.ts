import { buildHitFilter, dimensions } from "../analytics/filters";
import type { DailyTotal, DimensionTotal } from "./models";

const DAY_MS = 86_400_000;
const MAX_BREAKDOWN_VALUES = 100;

function fillMissingDays(
  rows: DailyTotal[],
  start: number,
  end: number,
): DailyTotal[] {
  const totals = new Map(rows.map((row) => [row.date, row.hits]));
  const series: DailyTotal[] = [];
  for (let timestamp = start; timestamp < end; timestamp += DAY_MS) {
    const date = new Date(timestamp).toISOString().slice(0, 10);
    series.push({ date, hits: totals.get(date) || 0 });
  }
  return series;
}

export class AnalyticsRepository {
  constructor(private readonly sql: SqlStorage) {}

  summarize(query: string) {
    const filter = buildHitFilter(new URLSearchParams(query));
    const total = this.sql
      .exec<{ count: number }>(
        `
      SELECT COUNT(*) AS count FROM hits WHERE ${filter.where}
    `,
        ...filter.bindings,
      )
      .one().count;

    const dailyTotals = this.sql
      .exec<DailyTotal>(
        `
      SELECT strftime('%Y-%m-%d', time / 1000, 'unixepoch') AS date,
             COUNT(*) AS hits
      FROM hits WHERE ${filter.where}
      GROUP BY date ORDER BY date
    `,
        ...filter.bindings,
      )
      .toArray();

    const breakdowns: Record<string, DimensionTotal[]> = {};
    for (const dimension of dimensions) {
      breakdowns[dimension] = this.sql
        .exec<DimensionTotal>(
          `
        SELECT ${dimension} AS value, COUNT(*) AS hits
        FROM hits WHERE ${filter.where}
        GROUP BY ${dimension}
        ORDER BY hits DESC, ${dimension} ASC
        LIMIT ${MAX_BREAKDOWN_VALUES}
      `,
          ...filter.bindings,
        )
        .toArray();
    }
    return {
      slug: filter.slug,
      total,
      series: fillMissingDays(
        dailyTotals,
        filter.range.start,
        filter.range.end,
      ),
      dimensions: breakdowns,
    };
  }
}
