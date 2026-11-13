import type { Env } from "../types";

/** A stable object name keeps existing links and SQLite data across deployments. */
export function getStore(env: Env) {
  return env.STORE.get(env.STORE.idFromName("links-v1"));
}
