/**
 * Server-Sent Events stream. Keeps a connection open per client and pushes
 * "stale" events whenever a table the client cares about changes (signaled
 * via Postgres LISTEN/NOTIFY under the hood).
 *
 * Client subscribes via:
 *   /api/subscriptions/stream?keys=movies.list,movies.getFeatured
 *
 * Each `key` is a function name. The stream replies with the tables of
 * interest plus the function names that read/write each table, so the
 * client can invalidate exactly the queries/keys that depend on a change.
 */

import { subscribe, type ChangeEvent } from '@pelis/db/realtime';
import { getDefinition, listFunctions } from '@pelis/db/registry';
import '@pelis/db/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// name -> table dependency map, computed once per worker.
let tableToFns: Map<string, string[]> | null = null;
function ensureTableToFns(): Map<string, string[]> {
  if (tableToFns) return tableToFns;
  const map = new Map<string, string[]>();
  for (const def of listFunctions()) {
    const tables = def.kind === 'query' ? def.reads : (def.writes ?? []);
    for (const t of tables) {
      const arr = map.get(t) ?? [];
      arr.push(def.name);
      map.set(t, arr);
    }
  }
  tableToFns = map;
  return map;
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const keys = (url.searchParams.get('keys') ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  // Build a set of tables this client is interested in.
  const tablesOfInterest = new Set<string>();
  for (const key of keys) {
    const fnName = key.split(':')[0] ?? key;
    const def = getDefinition(fnName);
    if (def) {
      if (def.kind === 'query') {
        for (const t of def.reads) tablesOfInterest.add(t);
      } else if (def.writes) {
        for (const t of def.writes) tablesOfInterest.add(t);
      }
    } else if (fnName.includes('.')) {
      // Fallback: treat first segment as table name.
      tablesOfInterest.add(fnName.split('.')[0] ?? fnName);
    } else {
      tablesOfInterest.add(fnName);
    }
  }

  const fnMap = ensureTableToFns();

  const encoder = new TextEncoder();
  let unsubscribe: (() => void) | null = null;
  let heartbeat: ReturnType<typeof setInterval> | null = null;

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const send = (event: string, payload: unknown) => {
        controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(payload)}\n\n`));
      };

      send('hello', { keys, tables: Array.from(tablesOfInterest) });

      unsubscribe = subscribe((ev: ChangeEvent) => {
        if (tablesOfInterest.has(ev.table)) {
          send('stale', {
            table: ev.table,
            op: ev.op,
            ts: ev.ts,
            fns: fnMap.get(ev.table) ?? [],
          });
        }
      });

      // Keep connection alive behind proxies.
      heartbeat = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`: ping\n\n`));
        } catch {
          // controller closed
        }
      }, 25000);

      req.signal.addEventListener('abort', () => {
        if (unsubscribe) unsubscribe();
        if (heartbeat) clearInterval(heartbeat);
        try {
          controller.close();
        } catch {
          /* already closed */
        }
      });
    },
    cancel() {
      if (unsubscribe) unsubscribe();
      if (heartbeat) clearInterval(heartbeat);
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
