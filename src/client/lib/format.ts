const numberFormatter = new Intl.NumberFormat();

export function formatNumber(value: number): string {
  return numberFormatter.format(value);
}

export function formatDimensionValue(value: string): string {
  return !value || value === "(none)" ? "None / unknown" : value;
}

export function buildShortUrl(slug: string): string {
  return `https://l.bl.je/${slug}`;
}

export function todayUtc(): string {
  return new Date().toISOString().slice(0, 10);
}

export function daysAgoUtc(days: number): string {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() - days);
  return date.toISOString().slice(0, 10);
}
