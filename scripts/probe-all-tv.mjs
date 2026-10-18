#!/usr/bin/env node
/**
 * Probe masivo de canales TV (Paso 2 del plan).
 *
 *  - Refresca streamStatus de TODOS los canales activos.
 *  - Actualiza consecutiveFailures según el resultado.
 *  - Desactiva canales no-populares con consecutiveFailures >= threshold.
 *  - Por defecto solo refresca status, NO desactiva (usar --deactivate para eso).
 *
 *  Uso:
 *    node scripts/probe-all-tv.mjs                          # probar todos
 *    node scripts/probe-all-tv.mjs --batch=8 --deactivate   # batch 8 y desactivar
 *    node scripts/probe-all-tv.mjs --only-unknown            # solo los 19 UNKNOWN
 *    node scripts/probe-all-tv.mjs --only-offline            # re-verificar OFFLINE
 *    node scripts/probe-all-tv.mjs --limit=200               # acotar para probar
 *
 *  Variables:
 *    DATABASE_URL en .env
 */

import { readFileSync, existsSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import {
  detectKind,
  isFormatVerdict,
  nextChannelState,
  verdictForKind,
} from './lib/tv-probe-rules.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

function loadEnv() {
  const envPath = join(ROOT, '.env');
  if (!existsSync(envPath)) return;
  for (const line of readFileSync(envPath, 'utf8').split('\n')) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const eq = t.indexOf('=');
    if (eq === -1) continue;
    const key = t.slice(0, eq).trim();
    const value = t.slice(eq + 1).trim();
    if (!process.env[key]) process.env[key] = value;
  }
}
loadEnv();

if (!process.env.DATABASE_URL) {
  console.error('ERROR: DATABASE_URL no definida.');
  process.exit(1);
}

const PROBE_TIMEOUT_MS = 12000;
/** Pause before re-probing a failure inside the same run (network blips). */
const RETRY_DELAY_MS = 3000;
const args = process.argv.slice(2);
const getArg = (n, fb) => {
  const a = args.find((x) => x.startsWith(`--${n}=`));
  return a ? a.slice(n.length + 3) : fb;
};
const batchSize = parseInt(getArg('batch', '8'), 10);
const deactivate = args.includes('--deactivate');
const onlyUnknown = args.includes('--only-unknown');
const onlyOffline = args.includes('--only-offline');
const limitArg = getArg('limit', null);
const limit = limitArg ? parseInt(limitArg, 10) : null;

function timestamp() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}-${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}`;
}

const PROBE_HEADERS = {
  Accept: '*/*',
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:137.0) Gecko/20100101 Firefox/137.0',
  'Cache-Control': 'no-store',
};

async function fetchWithTimeout(url, extraHeaders = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), PROBE_TIMEOUT_MS);
  try {
    return await fetch(url, {
      method: 'GET',
      redirect: 'follow',
      signal: controller.signal,
      headers: { ...PROBE_HEADERS, ...extraHeaders },
    });
  } finally {
    clearTimeout(timeout);
  }
}

function playlistUris(text, baseUrl) {
  const lines = text.split(/\r?\n/).map((l) => l.trim());
  const variants = [];
  const segments = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line || line.startsWith('#')) continue;
    let abs;
    try {
      abs = new URL(line, baseUrl).toString();
    } catch {
      continue;
    }
    const prev = lines.slice(Math.max(0, i - 3), i).join('\n');
    if (prev.includes('#EXT-X-STREAM-INF')) variants.push(abs);
    else segments.push(abs);
  }
  return { variants, segments };
}

function httpError(response, text) {
  let detail = `HTTP ${response.status}`;
  if (text && text.length < 200) detail = `${response.status}: ${text.replace(/\s+/g, ' ').trim()}`;
  return detail;
}

async function readFirstBytes(response, max = 2048) {
  const reader = response.body?.getReader();
  if (!reader) return null;
  const chunks = [];
  let total = 0;
  try {
    while (total < max) {
      const { done, value } = await reader.read();
      if (done || !value) break;
      chunks.push(value);
      total += value.length;
    }
  } finally {
    await reader.cancel().catch(() => {});
  }
  const out = new Uint8Array(Math.min(total, max));
  let offset = 0;
  for (const c of chunks) {
    const take = Math.min(c.length, out.length - offset);
    out.set(c.subarray(0, take), offset);
    offset += take;
    if (offset >= out.length) break;
  }
  return out;
}

async function probeWithRetry(streamUrl) {
  const first = await probeUpstream(streamUrl);
  if (first.streamStatus === 'online' || isFormatVerdict(first)) return first;
  await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));
  return probeUpstream(streamUrl);
}

/** Downloads the first bytes of a segment: it must answer 2xx with a body. */
async function probeSegment(url) {
  const r = await fetchWithTimeout(url, { Range: 'bytes=0-2047' });
  if (!r.ok) {
    await r.body?.cancel().catch(() => {});
    return `segmento ${httpError(r)}`;
  }
  const reader = r.body?.getReader();
  const chunk = reader ? await reader.read() : { value: undefined };
  await reader?.cancel().catch(() => {});
  if (!chunk.value || chunk.value.length === 0) return 'segmento vacío';
  return null;
}

/**
 * Probes the whole chain: master -> media playlist -> one segment. A channel is
 * online only if some variant has a downloadable segment (the master alone
 * answering 200 is not enough: France 24 Español served a valid master whose
 * variants all returned 400).
 */
async function probeUpstream(streamUrl, depth = 0) {
  try {
    const response = await fetchWithTimeout(streamUrl);
    if (!response.ok) {
      const text = await response.text().catch(() => '');
      return { streamStatus: 'offline', lastStreamError: httpError(response, text) };
    }
    const finalUrl = response.url || streamUrl;
    const contentType = response.headers.get('content-type') ?? '';
    const isManifest =
      contentType.toLowerCase().includes('mpegurl') || finalUrl.toLowerCase().includes('.m3u8');
    if (!isManifest) {
      // Same rule as the web player: progressive mp4/webm plays natively, raw
      // MPEG-TS (often labeled octet-stream) does not. Sniff the first bytes.
      const firstBytes = await readFirstBytes(response);
      return verdictForKind(detectKind(finalUrl, contentType, firstBytes));
    }
    const text = await response.text();
    if (!text.startsWith('#EXTM3U') && !text.includes('#EXT-X-')) {
      return {
        streamStatus: 'offline',
        lastStreamError: 'Respuesta no es un manifiesto M3U8 válido',
      };
    }
    const { variants, segments } = playlistUris(text, finalUrl);
    if (variants.length > 0) {
      if (depth >= 2)
        return { streamStatus: 'offline', lastStreamError: 'Demasiados niveles de playlist' };
      let lastError = 'Ninguna variante responde';
      for (const v of variants.slice(0, 3)) {
        const r = await probeUpstream(v, depth + 1);
        if (r.streamStatus === 'online') return r;
        lastError = `variante: ${r.lastStreamError}`;
      }
      return { streamStatus: 'offline', lastStreamError: lastError };
    }
    if (segments.length === 0) {
      return { streamStatus: 'offline', lastStreamError: 'Manifiesto sin segmentos de video' };
    }
    // Live playlists: the newest segment is the one players request.
    const target = text.includes('#EXT-X-ENDLIST') ? segments[0] : segments[segments.length - 1];
    const segError = await probeSegment(target);
    if (segError) return { streamStatus: 'offline', lastStreamError: segError };
    return { streamStatus: 'online' };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error de conexión';
    return { streamStatus: 'offline', lastStreamError: message };
  }
}

async function main() {
  const stamp = timestamp();
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

  console.log('🎬 Pelis TV — Probe masivo\n');
  console.log(`Batch size: ${batchSize}`);
  console.log(`Deactivate after threshold: ${deactivate}`);
  console.log(`Filters: ${onlyUnknown ? 'only-unknown' : ''} ${onlyOffline ? 'only-offline' : ''}`);
  if (limit) console.log(`Limit: ${limit}`);

  // Construir query
  const conditions = ['"isActive" = true'];
  if (onlyUnknown) conditions.push(`"streamStatus" = 'UNKNOWN'`);
  if (onlyOffline) conditions.push(`"streamStatus" = 'OFFLINE'`);
  const whereClause = conditions.join(' AND ');
  const limitClause = limit ? `LIMIT ${limit}` : '';

  const channelsRes = await pool.query(
    `SELECT id, name, "streamUrl", "streamStatus", "consecutiveFailures", "isPopular"
     FROM tv_channel
     WHERE ${whereClause}
     ORDER BY "isPopular" DESC, name ASC
     ${limitClause}`
  );

  const channels = channelsRes.rows;
  console.log(`\n📋 Canales a probar: ${channels.length}\n`);

  let online = 0;
  let offline = 0;
  let deactivated = 0;
  const errors = [];

  for (let i = 0; i < channels.length; i += batchSize) {
    const slice = channels.slice(i, i + batchSize);
    const results = await Promise.all(
      slice.map(async (ch) => {
        const result = await probeWithRetry(ch.streamUrl);
        return { ch, result };
      })
    );

    for (const { ch, result } of results) {
      const next = nextChannelState(ch.streamStatus, ch.consecutiveFailures ?? 0, result);
      const nextFailures = next.failures;

      const shouldDeactivate = deactivate && !ch.isPopular && nextFailures >= 2;

      await pool.query(
        `UPDATE tv_channel
         SET "streamStatus" = $1,
             "lastCheckedAt" = now(),
             "lastStreamError" = $2,
             "consecutiveFailures" = $3,
             "isActive" = CASE WHEN $4 THEN false ELSE "isActive" END
         WHERE id = $5`,
        [next.status, result.lastStreamError ?? null, nextFailures, shouldDeactivate, ch.id]
      );

      if (result.streamStatus === 'online') online++;
      else {
        offline++;
        if (shouldDeactivate) deactivated++;
        if (errors.length < 30) {
          errors.push({ name: ch.name, error: result.lastStreamError });
        }
      }
    }

    process.stdout.write(
      `\r   Progreso: ${Math.min(i + slice.length, channels.length)}/${channels.length} (online: ${online}, offline: ${offline})   `
    );
    await new Promise((r) => setTimeout(r, 100));
  }

  console.log('\n\n═══════════════════════════════════════════════════════');
  console.log('  RESULTADO DEL PROBE');
  console.log('═══════════════════════════════════════════════════════');
  console.log(`Probados: ${channels.length}`);
  console.log(`  · Online:  ${online} (${((online / channels.length) * 100).toFixed(1)}%)`);
  console.log(`  · Offline: ${offline} (${((offline / channels.length) * 100).toFixed(1)}%)`);
  if (deactivate) console.log(`  · Desactivados (threshold=2): ${deactivated}`);

  if (errors.length > 0) {
    console.log('\n— Muestra de errores —');
    for (const e of errors.slice(0, 15)) {
      const errStr = String(e.error ?? '').slice(0, 70);
      console.log(`  · ${e.name.padEnd(30)} → ${errStr}`);
    }
  }

  // Resumen final del estado
  const summary = await pool.query(`
    SELECT "streamStatus" AS status, "isActive" AS active, count(*)::int AS n
    FROM tv_channel
    GROUP BY 1, 2
    ORDER BY n DESC
  `);
  console.log('\n— Estado final —');
  for (const r of summary.rows) {
    console.log(`  ${String(r.status).padEnd(8)} isActive=${String(r.active).padEnd(5)} → ${r.n}`);
  }

  // Guardar log
  const logPath = join(ROOT, 'tmp', 'tv-audits', `probe-${stamp}.json`);
  const fs = await import('node:fs/promises');
  await fs.mkdir(dirname(logPath), { recursive: true });
  writeFileSync(
    logPath,
    JSON.stringify(
      {
        stamp,
        batchSize,
        deactivate,
        filters: { onlyUnknown, onlyOffline, limit },
        totals: { tried: channels.length, online, offline, deactivated },
        errors,
        summary: summary.rows,
      },
      null,
      2
    ),
    'utf8'
  );
  console.log(`\n📄 Log guardado en: ${logPath}\n`);

  await pool.end();
}

main().catch((err) => {
  console.error('FATAL:', err);
  process.exit(1);
});
