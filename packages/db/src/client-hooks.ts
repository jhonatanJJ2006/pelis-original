'use client';

import { useEffect, useMemo, useState } from 'react';

interface UseQueryState<T> {
  data: T | undefined;
  error: Error | null;
}

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

function resolveName(fnOrName: unknown): string {
  if (typeof fnOrName === 'string') return fnOrName;
  if (typeof fnOrName === 'function') {
    const fn = fnOrName as { name?: string };
    if (fn.name) return fn.name;
  }
  throw new Error('expected a function reference or string name');
}

export function useQuery<T = unknown>(
  name: string | { name: string },
  args?: unknown,
): T | undefined {
  const fnName = resolveName(name);
  const stableArgs = useStableKey(args);
  const [state, setState] = useState<UseQueryState<T>>({ data: undefined, error: null });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (isSkip(args)) return;
    const client = getClient();
    const key = `${fnName}:${stableArgs}`;
    client.keys.add(key);

    const fetcher = async () => {
      try {
        const res = await fetch(`/api/function/${encodeURIComponent(fnName)}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(args ?? {}),
        });
        if (!res.ok) {
          throw new Error(`useQuery(${fnName}) failed: ${res.status}`);
        }
        const data = (await res.json()) as T;
        setState({ data, error: null });
      } catch (err) {
        setState({ data: undefined, error: err as Error });
      }
    };

    let isMounted = true;
    const wrap = () => {
      if (isMounted) void fetcher();
    };

    if (!client.listeners.has(key)) client.listeners.set(key, new Set());
    client.listeners.get(key)!.add(wrap);
    ensureStream(client);
    void fetcher();

    return () => {
      isMounted = false;
      client.listeners.get(key)?.delete(wrap);
      if (client.listeners.get(key)?.size === 0) {
        client.listeners.delete(key);
      }
      dropStreamIfEmpty(client);
    };
  }, [fnName, stableArgs]);

  return state.data;
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
  name: string | { name: string },
): (args?: TArgs) => Promise<TResult> {
  const fnName = resolveName(name);
  return async (args?: TArgs): Promise<TResult> => {
    const res = await fetch(`/api/function/${encodeURIComponent(fnName)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(args ?? {}),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(text || `useMutation(${fnName}) failed: ${res.status}`);
    }
    return (await res.json()) as TResult;
  };
}

export function useAction<TArgs = unknown, TResult = unknown>(
  name: string | { name: string },
): (args?: TArgs) => Promise<TResult> {
  const fnName = resolveName(name);
  return async (args?: TArgs): Promise<TResult> => {
    const res = await fetch(`/api/function/${encodeURIComponent(fnName)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(args ?? {}),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(text || `useAction(${fnName}) failed: ${res.status}`);
    }
    return (await res.json()) as TResult;
  };
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