import type { Dimension } from "../types";

export const DIMENSION_LABELS: Record<Dimension, string> = {
  campaign: "Campaign",
  country: "Country",
  city: "City",
  browser: "Browser",
  os: "Operating system",
  screen: "Screen resolution",
  referrer: "Referrer",
};

export const DIMENSION_TITLES: Record<Dimension, string> = {
  campaign: "Campaigns",
  country: "Countries",
  city: "Cities",
  browser: "Browsers",
  os: "Operating systems",
  screen: "Screen resolutions",
  referrer: "Referrers",
};

export const DIMENSIONS = Object.keys(DIMENSION_LABELS) as Dimension[];
