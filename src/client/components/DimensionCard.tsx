import { useState } from "react";
import type { Dimension, DimensionRow } from "../types";
import { DIMENSION_TITLES } from "../lib/dimensions";
import { formatDimensionValue, formatNumber } from "../lib/format";

export function DimensionCard({
  dimension,
  rows,
  total,
  onFilter,
}: {
  dimension: Dimension;
  rows: DimensionRow[];
  total: number;
  onFilter: (value: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const visibleRows = expanded ? rows : rows.slice(0, 6);
  return (
    <section className="panel dimension-panel">
      <div className="dimension-header">
        <h2>{DIMENSION_TITLES[dimension]}</h2>
        <span>Hits</span>
      </div>
      {visibleRows.length ? (
        <div className="dimension-rows">
          {visibleRows.map((row) => (
            <button
              className="dimension-row"
              key={row.value}
              onClick={() => onFilter(row.value)}
              title={`Filter by ${formatDimensionValue(row.value)}`}
            >
              <span
                className="row-bar"
                style={{
                  width: `${total ? Math.min(100, (row.hits / total) * 100) : 0}%`,
                }}
              />
              <span className="row-label">
                {formatDimensionValue(row.value)}
              </span>
              <strong>{formatNumber(row.hits)}</strong>
            </button>
          ))}
        </div>
      ) : (
        <p className="dimension-empty">No data yet</p>
      )}
      {rows.length > 6 && (
        <button className="show-all" onClick={() => setExpanded(!expanded)}>
          {expanded ? "Show less" : `Show all ${rows.length}`}
        </button>
      )}
    </section>
  );
}
