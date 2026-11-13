import type { AnalyticsQuery, AnalyticsStats } from "../types";
import { statsEndpoint } from "../lib/api";
import { useApiResource } from "./useApiResource";

export function useAnalytics(query: AnalyticsQuery, revision = 0) {
  const validDates = Boolean(query.from && query.to && query.from <= query.to);
  const endpoint = validDates ? statsEndpoint(query) : null;
  const resource = useApiResource<AnalyticsStats>(endpoint, revision);
  return {
    ...resource,
    error: validDates
      ? resource.error
      : "Choose a start date on or before the end date.",
  };
}
