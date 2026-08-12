import { Client as PgClient } from 'pg';

/**
 * Real-time change broadcaster for the local SQL DB.
 *
 * - Mutations call `notifyChange(table, op)` to emit pg_notify.
 * - A singleton PgClient listens to channel `db_changes` and
 *   fans events out to subscribers (SSE endpoints).
 *
 * Each query declares which tables it reads via the `reads` field
 * on its definition, so subscribers can be filtered accordingly.
 */

type Listener = (event: ChangeEvent) => void;

export interface ChangeEvent {
  table: string;
  op: 'insert' | 'update' | 'delete';
  ts: number;
  // Optional id of the affected row (helps SSR streaming skip unrelated work)
  rowId?: string;
}

declare global {
  // eslint-disable-next-line no-var
  var __pelisPgListener: PgClient | undefined;
  // eslint-disable-next-line no-var
  var __pelisListeners: Set<Listener> | undefined;
  // eslint-disable-next-line no-var
  var __pelisReady: boolean | undefined;
  // eslint-disable-next-line no-var
  var __pelisReadyWaiters: Array<() => void> | undefined;
}

const LISTEN_CHANNEL = 'db_changes';

function ensureListener(): PgClient {
  if (globalThis.__pelisPgListener) return globalThis.__pelisPgListener;

  const client = new PgClient({
    connectionString: process.env.DATABASE_URL,
  });
  client.on('error', (err) => {
    console.error('[realtime] pg client error', err);
  });

  client
    .connect()
    .then(() => client.query(`LISTEN ${LISTEN_CHANNEL}`))
    .then(() => {
      globalThis.__pelisReady = true;
      const waiters = globalThis.__pelisReadyWaiters ?? [];
      globalThis.__pelisReadyWaiters = [];
      waiters.forEach((fn) => fn());
    })
    .catch((err) => {
      console.error('[realtime] failed to connect pg client', err);
    });

  client.on('notification', (msg) => {
    if (msg.channel !== LISTEN_CHANNEL || !msg.payload) return;
    try {
      const event = JSON.parse(msg.payload) as ChangeEvent;
      const listeners = globalThis.__pelisListeners;
      if (!listeners) return;
      listeners.forEach((fn) => {
        try {
          fn(event);
        } catch (err) {
          console.error('[realtime] listener error', err);
        }
      });
    } catch (err) {
      console.error('[realtime] failed to parse payload', err);
    }
  });

  globalThis.__pelisPgListener = client;
  return client;
}

export async function realtimeReady(): Promise<void> {
  ensureListener();
  if (globalThis.__pelisReady) return;
  await new Promise<void>((resolve) => {
    globalThis.__pelisReadyWaiters ??= [];
    globalThis.__pelisReadyWaiters.push(resolve);
  });
}

export function subscribe(listener: Listener): () => void {
  ensureListener();
  globalThis.__pelisListeners ??= new Set();
  globalThis.__pelisListeners.add(listener);
  return () => {
    globalThis.__pelisListeners?.delete(listener);
  };
}

export async function notifyChange(
  table: string,
  op: 'insert' | 'update' | 'delete',
  rowId?: string,
): Promise<void> {
  const payload = JSON.stringify({ table, op, ts: Date.now(), rowId });
  try {
    // Use the prisma client for the notify call (it manages connection pool).
    const { prisma } = await import('./client');
    await prisma.$executeRawUnsafe(
      `SELECT pg_notify('${LISTEN_CHANNEL}', $1)`,
      payload,
    );
  } catch (err) {
    console.error('[realtime] notifyChange failed', err);
  }
}