import { useState } from "react";
import type {
  AnalyticsStats,
  DatePreset,
  Dimension,
  DimensionFilters,
  ShortLink,
} from "../types";
import { DIMENSIONS, DIMENSION_LABELS } from "../lib/dimensions";
import { daysAgoUtc, formatDimensionValue, todayUtc } from "../lib/format";

interface AnalyticsFiltersProps {
  slug: string;
  links: ShortLink[];
  preset: DatePreset;
  onPresetChange: (preset: DatePreset) => void;
  filters: DimensionFilters;
  breakdown?: AnalyticsStats["dimensions"];
  loading: boolean;
  onSelectLink: (slug: string) => void;
  onDatesChange: (from: string, to: string) => void;
  onAddFilter: (dimension: Dimension, value: string) => void;
  onRemoveFilter: (dimension: Dimension) => void;
  onClearFilters: () => void;
  onRefresh: () => void;
}

export function AnalyticsFilters({
  slug,
  links,
  preset,
  onPresetChange,
  filters,
  breakdown,
  loading,
  onSelectLink,
  onDatesChange,
  onAddFilter,
  onRemoveFilter,
  onClearFilters,
  onRefresh,
}: AnalyticsFiltersProps) {
  const [selectedDimension, setSelectedDimension] = useState<Dimension | "">(
    "",
  );

  function selectPreset(value: DatePreset) {
    onPresetChange(value);
    if (value !== "custom") {
      onDatesChange(daysAgoUtc(Number(value) - 1), todayUtc());
    }
  }

  function selectFilterValue(value: string) {
    if (selectedDimension && value) {
      onAddFilter(selectedDimension, value);
      setSelectedDimension("");
    }
  }

  return (
    <>
      <div className="filter-bar">
        <div className="filter-tools">
          <select
            aria-label="Filter by shortlink"
            value={slug}
            onChange={(event) => onSelectLink(event.target.value)}
          >
            <option value="">All shortlinks</option>
            {links.map((link) => (
              <option key={link.slug} value={link.slug}>
                {link.title ? `${link.title} (/${link.slug})` : `/${link.slug}`}
              </option>
            ))}
          </select>
          <select
            aria-label="Quick date range"
            value={preset}
            onChange={(event) => selectPreset(event.target.value as DatePreset)}
          >
            <option value="1">Today</option>
            <option value="7">Last 7 days</option>
            <option value="30">Last 30 days</option>
            <option value="90">Last 90 days</option>
            <option value="custom">Custom dates</option>
          </select>
          <select
            aria-label="Choose a filter"
            value={selectedDimension}
            onChange={(event) =>
              setSelectedDimension(event.target.value as Dimension | "")
            }
          >
            <option value="">＋ Add filter</option>
            {DIMENSIONS.map((dimension) => (
              <option key={dimension} value={dimension}>
                {DIMENSION_LABELS[dimension]}
              </option>
            ))}
          </select>
          {selectedDimension && (
            <select
              key={selectedDimension}
              aria-label={`Filter by ${DIMENSION_LABELS[selectedDimension]}`}
              value=""
              onChange={(event) => selectFilterValue(event.target.value)}
            >
              <option value="">
                Choose {DIMENSION_LABELS[selectedDimension].toLowerCase()}
              </option>
              {(breakdown?.[selectedDimension] ?? []).map((row) => (
                <option key={row.value} value={row.value || "(none)"}>
                  {formatDimensionValue(row.value)}
                </option>
              ))}
            </select>
          )}
        </div>
        <button className="refresh" onClick={onRefresh} disabled={loading}>
          {loading ? "Updating…" : "Refresh data"}
        </button>
      </div>
      {Object.keys(filters).length > 0 && (
        <div className="active-filters">
          {Object.entries(filters).map(([key, value]) => {
            const dimension = key as Dimension;
            return (
              <button
                key={dimension}
                className="filter-chip"
                onClick={() => onRemoveFilter(dimension)}
                aria-label={`Remove ${DIMENSION_LABELS[dimension]} filter`}
              >
                {DIMENSION_LABELS[dimension]}:{" "}
                <strong>{formatDimensionValue(value ?? "")}</strong>
                <span>×</span>
              </button>
            );
          })}
          <button className="clear" onClick={onClearFilters}>
            Clear all
          </button>
        </div>
      )}
    </>
  );
}
