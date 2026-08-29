export interface QueryState<T> {
  data: T | undefined;
  error: Error | null;
}

/**
 * Keep last-known-good query data when a refetch fails.
 * A failed SSE/refetch must not look like "no rows" to UI gates.
 */
export function nextQueryState<T>(
  prev: QueryState<T>,
  result: { ok: true; data: T } | { ok: false; error: Error },
): QueryState<T> {
  if (result.ok) return { data: result.data, error: null };
  return { data: prev.data, error: result.error };
}
