/** Public shapes returned by the admin JSON API. */
export interface ShortLink {
  slug: string;
  destination: string;
  title: string;
  createdAt: number;
  hits?: number;
}

export type Dimension =
  "campaign" | "country" | "city" | "browser" | "os" | "screen" | "referrer";

export interface DimensionRow {
  value: string;
  hits: number;
}

export interface DailyTotal {
  date: string;
  hits: number;
}

export interface AnalyticsStats {
  link: ShortLink | null;
  total: number;
  series: DailyTotal[];
  dimensions: Record<Dimension, DimensionRow[]>;
}

export type DimensionFilters = Partial<Record<Dimension, string>>;
export type DatePreset = "1" | "7" | "30" | "90" | "custom";

export interface AnalyticsQuery {
  slug: string;
  from: string;
  to: string;
  filters: DimensionFilters;
}

export interface CreateLinkInput {
  destination: string;
  title: string;
  slug?: string;
}
