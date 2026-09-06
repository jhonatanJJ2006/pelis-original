export interface QueryState<T> {
  data: T | undefined;
  error: Error | null;
}

/** First fetch in flight: no data yet and no error. Skip is not loading. */
export function isQueryLoading(state: QueryState<unknown>, skipped: boolean): boolean {
  return !skipped && state.data === undefined && state.error === null;
}

/**
 * Keep last-known-good query data when a refetch fails.
 * A failed SSE/refetch must not look like "no rows" to UI gates.
 */
export function nextQueryState<T>(
  prev: QueryState<T>,
  result: { ok: true; data: T } | { ok: false; error: Error }
): QueryState<T> {
  if (result.ok) return { data: result.data, error: null };
  return { data: prev.data, error: result.error };
}
