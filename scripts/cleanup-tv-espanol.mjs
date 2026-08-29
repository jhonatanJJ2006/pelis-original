#!/usr/bin/env node
/**
 * Limpieza de canales TV:
 *  1. Prueba los canales con estado UNKNOWN y actualiza su estado real.
 *  2. Desactiva (isActive=false) los canales que NO sean español latino:
 *     - language != 'es'
 *     - nombres de canales brasileños (portugués)
 *     - nombres que indican otro idioma (English, Arabic, French, Hebrew, etc.)
 *  3. Desactiva los canales OFFLINE (no disponibles).
 *
 * Uso: node scripts/cleanup-tv-espanol.mjs
 * Requiere DATABASE_URL en .env
 */

import { readFileSync, existsSync } from 'node:fs';
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

const PROBE_TIMEOUT_MS = 12000;

async function probeUpstream(streamUrl) {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), PROBE_TIMEOUT_MS);
    const response = await fetch(streamUrl, {
      method: 'GET',
      redirect: 'follow',
      signal: controller.signal,
      headers: {
        Accept: '*/*',
        'User-Agent': 'Mozilla/5.0 (compatible; PelisTV-Probe/1.0; +https://verpelis.pro)',
        'Cache-Control': 'no-store',
      },
    });
    clearTimeout(timeout);
    if (!response.ok) {
      let detail = `HTTP ${response.status}`;
      try {
        const text = await response.text();
        if (text.length < 200) detail = `${response.status}: ${text.replace(/\s+/g, ' ').trim()}`;
      } catch {}
      return { streamStatus: 'offline', lastStreamError: detail };
    }
    const finalUrl = response.url || streamUrl;
    const contentType = response.headers.get('content-type') ?? '';
    const isManifest =
      contentType.includes('mpegurl') ||
      contentType.includes('x-mpegURL') ||
      finalUrl.toLowerCase().includes('.m3u8');
    if (!isManifest) return { streamStatus: 'online' };
    const text = await response.text();
    if (!text.startsWith('#EXTM3U') && !text.includes('#EXT-X-')) {
      return { streamStatus: 'offline', lastStreamError: 'Respuesta no es un manifiesto M3U8 válido' };
    }
    if (!text.includes('#EXTINF') && !text.includes('#EXT-X-STREAM-INF')) {
      return { streamStatus: 'offline', lastStreamError: 'Manifiesto sin segmentos de video' };
    }
    return { streamStatus: 'online' };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error de conexión';
    return { streamStatus: 'offline', lastStreamError: message };
  }
}

// Canales brasileños conocidos (audio en portugués) identificados por nombre/host.
const BRAZILIAN_RE =
  /(?:\y(?:globo tv|globonews|bandnews|bandamax|gnt|rede tv|sbt|multishow|sportv|telecine|combate|gloob|megapix|woohoo|futura|curta|rede brasil|tv brasil|canal brasil|espn brasil|record tv|rede record|cnn brasil|discovery kids br|cartoon network br|nickelodeon br|star channel br|paramount br|tnt br|warner br|fox brasil|cultura 24|cine premiere|tv off)\y|gloob)/i;

// Nombres que indican que el canal NO está en español.
const NON_SPANISH_RE =
  /\y(english|arabic|french|hebrew|greek|italian|korean|turkish|turk|deutsch|german|chinese|japanese|polish|russian|portuguese|dutch|hindi|bulgarian|ukrainian|mongolian|hungarian|romanian|czech|slovak|swedish|norwegian|danish|finnish|vietnamese|thai|indonesian|malay|filipino|tagalog|urdu|bengali|swahili|persian|farsi|kurdish|azerbaijani|armenian|georgian|serbian|croatian|slovenian|bosnian|macedonian|albanian|lithuanian|latvian|estonian|catalan|basque|galician)\y/i;

// Canales extranjeros concretos detectados en la lista (nombres corruptos del M3U).
const KNOWN_FOREIGN_RE =
  /\y(bfm|bharat24|cnbc mongolia|eagle news|etv|mnc|my-ukraina|bulgaria on air|euronews bulgaria|kinokazka|m1 hd|vision 6 tv|diaspora tv|telesur english|real madrid tv english|pop world tv|fox news|fox news radio|livenow from fox|fox news channel)\y/i;

async function main() {
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  const dryRun = process.argv.includes('--dry-run');

  // ── 1. Probar UNKNOWN ──────────────────────────────────────────────
  const unknown = await pool.query(
    'SELECT id, name, "streamUrl" FROM tv_channel WHERE "streamStatus" = $1',
    ['UNKNOWN']
  );
  console.log(`Probando ${unknown.rowCount} canales UNKNOWN...`);
  let unknownOnline = 0;
  let unknownOffline = 0;
  for (const ch of unknown.rows) {
    const result = await probeUpstream(ch.streamUrl);
    if (!dryRun) {
      await pool.query(
        'UPDATE tv_channel SET "streamStatus" = $1, "lastCheckedAt" = now(), "lastStreamError" = $2 WHERE id = $3',
        [result.streamStatus === 'online' ? 'ONLINE' : 'OFFLINE', result.lastStreamError ?? null, ch.id]
      );
    }
    if (result.streamStatus === 'online') unknownOnline++;
    else unknownOffline++;
    console.log(`  ${result.streamStatus === 'online' ? 'OK ' : 'OFF'} ${ch.name}`);
  }
  console.log(`UNKNOWN → ${unknownOnline} online, ${unknownOffline} offline`);

  // ── 2. Desactivar canales no-español / brasileños ──────────────────
  const noEspanol = await pool.query(
    `SELECT id, name, language FROM tv_channel
     WHERE "isActive" = true AND (language IS DISTINCT FROM 'es')`
  );
  console.log(`Canales con language != 'es': ${noEspanol.rowCount}`);

  const brazilian = await pool.query(
    `SELECT id, name FROM tv_channel WHERE "isActive" = true AND name ~* $1`,
    [BRAZILIAN_RE.source]
  );
  console.log(`Canales brasileños por nombre: ${brazilian.rowCount}`);
  for (const r of brazilian.rows) console.log(`  BR ${r.name}`);

  const nonSpanish = await pool.query(
    `SELECT id, name FROM tv_channel WHERE "isActive" = true AND name ~* $1`,
    [NON_SPANISH_RE.source]
  );
  console.log(`Canales no-español por nombre: ${nonSpanish.rowCount}`);
  for (const r of nonSpanish.rows) console.log(`  NES ${r.name}`);

  const knownForeign = await pool.query(
    `SELECT id, name FROM tv_channel WHERE "isActive" = true AND name ~* $1`,
    [KNOWN_FOREIGN_RE.source]
  );
  console.log(`Canales extranjeros conocidos: ${knownForeign.rowCount}`);
  for (const r of knownForeign.rows) console.log(`  KF ${r.name}`);

  const idsToDeactivate = new Set([
    ...noEspanol.rows.map((r) => r.id),
    ...brazilian.rows.map((r) => r.id),
    ...nonSpanish.rows.map((r) => r.id),
    ...knownForeign.rows.map((r) => r.id),
  ]);

  if (!dryRun && idsToDeactivate.size > 0) {
    const res = await pool.query(
      `UPDATE tv_channel SET "isActive" = false WHERE id = ANY($1::text[])`,
      [[...idsToDeactivate]]
    );
    console.log(`Desactivados por idioma: ${res.rowCount}`);
  }

  // ── 3. Desactivar OFFLINE (no disponibles) ─────────────────────────
  const offline = await pool.query(
    `SELECT id FROM tv_channel WHERE "isActive" = true AND "streamStatus" = 'OFFLINE'`
  );
  console.log(`Canales OFFLINE activos: ${offline.rowCount}`);
  if (!dryRun && offline.rowCount > 0) {
    const res = await pool.query(
      `UPDATE tv_channel SET "isActive" = false WHERE id = ANY($1::text[])`,
      [offline.rows.map((r) => r.id)]
    );
    console.log(`Desactivados OFFLINE: ${res.rowCount}`);
  }

  // ── Resumen final ──────────────────────────────────────────────────
  const summary = await pool.query(
    `SELECT "streamStatus", "isActive", count(*) AS n FROM tv_channel GROUP BY 1, 2 ORDER BY 3 DESC`
  );
  console.log('\nResumen final:');
  for (const r of summary.rows) {
    console.log(`  ${r.streamStatus} isActive=${r.isActive} → ${r.n}`);
  }

  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});