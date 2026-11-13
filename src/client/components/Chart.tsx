import type { DailyTotal } from "../types";
import { formatNumber } from "../lib/format";

interface ChartProps {
  series: DailyTotal[];
}

export function Chart({ series }: ChartProps) {
  const maxHits = Math.max(1, ...series.map((point) => point.hits));
  const width = 960;
  const height = 210;
  const left = 42;
  const right = 15;
  const top = 15;
  const bottom = 30;
  const plotWidth = width - left - right;
  const plotHeight = height - top - bottom;

  function horizontalPosition(index: number): number {
    const fraction = series.length > 1 ? index / (series.length - 1) : 0.5;
    return left + fraction * plotWidth;
  }

  function verticalPosition(hits: number): number {
    return top + plotHeight - (hits / maxHits) * plotHeight;
  }

  const linePath = series
    .map((point, index) => {
      const command = index === 0 ? "M" : "L";
      return `${command}${horizontalPosition(index)},${verticalPosition(point.hits)}`;
    })
    .join(" ");

  // Close the filled area against the baseline without changing the line path.
  const baseline = verticalPosition(0);
  const areaPath =
    series.length > 0
      ? `${linePath} L${horizontalPosition(series.length - 1)},${baseline} L${horizontalPosition(0)},${baseline} Z`
      : "";

  function formatDate(value: string): string {
    return new Date(`${value.slice(0, 10)}T12:00:00Z`).toLocaleDateString(
      "en-GB",
      {
        day: "numeric",
        month: "short",
        timeZone: "UTC",
      },
    );
  }
  return (
    <div className="chart">
      <svg
        role="img"
        aria-label="Daily redirect hits over the selected period"
        viewBox={`0 0 ${width} ${height}`}
      >
        <defs>
          <linearGradient id="chart-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#4169e1" stopOpacity=".16" />
            <stop offset="100%" stopColor="#4169e1" stopOpacity=".01" />
          </linearGradient>
        </defs>
        {[0, 0.5, 1].map((fraction) => (
          <g key={fraction}>
            <line
              x1={left}
              x2={width - right}
              y1={verticalPosition(maxHits * fraction)}
              y2={verticalPosition(maxHits * fraction)}
              stroke="#e8edf3"
              strokeDasharray="3 4"
            />
            <text
              x={left - 10}
              y={verticalPosition(maxHits * fraction) + 4}
              textAnchor="end"
              fill="#8b95a5"
              fontSize="11"
            >
              {formatNumber(Math.round(maxHits * fraction))}
            </text>
          </g>
        ))}
        <path d={areaPath} fill="url(#chart-fill)" />
        <path
          d={linePath}
          fill="none"
          stroke="#4169e1"
          strokeWidth="2.5"
          strokeLinejoin="round"
        />
        {series.map((point, index) => (
          <circle
            key={point.date}
            cx={horizontalPosition(index)}
            cy={verticalPosition(point.hits)}
            r={series.length === 1 ? 4 : 5}
            fill="#4169e1"
            className={series.length === 1 ? "chart-dot single" : "chart-dot"}
          >
            <title>
              {formatDate(point.date)}: {formatNumber(point.hits)} hits
            </title>
          </circle>
        ))}
        {series.length > 0 && (
          <>
            <text x={left} y={height - 5} fill="#8b95a5" fontSize="11">
              {formatDate(series[0].date)}
            </text>
            <text
              x={width - right}
              y={height - 5}
              fill="#8b95a5"
              fontSize="11"
              textAnchor="end"
            >
              {formatDate(series[series.length - 1].date)}
            </text>
          </>
        )}
      </svg>
      <details className="chart-data">
        <summary>View daily totals</summary>
        <div className="daily-data">
          {series.map((point) => (
            <span key={point.date}>
              {point.date}
              <strong>{formatNumber(point.hits)}</strong>
            </span>
          ))}
        </div>
      </details>
    </div>
  );
}
