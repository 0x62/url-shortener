import { describe, expect, it } from "vitest";
import { dateRange } from "../src/worker/analytics/filters";

const MILLISECONDS_PER_DAY = 86_400_000;

describe("analytics date filters", () => {
  it("includes both selected calendar dates", () => {
    const parameters = new URLSearchParams("from=2026-01-01&to=2026-01-02");
    const range = dateRange(parameters);
    expect(range.end - range.start).toBe(2 * MILLISECONDS_PER_DAY);
  });

  it("rejects nonexistent calendar dates", () => {
    const parameters = new URLSearchParams("from=2026-02-30");
    expect(() => dateRange(parameters)).toThrow();
  });

  it("bounds the queried date range", () => {
    const parameters = new URLSearchParams("from=2024-01-01&to=2026-01-01");
    expect(() => dateRange(parameters)).toThrow();
  });
});
