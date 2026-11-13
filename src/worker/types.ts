import type { LinkStore } from "./store";
export interface Env {
  STORE: DurableObjectNamespace<LinkStore>;
  ASSETS: Fetcher;
  PUBLIC_ORIGIN: string;
  ACCESS_TEAM_DOMAIN: string;
  ACCESS_AUD: string;
  ANALYTICS_SECRET?: string;
  DEV_AUTH_BYPASS?: string;
  RETENTION_DAYS?: string;
}

export type AppEnvironment = { Bindings: Env };
