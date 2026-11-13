import { useCallback, useEffect, useState } from "react";
import { errorMessage, requestJson } from "../lib/api";

/** Cancel stale requests when filters change or a view unmounts. */
export function useApiResource<T>(endpoint: string | null, revision = 0) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(endpoint !== null);
  const [error, setError] = useState("");
  const [retryCount, setRetryCount] = useState(0);
  const retry = useCallback(() => setRetryCount((count) => count + 1), []);

  useEffect(() => {
    const controller = new AbortController();
    setData(null);
    setError("");
    setLoading(endpoint !== null);

    if (endpoint === null) {
      return () => controller.abort();
    }

    async function load() {
      try {
        const result = await requestJson<T>(endpoint!, {
          signal: controller.signal,
        });
        if (!controller.signal.aborted) {
          setData(result);
        }
      } catch (requestError) {
        if (!controller.signal.aborted) {
          setError(
            errorMessage(
              requestError,
              "Could not load data. Please try again.",
            ),
          );
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    void load();
    return () => controller.abort();
  }, [endpoint, revision, retryCount]);

  return { data, loading, error, retry };
}
