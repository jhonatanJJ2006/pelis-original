#!/usr/bin/env node
/**
 * Variante rápida del probe: solo canales ONLINE, timeout corto, batch grande.
 * Para validar rápido el estado real sin esperar 5+ horas.
 */

import { readFileSync, existsSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

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

const TIMEOUT = parseInt(process.env.PROBE_TIMEOUT_MS ?? '6000', 10);
const BATCH = parseInt(process.env.PROBE_BATCH ?? '32', 10);

const args = process.argv.slice(2);
const getArg = (n, fb) => {
  const a = args.find((x) => x.startsWith(`--${n}=`));
  return a ? a.slice(n.length + 3) : fb;
};
const onlyStatus = getArg('status', 'ONLINE'); // ONLINE | OFFLINE | UNKNOWN | ALL
const limit = parseInt(getArg('limit', '0'), 10) || null;

function timestamp() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}-${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}`;
}

async function probeUpstream(streamUrl) {
  try {
    const response = await fetch(streamUrl, {
      method: 'GET',
      redirect: 'follow',
      signal: AbortSignal.timeout(TIMEOUT),
      headers: {
        Accept: '*/*',
        'User-Agent': 'Mozilla/5.0 (compatible; PelisTV-Probe/1.0)',
        Range: 'bytes=0-4096',
        'Cache-Control': 'no-store',
      },
    });
    if (!response.ok) {
      return { streamStatus: 'offline', lastStreamError: `HTTP ${response.status}` };
    }
    const ct = response.headers.get('content-type') ?? '';
    const finalUrl = response.url || streamUrl;
    const isManifest =
      ct.includes('mpegurl') || ct.includes('x-mpegURL') || finalUrl.toLowerCase().includes('.m3u8');
    if (!isManifest) return { streamStatus: 'online' };
    const text = await response.text();
    if (!text.includes('#EXTM3U') && !text.includes('#EXT-X-')) {
      return { streamStatus: 'offline', lastStreamError: 'No es M3U8 válido' };
    }
    return { streamStatus: 'online' };
  } catch (err) {
    return { streamStatus: 'offline', lastStreamError: err.message };
  }
}

async function main() {
  const stamp = timestamp();
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

  console.log(`🎬 Probe rápido (${onlyStatus}) | timeout=${TIMEOUT}ms | batch=${BATCH}\n`);

  const statusFilter = onlyStatus === 'ALL'
    ? ''
    : `AND "streamStatus" = '${onlyStatus}'`;
  const limitClause = limit ? `LIMIT ${limit}` : '';

  const res = await pool.query(
    `SELECT id, name, "streamUrl", "consecutiveFailures"
     FROM tv_channel
     WHERE "isActive" = true ${statusFilter}
     ORDER BY "isPopular" DESC, "consecutiveFailures" ASC
     ${limitClause}`
  );

  const channels = res.rows;
  console.log(`📋 Canales: ${channels.length}\n`);
  const t0 = Date.now();

  let online = 0;
  let offline = 0;
  const errors = [];

  for (let i = 0; i < channels.length; i += BATCH) {
    const slice = channels.slice(i, i + BATCH);
    const results = await Promise.all(
      slice.map(async (ch) => {
        const result = await probeUpstream(ch.streamUrl);
        return { ch, result };
      })
    );

    for (const { ch, result } of results) {
      const previousFailures = ch.consecutiveFailures ?? 0;
      const nextFailures = result.streamStatus === 'online' ? 0 : previousFailures + 1;

      await pool.query(
        `UPDATE tv_channel
         SET "streamStatus" = $1,
             "lastCheckedAt" = now(),
             "lastStreamError" = $2,
             "consecutiveFailures" = $3
         WHERE id = $4`,
        [
          result.streamStatus === 'online' ? 'ONLINE' : 'OFFLINE',
          result.lastStreamError ?? null,
          nextFailures,
          ch.id,
        ]
      );

      if (result.streamStatus === 'online') online++;
      else {
        offline++;
        if (errors.length < 50) {
          errors.push({ name: ch.name, error: result.lastStreamError });
        }
      }
    }

    const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
    const rate = ((i + slice.length) / ((Date.now() - t0) / 1000)).toFixed(2);
    process.stdout.write(
      `\r   ${i + slice.length}/${channels.length} (${rate}/s, ${elapsed}s) · online=${online} offline=${offline}    `
    );
    await new Promise((r) => setTimeout(r, 50));
  }

  const totalSecs = ((Date.now() - t0) / 1000).toFixed(1);
  console.log('\n\n═══════════════════════════════════════════════════════');
  console.log(`  Tiempo total: ${totalSecs}s`);
  console.log(`  Online:  ${online} (${((online / channels.length) * 100).toFixed(1)}%)`);
  console.log(`  Offline: ${offline} (${((offline / channels.length) * 100).toFixed(1)}%)`);
  console.log('═══════════════════════════════════════════════════════');

  const summary = await pool.query(`
    SELECT "streamStatus", "isActive", count(*)::int AS n
    FROM tv_channel
    GROUP BY 1, 2
    ORDER BY n DESC
  `);
  console.log('\n— Estado final DB —');
  for (const r of summary.rows) {
    console.log(`  ${String(r.streamStatus).padEnd(8)} active=${String(r.isActive).padEnd(5)} → ${r.n}`);
  }

  const logPath = join(ROOT, 'tmp', 'tv-audits', `probe-fast-${stamp}.json`);
  const fs = await import('node:fs/promises');
  await fs.mkdir(dirname(logPath), { recursive: true });
  writeFileSync(
    logPath,
    JSON.stringify(
      {
        stamp,
        timeoutMs: TIMEOUT,
        batch: BATCH,
        statusFilter: onlyStatus,
        totals: { tried: channels.length, online, offline, totalSecs },
        errors,
        summary: summary.rows,
      },
      null,
      2
    ),
    'utf8'
  );
  console.log(`\n📄 ${logPath}\n`);

  await pool.end();
}

main().catch((err) => {
  console.error('FATAL:', err);
  process.exit(1);
});