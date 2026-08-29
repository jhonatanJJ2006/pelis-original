#!/usr/bin/env node
/**
 * Promueve a populares canales verificados que están ONLINE y en español.
 *
 * Criterios:
 *  - isActive=true
 *  - streamStatus=ONLINE
 *  - language='es'
 *  - Categoría objetivo (Noticias, Entretenimiento, Deportes, Películas, Series, Música, Documentales)
 *  - Nombre que sugiera calidad (Pluto TV, nombres conocidos, marcas fuertes)
 *  - Priorizar feeds con URLs Pluto TV (jmp2.uk) que son los más estables
 *
 *  Por defecto marca hasta N canales por categoría (default 5).
 *
 *  Uso:
 *    node scripts/promote-popular.mjs --dry-run
 *    node scripts/promote-popular.mjs --apply
 *    node scripts/promote-popular.mjs --per-category=3
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

if (!process.env.DATABASE_URL) {
  console.error('ERROR: DATABASE_URL no definida.');
  process.exit(1);
}

const args = process.argv.slice(2);
const getArg = (n, fb) => {
  const a = args.find((x) => x.startsWith(`--${n}=`));
  return a ? a.slice(n.length + 3) : fb;
};
const dryRun = args.includes('--dry-run');
const apply = args.includes('--apply');
const perCategory = parseInt(getArg('per-category', '5'), 10);

if (!dryRun && !apply) {
  console.log('⚠️  Sin --dry-run ni --apply: asumiendo --dry-run');
}
const EFFECTIVE_DRY = dryRun || !apply;

const TARGET_CATEGORIES = [
  'Noticias',
  'Entretenimiento',
  'Deportes',
  'Películas',
  'Series',
  'Música',
  'Documentales',
];

// Marcas/calidad conocidas que priorizamos
const PRIORITY_PATTERNS = [
  /pluto tv/i,
  /pluto tv latam/i,
  /pluto tv/i,
  /\bbbc\b/i,
  /\bcnn\b/i,
  /\bespn\b/i,
  /\bfox\b/i,
  /\bnat geo\b/i,
  /\bnational geographic\b/i,
  /\bhistory\b/i,
  /\bdiscovery\b/i,
  /\bmtv\b/i,
  /\bhbo\b/i,
  /\bnetflix\b/i,
];

async function main() {
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  console.log('🎬 Pelis TV — Promover canales a populares\n');
  console.log(`Modo: ${EFFECTIVE_DRY ? '🔍 DRY-RUN' : '🚨 APPLY'}`);
  console.log(`Por categoría: ${perCategory}`);
  console.log(`Categorías: ${TARGET_CATEGORIES.join(', ')}\n`);

  const toPromote = [];

  for (const cat of TARGET_CATEGORIES) {
    const res = await pool.query(
      `SELECT id, name, category, country, "streamUrl", "isPopular"
       FROM tv_channel
       WHERE "isActive" = true
         AND "streamStatus" = 'ONLINE'
         AND language = 'es'
         AND category = $1
         AND "isPopular" = false
       ORDER BY
         (CASE WHEN "streamUrl" LIKE '%jmp2.uk%' THEN 0 ELSE 1 END),
         (CASE WHEN "streamUrl" LIKE '%pluto%' THEN 0 ELSE 1 END),
         name ASC
       LIMIT $2`,
      [cat, perCategory]
    );
    if (res.rowCount > 0) {
      toPromote.push(...res.rows.map((r) => ({ ...r, targetCategory: cat })));
    }
  }

  console.log('═══════════════════════════════════════════════════════');
  console.log(`  Canales a promover a populares: ${toPromote.length}`);
  console.log('═══════════════════════════════════════════════════════\n');

  const byCategory = {};
  for (const ch of toPromote) {
    if (!byCategory[ch.targetCategory]) byCategory[ch.targetCategory] = [];
    byCategory[ch.targetCategory].push(ch);
  }

  for (const cat of TARGET_CATEGORIES) {
    const list = byCategory[cat] ?? [];
    console.log(`— ${cat.padEnd(20)} (${list.length}) —`);
    for (const ch of list) {
      const tag = ch.streamUrl.includes('jmp2.uk') ? '🛰️' : '🌐';
      console.log(`  ${tag} ${ch.name} (${ch.country ?? '∅'})`);
    }
    if (list.length === 0) console.log('  (sin candidatos)');
    console.log('');
  }

  if (EFFECTIVE_DRY) {
    console.log('⚠️  DRY-RUN. Para aplicar:');
    console.log(`  node scripts/promote-popular.mjs --apply --per-category=${perCategory}`);
    await pool.end();
    return;
  }

  if (toPromote.length === 0) {
    console.log('✅ Nada que promover.');
    await pool.end();
    return;
  }

  const ids = toPromote.map((c) => c.id);
  const result = await pool.query(
    `UPDATE tv_channel SET "isPopular" = true WHERE id = ANY($1::text[])`,
    [ids]
  );
  console.log(`\n✓ Promovidos a populares: ${result.rowCount}`);

  // Resumen
  const summary = await pool.query(`
    SELECT category, count(*) FILTER (WHERE "isPopular") AS popular,
           count(*) FILTER (WHERE "isActive" AND "streamStatus" = 'ONLINE') AS active_online
    FROM tv_channel
    WHERE language = 'es'
    GROUP BY category
    ORDER BY popular DESC, active_online DESC
  `);
  console.log('\n— Distribución populares por categoría (español) —');
  for (const r of summary.rows) {
    if (r.popular > 0 || r.active_online > 30) {
      console.log(`  ${String(r.category).padEnd(22)} pop=${String(r.popular).padStart(3)} · active=${r.active_online}`);
    }
  }

  await pool.end();
}

main().catch((err) => {
  console.error('FATAL:', err);
  process.exit(1);
});