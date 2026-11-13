import type { ShortLink } from "../types";
import { useApiResource } from "./useApiResource";

export function useLinks(revision = 0) {
  const resource = useApiResource<{ links: ShortLink[] }>(
    "/api/links",
    revision,
  );
  return {
    links: resource.data?.links ?? [],
    ready: resource.data !== null,
    loading: resource.loading,
    error: resource.error,
    retry: resource.retry,
  };
}
