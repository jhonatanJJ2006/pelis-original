'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { isQueryLoading, nextQueryState, type QueryState } from './query-state';

type UseQueryState<T> = QueryState<T>;

type SSEClient = {
  url: string;
  keys: Set<string>;
  es: EventSource | null;
  listeners: Map<string, Set<() => void>>;
};

export interface PreloadedQuery<T> {
  name: string;
  args: unknown;
  data: T;
}

let _singleton: SSEClient | null = null;

type BrowserWindow = Window & typeof globalThis;
declare const window: BrowserWindow | undefined;

function getClient(): SSEClient {
  if (typeof window === 'undefined') {
    throw new Error('useQuery must be called on the client');
  }
  if (!_singleton) {
    _singleton = {
      url: '/api/subscriptions/stream',
      keys: new Set(),
      es: null,
      listeners: new Map(),
    };
  }
  return _singleton;
}

function attachListeners(client: SSEClient) {
  if (!client.es) return;
  const handler = (event: Event) => {
    const me = event as MessageEvent;
    try {
      const data = JSON.parse(me.data) as { table?: string; fns?: string[] };
      const affectedFns = new Set(data.fns ?? []);
      const table = data.table;
      for (const key of Array.from(client.listeners.keys())) {
        const fnName = key.split(':')[0] ?? key;
        const hit =
          table != null &&
          (fnName === table || fnName.startsWith(`${table}.`) || affectedFns.has(fnName));
        if (hit) {
          client.listeners.get(key)?.forEach((fn) => fn());
        }
      }
    } catch {
      // ignore
    }
  };
  client.es.addEventListener('stale', handler);
}

function ensureStream(client: SSEClient) {
  if (client.es || client.keys.size === 0) return;
  const params = new URLSearchParams();
  for (const k of client.keys) params.append('keys', k);
  const url = `${client.url}?${params.toString()}`;
  const es = new EventSource(url);
  client.es = es;
  attachListeners(client);
}

function dropStreamIfEmpty(client: SSEClient) {
  if (client.keys.size === 0 && client.es) {
    client.es.close();
    client.es = null;
  }
}

function isSkip(args: unknown): boolean {
  return (
    args === 'skip' ||
    (typeof args === 'object' && args !== null && (args as { skip?: unknown }).skip === true)
  );
}

function postRequestInit(body: unknown): RequestInit & { cache?: 'no-store' } {
  return {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    cache: 'no-store',
    body: JSON.stringify(body ?? {}),
  };
}

function resolveName(fnOrName: unknown): string {
  if (typeof fnOrName === 'string') return fnOrName;
  if (typeof fnOrName === 'function') {
    const fn = fnOrName as { name?: string };
    if (fn.name) return fn.name;
  }
  throw new Error('expected a function reference or string name');
}

export interface QueryResult<T> {
  data: T | undefined;
  error: Error | null;
  isLoading: boolean;
  refetch: () => void;
}

function useQueryController<T = unknown>(
  name: string | { name: string },
  args?: unknown
): QueryResult<T> {
  const fnName = resolveName(name);
  const stableArgs = useStableKey(args);
  const skipped = isSkip(args);
  const [state, setState] = useState<UseQueryState<T>>({ data: undefined, error: null });
  const fetchRef = useRef<() => void>(() => {});

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (skipped) {
      fetchRef.current = () => {};
      return;
    }
    const client = getClient();
    const key = `${fnName}:${stableArgs}`;
    client.keys.add(key);

    const fetcher = async () => {
      try {
        const res = await fetch(
          `/api/function/${encodeURIComponent(fnName)}`,
          postRequestInit(args)
        );
        if (!res.ok) {
          throw new Error(`useQuery(${fnName}) failed: ${res.status}`);
        }
        const data = (await res.json()) as T;
        setState((prev) => nextQueryState(prev, { ok: true, data }));
      } catch (err) {
        setState((prev) => nextQueryState(prev, { ok: false, error: err as Error }));
      }
    };

    let isMounted = true;
    const wrap = () => {
      if (isMounted) void fetcher();
    };
    fetchRef.current = wrap;

    if (!client.listeners.has(key)) client.listeners.set(key, new Set());
    client.listeners.get(key)!.add(wrap);
    ensureStream(client);
    void fetcher();

    return () => {
      isMounted = false;
      fetchRef.current = () => {};
      client.listeners.get(key)?.delete(wrap);
      if (client.listeners.get(key)?.size === 0) {
        client.listeners.delete(key);
      }
      dropStreamIfEmpty(client);
    };
  }, [fnName, stableArgs, skipped]);

  const refetch = useCallback(() => {
    fetchRef.current();
  }, []);

  return {
    data: state.data,
    error: state.error,
    isLoading: isQueryLoading(state, skipped),
    refetch,
  };
}

/** Convex-compatible: returns data or undefined while loading / skipped. */
export function useQuery<T = unknown>(
  name: string | { name: string },
  args?: unknown
): T | undefined {
  return useQueryController<T>(name, args).data;
}

/** Same fetch as useQuery, plus error / loading / refetch for unified page states. */
export function useQueryResult<T = unknown>(
  name: string | { name: string },
  args?: unknown
): QueryResult<T> {
  return useQueryController<T>(name, args);
}

function useStableKey(value: unknown): string {
  return useMemo(() => stableStringify(value), [JSON.stringify(value)]);
}

function stableStringify(value: unknown): string {
  if (value === undefined) return 'skip';
  if (value === null) return 'null';
  if (typeof value === 'string') return value;
  return JSON.stringify(value);
}

export function useMutation<TArgs = unknown, TResult = unknown>(
  name: string | { name: string }
): (args?: TArgs) => Promise<TResult> {
  const fnName = resolveName(name);
  return useCallback(
    async (args?: TArgs): Promise<TResult> => {
      const res = await fetch(`/api/function/${encodeURIComponent(fnName)}`, postRequestInit(args));
      if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(text || `useMutation(${fnName}) failed: ${res.status}`);
      }
      return (await res.json()) as TResult;
    },
    [fnName]
  );
}

export function useAction<TArgs = unknown, TResult = unknown>(
  name: string | { name: string }
): (args?: TArgs) => Promise<TResult> {
  const fnName = resolveName(name);
  return useCallback(
    async (args?: TArgs): Promise<TResult> => {
      const res = await fetch(`/api/function/${encodeURIComponent(fnName)}`, postRequestInit(args));
      if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(text || `useAction(${fnName}) failed: ${res.status}`);
      }
      return (await res.json()) as TResult;
    },
    [fnName]
  );
}

export function usePreloadedQuery<T>(preloaded: PreloadedQuery<T>): T {
  const [data, setData] = useState<T>(preloaded.data);
  useEffect(() => {
    setData(preloaded.data);
  }, [preloaded]);
  return data;
}

// Aliases to match Convex's API surface.
export type Preloaded<T> = PreloadedQuery<T>;
export type FunctionReference<TArgs = unknown, TResult = unknown> = {
  (...args: TArgs[]): TResult;
  name: string;
};

export { isQueryLoading, nextQueryState } from './query-state';
export type { QueryState } from './query-state';
