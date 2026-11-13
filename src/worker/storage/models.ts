export type Link = {
  slug: string;
  destination: string;
  title: string;
  createdAt: number;
};
export type Hit = {
  id: string;
  slug: string;
  time: number;
  campaign: string;
  country: string;
  city: string;
  browser: string;
  os: string;
  screen: string;
  referrer: string;
};
export type DailyTotal = { date: string; hits: number };
export type DimensionTotal = { value: string; hits: number };
