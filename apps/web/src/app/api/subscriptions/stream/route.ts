/**
 * Server-Sent Events stream. Keeps a connection open per client and pushes
 * "stale" events whenever a table the client cares about changes (signaled
 * via Postgres LISTEN/NOTIFY under the hood).
 *
 * Client subscribes via:
 *   /api/subscriptions/stream?keys=movies.list,movies.getFeatured
 *
 * Each `key` follows the format `<table>.<operation>` — we only notify
 * if the NOTIFY table matches the prefix.
 */

import { subscribe, type ChangeEvent } from '@pelis/db/realtime';
import { getDefinition } from '@pelis/db/registry';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const keys = (url.searchParams.get('keys') ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  // Build a set of tables this client is interested in.
  const tablesOfInterest = new Set<string>();
  for (const key of keys) {
    const def = getDefinition(key);
    if (def) {
      if (def.kind === 'query') {
        for (const t of def.reads) tablesOfInterest.add(t);
      } else if (def.writes) {
        for (const t of def.writes) tablesOfInterest.add(t);
      }
    } else if (key.includes('.')) {
      // Fallback: treat first segment as table name.
      tablesOfInterest.add(key.split('.')[0] ?? key);
    } else {
      tablesOfInterest.add(key);
    }
  }

  const encoder = new TextEncoder();
  let unsubscribe: (() => void) | null = null;
  let heartbeat: ReturnType<typeof setInterval> | null = null;

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const send = (event: string, payload: unknown) => {
        controller.enqueue(
          encoder.encode(`event: ${event}\ndata: ${JSON.stringify(payload)}\n\n`),
        );
      };

      send('hello', { keys, tables: Array.from(tablesOfInterest) });

      unsubscribe = subscribe((ev: ChangeEvent) => {
        if (tablesOfInterest.has(ev.table)) {
          send('stale', { table: ev.table, op: ev.op, ts: ev.ts });
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
        try { controller.close(); } catch { /* already closed */ }
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
      'Cache-Control': 'no-store, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}