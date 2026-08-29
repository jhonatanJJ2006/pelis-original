#!/usr/bin/env node
/**
 * Auditoría de canales TV (Paso 1 del plan de limpieza).
 *
 *  - NO modifica la base de datos.
 *  - Genera:
 *      • audit-tv-YYYYMMDD-HHMMSS.csv   → todas las filas con detalle
 *      • audit-tv-YYYYMMDD-HHMMSS.json  → resumen + agregados
 *      • backup-tv-channel-YYYYMMDD-HHMMSS.sql  → dump SQL de tv_channel + tv_playlist
 *
 *  Uso:
 *    node scripts/audit-tv-channels.mjs
 *
 *  Variables:
 *    DATABASE_URL en .env
 */

import { readFileSync, existsSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const AUDITS_DIR = join(ROOT, 'tmp', 'tv-audits');

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
  console.error('ERROR: DATABASE_URL no definida. Revisá .env');
  process.exit(1);
}

function timestamp() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}-${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}`;
}

function csvEscape(value) {
  if (value === null || value === undefined) return '';
  const s = String(value);
  if (/[",\n\r]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

async function main() {
  const stamp = timestamp();
  const csvPath = join(AUDITS_DIR, `audit-tv-${stamp}.csv`);
  const jsonPath = join(AUDITS_DIR, `audit-tv-${stamp}.json`);
  const sqlPath = join(AUDITS_DIR, `backup-tv-channel-${stamp}.sql`);

  // Asegurar directorio
  const fs = await import('node:fs/promises');
  await fs.mkdir(AUDITS_DIR, { recursive: true });

  console.log('🎬 Pelis TV — Auditoría de canales\n');
  console.log(`Stamping archivos con: ${stamp}`);
  console.log(`Conexión: ${process.env.DATABASE_URL.replace(/:[^@]+@/, ':***@')}\n`);

  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

  // ── 1. Conteos globales ────────────────────────────────────────────
  console.log('📊 Conteo global…');
  const global = await pool.query(`
    SELECT
      count(*)::int AS total,
      count(*) FILTER (WHERE "isActive")::int AS active,
      count(*) FILTER (WHERE "isPopular")::int AS popular,
      count(*) FILTER (WHERE "streamStatus" = 'ONLINE')::int   AS online,
      count(*) FILTER (WHERE "streamStatus" = 'OFFLINE')::int  AS offline,
      count(*) FILTER (WHERE "streamStatus" = 'UNKNOWN')::int  AS unknown
    FROM tv_channel
  `);
  const g = global.rows[0];

  // ── 2. Distribución por idioma (solo activos) ──────────────────────
  const byLang = await pool.query(`
    SELECT coalesce(language, '∅ (null)') AS language, count(*)::int AS n
    FROM tv_channel
    WHERE "isActive" = true
    GROUP BY 1
    ORDER BY n DESC
  `);

  // ── 3. Distribución por país (solo activos) ────────────────────────
  const byCountry = await pool.query(`
    SELECT coalesce(country, '∅ (null)') AS country, count(*)::int AS n
    FROM tv_channel
    WHERE "isActive" = true
    GROUP BY 1
    ORDER BY n DESC
    LIMIT 30
  `);

  // ── 4. Distribución por status × active ────────────────────────────
  const byStatusActive = await pool.query(`
    SELECT "streamStatus" AS status, "isActive" AS active, count(*)::int AS n
    FROM tv_channel
    GROUP BY 1, 2
    ORDER BY n DESC
  `);

  // ── 5. Geo-bloqueos detectados ─────────────────────────────────────
  const geoBlocked = await pool.query(`
    SELECT count(*)::int AS n
    FROM tv_channel
    WHERE "isActive" = true
      AND "lastStreamError" IS NOT NULL
      AND "lastStreamError" ~* 'geo.?block|access denied|not available in your|region'
  `);

  // ── 6. Top errores ─────────────────────────────────────────────────
  const topErrors = await pool.query(`
    SELECT "lastStreamError" AS error, count(*)::int AS n
    FROM tv_channel
    WHERE "lastStreamError" IS NOT NULL
    GROUP BY 1
    ORDER BY n DESC
    LIMIT 15
  `);

  // ── 7. Listados M3U ────────────────────────────────────────────────
  const playlists = await pool.query(`
    SELECT id, name, "m3uUrl", country, language, "isActive",
           "lastImportedAt", "totalChannels"
    FROM tv_playlist
    ORDER BY "createdAt" DESC
  `);

  // ── 8. Filas completas → CSV ───────────────────────────────────────
  console.log('📝 Exportando CSV detallado…');
  const allRows = await pool.query(`
    SELECT
      id, name, category, country, language, "tvgId", "streamUrl",
      source, "isActive", "isPopular", "streamStatus",
      "consecutiveFailures", "lastCheckedAt", "lastStreamError",
      "sortOrder", "createdAt", "updatedAt"
    FROM tv_channel
    ORDER BY "isActive" DESC, "isPopular" DESC, name ASC
  `);

  const headers = [
    'id', 'name', 'category', 'country', 'language', 'tvgId',
    'streamUrl', 'source', 'isActive', 'isPopular', 'streamStatus',
    'consecutiveFailures', 'lastCheckedAt', 'lastStreamError',
    'sortOrder', 'createdAt', 'updatedAt',
  ];
  const csvLines = [headers.join(',')];
  for (const r of allRows.rows) {
    csvLines.push(headers.map((h) => csvEscape(r[h])).join(','));
  }
  writeFileSync(csvPath, csvLines.join('\n'), 'utf8');

  // ── 9. Backup SQL ──────────────────────────────────────────────────
  console.log('💾 Generando backup SQL (tv_channel + tv_playlist)…');
  try {
    execFileSync(
      'pg_dump',
      [
        '--data-only',
        '--no-owner',
        '--no-privileges',
        '--table=tv_channel',
        '--table=tv_playlist',
        '--file=' + sqlPath,
        process.env.DATABASE_URL,
      ],
      { stdio: 'inherit' }
    );
  } catch (err) {
    console.warn(`⚠️  No se pudo generar el backup SQL: ${err.message}`);
    console.warn('    Continuamos igual (el CSV sí se generó).');
  }

  // ── 10. Resumen JSON ───────────────────────────────────────────────
  const summary = {
    stamp,
    databaseUrlHost: new URL(process.env.DATABASE_URL).host,
    global: g,
    byLanguageActive: byLang.rows,
    byCountryActive: byCountry.rows,
    byStatusActive: byStatusActive.rows,
    geoBlockedActive: geoBlocked.rows[0].n,
    topErrors: topErrors.rows,
    playlists: playlists.rows.map((p) => ({
      id: p.id,
      name: p.name,
      country: p.country,
      language: p.language,
      isActive: p.isActive,
      lastImportedAt: p.lastImportedAt,
      totalChannels: p.totalChannels,
      m3uUrl: p.m3uUrl,
    })),
    files: {
      csv: csvPath,
      json: jsonPath,
      sql: sqlPath,
    },
    totalChannels: allRows.rowCount,
  };
  writeFileSync(jsonPath, JSON.stringify(summary, null, 2), 'utf8');

  await pool.end();

  // ── Reporte en pantalla ────────────────────────────────────────────
  console.log('\n═══════════════════════════════════════════════════════');
  console.log('  REPORTE DE AUDITORÍA — TV en vivo');
  console.log('═══════════════════════════════════════════════════════');
  console.log(`Total canales:        ${g.total}`);
  console.log(`  · Activos:          ${g.active}`);
  console.log(`  · Populares:        ${g.popular}`);
  console.log(`  · ONLINE:           ${g.online}`);
  console.log(`  · OFFLINE:          ${g.offline}`);
  console.log(`  · UNKNOWN:          ${g.unknown}`);
  console.log(`Geo-bloqueos activos: ${summary.geoBlockedActive}`);

  console.log('\n— Distribución por idioma (solo activos) —');
  for (const r of byLang.rows) {
    console.log(`  ${String(r.language).padEnd(12)} ${String(r.n).padStart(5)}`);
  }

  console.log('\n— Top 15 países (solo activos) —');
  for (const r of byCountry.rows.slice(0, 15)) {
    console.log(`  ${String(r.country).padEnd(22)} ${String(r.n).padStart(5)}`);
  }

  if (topErrors.rowCount > 0) {
    console.log('\n— Top errores (todos los canales) —');
    for (const r of topErrors.rows) {
      const err = String(r.error).slice(0, 80);
      console.log(`  ${String(r.n).padStart(5)} × ${err}`);
    }
  }

  console.log('\n— Listas M3U registradas —');
  if (playlists.rowCount === 0) {
    console.log('  (ninguna)');
  } else {
    for (const p of playlists.rows) {
      const last = p.lastImportedAt ? new Date(p.lastImportedAt).toISOString().slice(0, 16) : '—';
      console.log(
        `  · ${p.name.padEnd(28)} país=${String(p.country ?? '∅').padEnd(10)} ` +
        `lang=${String(p.language ?? '∅').padEnd(4)} activa=${p.isActive ? 'sí' : 'no'} ` +
        `última=${last} canales=${p.totalChannels ?? '—'}`
      );
    }
  }

  console.log('\n═══════════════════════════════════════════════════════');
  console.log('Archivos generados:');
  console.log(`  CSV:  ${csvPath}`);
  console.log(`  JSON: ${jsonPath}`);
  console.log(`  SQL:  ${sqlPath}`);
  console.log('═══════════════════════════════════════════════════════\n');
}

main().catch((err) => {
  console.error('FATAL:', err);
  process.exit(1);
});