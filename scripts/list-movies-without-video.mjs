#!/usr/bin/env node
/**
 * Lista todas las películas sin videoUrl en la base de datos.
 *
 *  - NO modifica la base. Solo lee.
 *  - Genera un CSV en tmp/movies-sin-video-<timestamp>.csv con todas las columnas.
 *  - Imprime en consola un resumen (total + primeras 10 filas).
 *
 *  Uso:
 *    node scripts/list-movies-without-video.mjs
 *
 *  Variables:
 *    DATABASE_URL en .env
 */

import { readFileSync, existsSync, mkdirSync } from 'node:fs';
import { writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const OUT_DIR = join(ROOT, 'tmp');

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
  mkdirSync(OUT_DIR, { recursive: true });
  const stamp = timestamp();
  const csvPath = join(OUT_DIR, `movies-sin-video-${stamp}.csv`);

  console.log('🎬 Pelis — Películas sin video\n');
  console.log(`Conexión: ${process.env.DATABASE_URL.replace(/:[^@]+@/, ':***@')}\n`);

  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

  const COLUMNS = [
    'id',
    'token',
    'name',
    'image',
    'genre',
    'releaseYear',
    'mediaType',
    'createdAt',
    'updatedAt',
  ];

  const { rows } = await pool.query(`
    SELECT ${COLUMNS.map((c) => `"${c}"`).join(', ')}
    FROM movie
    WHERE "videoUrl" IS NULL OR TRIM("videoUrl") = ''
    ORDER BY "createdAt" DESC, name ASC
  `);

  // CSV
  const csvLines = [COLUMNS.join(',')];
  for (const r of rows) {
    csvLines.push(COLUMNS.map((c) => csvEscape(r[c])).join(','));
  }
  writeFileSync(csvPath, csvLines.join('\n') + '\n', 'utf8');

  // Resumen en consola
  console.log(`Películas sin video: ${rows.length}`);
  console.log(`CSV: ${csvPath}\n`);

  const sample = rows.slice(0, 10);
  const idWidth = 12;
  const yearWidth = 6;
  const typeWidth = 7;
  const nameWidth = Math.max(
    4,
    ...sample.map((r) => String(r.name ?? '').length),
  );

  const pad = (s, w) => String(s ?? '').padEnd(w, ' ').slice(0, w);
  const header =
    pad('id', idWidth) +
    ' | ' +
    pad('name', nameWidth) +
    ' | ' +
    pad('year', yearWidth) +
    ' | ' +
    pad('type', typeWidth);

  console.log(header);
  console.log('-'.repeat(header.length));
  for (const r of sample) {
    const shortId = String(r.id ?? '').slice(0, idWidth - 1);
    console.log(
      pad(shortId, idWidth) +
        ' | ' +
        pad(r.name, nameWidth) +
        ' | ' +
        pad(r.releaseYear, yearWidth) +
        ' | ' +
        pad(r.mediaType, typeWidth),
    );
  }
  if (rows.length > sample.length) {
    console.log(`\n… y ${rows.length - sample.length} más en el CSV.`);
  }

  await pool.end();
}

main().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});