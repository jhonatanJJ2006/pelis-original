/**
 * Servidor de producción multiproceso.
 *
 * `next start` usa un solo proceso de Node (un núcleo). Aquí el proceso
 * principal levanta WEB_CONCURRENCY workers (por defecto, núcleos - 1) que
 * comparten el mismo puerto; el sistema operativo reparte las conexiones.
 * Si un worker se cae, se levanta otro.
 *
 * Uso: node server-cluster.mjs  (PORT=3000, HOSTNAME=0.0.0.0, WEB_CONCURRENCY=3)
 */
import cluster from 'node:cluster';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from 'node:url';

const port = Number(process.env.PORT || 3000);
const hostname = process.env.HOSTNAME || '0.0.0.0';
const workers = Math.max(
  1,
  Number(process.env.WEB_CONCURRENCY) || Math.max(1, os.availableParallelism() - 1)
);

if (cluster.isPrimary) {
  console.log(`[cluster] ${workers} workers en ${hostname}:${port}`);
  for (let i = 0; i < workers; i++) cluster.fork();
  let stopping = false;
  cluster.on('exit', (worker, code, signal) => {
    if (stopping) return;
    console.error(`[cluster] worker ${worker.process.pid} salió (${signal || code}); reiniciando`);
    setTimeout(() => cluster.fork(), 1000);
  });
  const stop = () => {
    stopping = true;
    for (const w of Object.values(cluster.workers ?? {})) w?.process.kill('SIGTERM');
    setTimeout(() => process.exit(0), 10_000).unref();
  };
  process.on('SIGTERM', stop);
  process.on('SIGINT', stop);
} else {
  const { default: next } = await import('next');
  const dir = path.dirname(fileURLToPath(import.meta.url));
  const app = next({ dev: false, dir, hostname, port });
  const handle = app.getRequestHandler();
  await app.prepare();
  const server = http.createServer((req, res) => {
    handle(req, res, parse(req.url ?? '/', true)).catch((err) => {
      console.error('[cluster] error en request', err);
      if (!res.headersSent) res.statusCode = 500;
      res.end();
    });
  });
  // cloudflared reutiliza conexiones; que Node no las cierre antes que el túnel.
  server.keepAliveTimeout = 65_000;
  server.headersTimeout = 66_000;
  server.requestTimeout = 60_000;
  server.maxConnections = 4000;
  server.listen(port, hostname);
  process.on('SIGTERM', () => server.close(() => process.exit(0)));
}
