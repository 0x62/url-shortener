import { useState } from "react";
import type { DatePreset, Dimension, DimensionFilters } from "../types";
import { useAnalytics } from "../hooks/useAnalytics";
import { useLinks } from "../hooks/useLinks";
import { daysAgoUtc, todayUtc } from "../lib/format";
import { DateRange } from "./DateRange";
import { DashboardHeading } from "./DashboardHeading";
import { AnalyticsFilters } from "./AnalyticsFilters";
import { AnalyticsPanels } from "./AnalyticsPanels";
import { ErrorBox, Loading } from "./Feedback";
import { Icon } from "./Icon";

interface DashboardProps {
  slug: string;
  onSelect: (slug: string) => void;
  onCreate: () => void;
  refresh: number;
}

export function Dashboard({
  slug,
  onSelect,
  onCreate,
  refresh,
}: DashboardProps) {
  const [from, setFrom] = useState(() => daysAgoUtc(29));
  const [to, setTo] = useState(todayUtc);
  const [preset, setPreset] = useState<DatePreset>("30");
  const [filters, setFilters] = useState<DimensionFilters>({});
  const linkResource = useLinks(refresh);
  const analytics = useAnalytics({ slug, from, to, filters }, refresh);

  function addFilter(dimension: Dimension, value: string) {
    setFilters((current) => ({ ...current, [dimension]: value || "(none)" }));
  }

  function removeFilter(dimension: Dimension) {
    setFilters((current) => {
      const updated = { ...current };
      delete updated[dimension];
      return updated;
    });
  }

  function changeDates(startDate: string, endDate: string) {
    setFrom(startDate);
    setTo(endDate);
  }

  const hasNoLinks = linkResource.ready && linkResource.links.length === 0;
  const showOnboarding = hasNoLinks && !analytics.loading && !analytics.error;

  return (
    <>
      <DashboardHeading slug={slug} link={analytics.data?.link ?? null}>
        <DateRange
          from={from}
          to={to}
          onChange={(startDate, endDate) => {
            setPreset("custom");
            changeDates(startDate, endDate);
          }}
        />
      </DashboardHeading>
      <AnalyticsFilters
        slug={slug}
        links={linkResource.links}
        preset={preset}
        onPresetChange={setPreset}
        filters={filters}
        breakdown={analytics.data?.dimensions}
        loading={analytics.loading}
        onSelectLink={onSelect}
        onDatesChange={changeDates}
        onAddFilter={addFilter}
        onRemoveFilter={removeFilter}
        onClearFilters={() => setFilters({})}
        onRefresh={analytics.retry}
      />
      {linkResource.error && (
        <ErrorBox
          error={`The shortlink list could not be loaded. ${linkResource.error}`}
          retry={linkResource.retry}
        />
      )}
      {showOnboarding && (
        <div className="onboarding">
          <div>
            <strong>Make your first connection.</strong>
            <p>Create a short link to start collecting traffic insights.</p>
          </div>
          <button className="button primary" onClick={onCreate}>
            <Icon type="plus" />
            Create link
          </button>
        </div>
      )}
      {analytics.error ? (
        <ErrorBox error={analytics.error} retry={analytics.retry} />
      ) : analytics.data ? (
        <AnalyticsPanels
          stats={analytics.data}
          loading={analytics.loading}
          onFilter={addFilter}
        />
      ) : (
        <Loading message="Loading analytics…" />
      )}
    </>
  );
}
