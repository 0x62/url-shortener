import type { AnalyticsStats, Dimension } from "../types";
import { DIMENSIONS } from "../lib/dimensions";
import { formatNumber } from "../lib/format";
import { Chart } from "./Chart";
import { DimensionCard } from "./DimensionCard";

interface AnalyticsPanelsProps {
  stats: AnalyticsStats;
  loading: boolean;
  onFilter: (dimension: Dimension, value: string) => void;
}

export function AnalyticsPanels({
  stats,
  loading,
  onFilter,
}: AnalyticsPanelsProps) {
  return (
    <div
      aria-busy={loading}
      className={loading ? "analytics updating" : "analytics"}
    >
      <section className="panel chart-panel">
        <div className="chart-summary">
          <div>
            <p className="eyebrow">TOTAL HITS</p>
            <div className="big-number">{formatNumber(stats.total)}</div>
            <p className="muted small">
              Redirect requests · not unique visitors
            </p>
          </div>
          <span className="chart-legend">
            <span />
            Hits
          </span>
        </div>
        <Chart series={stats.series} />
        {stats.total === 0 && (
          <p className="chart-empty">
            No hits for this period and these filters.
          </p>
        )}
      </section>
      <div className="dimension-grid">
        {DIMENSIONS.map((dimension) => (
          <DimensionCard
            key={dimension}
            dimension={dimension}
            rows={stats.dimensions[dimension] ?? []}
            total={stats.total}
            onFilter={(value) => onFilter(dimension, value)}
          />
        ))}
      </div>
      <p className="data-note">
        Campaigns come from the second path segment. Referrers include explicit
        ?ref= values. Location is approximate; browser and OS are inferred.
        Screen size is available only when the browser reports it.
      </p>
    </div>
  );
}
