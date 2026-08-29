#!/usr/bin/env node
/**
 * Limpieza de canales TV (Pasos 3 y 4 del plan).
 *
 * Reglas de desactivación (Paso 3) — solo cambia isActive=false:
 *   R1. language NOT IN ('es') AND isActive=true        → desactivar
 *   R2. lastStreamError matchea geo-bloqueo             → desactivar
 *   R3. consecutiveFailures >= threshold (default 2)    → desactivar
 *   R4. streamStatus = 'OFFLINE'                        → desactivar
 *   R5. Nombre matchea regex de canal brasileño         → desactivar
 *   R6. Nombre matchea regex de idioma no-español       → desactivar
 *   R7. Nombre matchea canales extranjeros conocidos    → desactivar
 *
 * Reglas de borrado (Paso 4) — DELETE físico:
 *   Solo canales isActive=false AND streamStatus='OFFLINE'
 *   AND lastCheckedAt < NOW() - days (default 7).
 *   SIEMPRE con backup previo.
 *
 * Uso:
 *   node scripts/cleanup-tv.mjs --dry-run                # ver qué se tocaría
 *   node scripts/cleanup-tv.mjs --skip-delete            # solo desactivar
 *   node scripts/cleanup-tv.mjs --only-delete            # solo borrar
 *   node scripts/cleanup-tv.mjs --apply                  # desactivar + borrar
 *   node scripts/cleanup-tv.mjs --threshold=3            # cambiar umbral
 *   node scripts/cleanup-tv.mjs --days=14                # cambiar días para borrar
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
  console.error('ERROR: DATABASE_URL no definida.');
  process.exit(1);
}

const args = process.argv.slice(2);
const getArg = (n, fb) => {
  const a = args.find((x) => x.startsWith(`--${n}=`));
  return a ? a.slice(n.length + 3) : fb;
};
const THRESHOLD = parseInt(getArg('threshold', '2'), 10);
const DAYS = parseInt(getArg('days', '7'), 10);
const dryRun = args.includes('--dry-run');
const apply = args.includes('--apply');
const onlyDelete = args.includes('--only-delete');
const skipDelete = args.includes('--skip-delete');

if (!dryRun && !apply) {
  console.log('⚠️  Sin --dry-run ni --apply: asumiendo --dry-run');
}
const EFFECTIVE_DRY = dryRun || !apply;

function timestamp() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}-${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}`;
}

// Regex de canales brasileños conocidos (audio en portugués) por nombre.
const BRAZILIAN_RE =
  /\b(globo tv|globonews|bandnews|bandamax|gnt|rede tv|sbt|multishow|sportv|telecine|combate|gloob|megapix|woohoo|futura|curta|rede brasil|tv brasil|canal brasil|espn brasil|record tv|rede record|cnn brasil|discovery kids br|cartoon network br|nickelodeon br|star channel br|paramount br|tnt br|warner br|fox brasil|cultura 24|cine premiere|tv off)\b/i;

// Nombres que indican que el canal NO está en español.
const NON_SPANISH_RE =
  /\b(english|arabic|french|hebrew|greek|italian|korean|turkish|turk|deutsch|german|chinese|japanese|polish|russian|portuguese|dutch|hindi|bulgarian|ukrainian|mongolian|hungarian|romanian|czech|slovak|swedish|norwegian|danish|finnish|vietnamese|thai|indonesian|malay|filipino|tagalog|urdu|bengali|swahili|persian|farsi|kurdish|azerbaijani|armenian|georgian|serbian|croatian|slovenian|bosnian|macedonian|albanian|lithuanian|latvian|estonian|catalan|basque|galician)\b/i;

// Canales extranjeros concretos frecuentes en listas IPTV.
const KNOWN_FOREIGN_RE =
  /\b(bfm tv|bharat24|cnbc mongolia|eagle news|etv|mnc|my-ukraina|bulgaria on air|euronews bulgaria|kinokazka|m1 hd|vision 6 tv|diaspora tv|telesur english|real madrid tv english|pop world tv|fox news channel|nbc news now|cnbc|bloomberg|cnn international|al jazeera|france 24 english|rt english|sky news|abc news|euronews english|cgtn|trt world|al arabiya|ary news|geo news|dawn news|hispantv|tv5 monde|arte|rt en espa\xc3\xb1ol|france 24 espa\xc3\xb1ol)\b/i;

// Geo-bloqueo
const GEO_RE = /geo.?block|access denied|not available in your|region|geo restriction/i;

const RULES = [
  { id: 'R1', label: "language != 'es'" },
  { id: 'R2', label: 'geo-bloqueado (lastStreamError)' },
  { id: 'R3', label: `consecutiveFailures >= ${THRESHOLD}` },
  { id: 'R4', label: "streamStatus = 'OFFLINE'" },
  { id: 'R5', label: 'nombre brasileño' },
  { id: 'R6', label: 'nombre no-español' },
  { id: 'R7', label: 'extranjero conocido' },
];

function evalRule(rule, row) {
  switch (rule.id) {
    case 'R1':
      return row.language != null && row.language !== 'es';
    case 'R2':
      return row.lastStreamError && GEO_RE.test(row.lastStreamError);
    case 'R3':
      return (row.consecutiveFailures ?? 0) >= THRESHOLD;
    case 'R4':
      return row.streamStatus === 'OFFLINE';
    case 'R5':
      return BRAZILIAN_RE.test(row.name ?? '');
    case 'R6':
      return NON_SPANISH_RE.test(row.name ?? '');
    case 'R7':
      return KNOWN_FOREIGN_RE.test(row.name ?? '');
    default:
      return false;
  }
}

async function main() {
  const stamp = timestamp();
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

  console.log('🎬 Pelis TV — Limpieza de canales\n');
  console.log(`Modo: ${EFFECTIVE_DRY ? '🔍 DRY-RUN (no se modifica nada)' : '🚨 APPLY (se aplican cambios)'}`);
  console.log(`Operación: ${onlyDelete ? 'solo borrado' : skipDelete ? 'solo desactivación' : 'desactivación + borrado'}`);
  console.log(`Threshold consecutiveFailures: ${THRESHOLD}`);
  console.log(`Días para borrado de OFFLINE viejos: ${DAYS}\n`);

  const candidates = [];
  const ruleHits = Object.fromEntries(RULES.map((r) => [r.id, 0]));

  if (!onlyDelete) {
    const allRes = await pool.query(
      `SELECT id, name, language, country, "streamStatus", "consecutiveFailures", "lastStreamError", "isActive", "isPopular"
       FROM tv_channel
       WHERE "isActive" = true`
    );

    for (const row of allRes.rows) {
      const hits = [];
      for (const r of RULES) {
        if (evalRule(r, row)) hits.push(r.id);
      }
      if (hits.length > 0) {
        candidates.push({
          id: row.id,
          name: row.name,
          country: row.country,
          status: row.streamStatus,
          failures: row.consecutiveFailures,
          hits,
        });
        for (const h of hits) ruleHits[h]++;
      }
    }
  }

  // Canales a borrar (Paso 4)
  const toDelete = [];
  if (!skipDelete) {
    const deleteRes = await pool.query(
      `SELECT id, name, "lastCheckedAt" FROM tv_channel
       WHERE "isActive" = false
         AND "streamStatus" = 'OFFLINE'
         AND "lastCheckedAt" IS NOT NULL
         AND "lastCheckedAt" < now() - ($1 || ' days')::interval`,
      [String(DAYS)]
    );
    toDelete.push(...deleteRes.rows);
  }

  // ── Reporte ────────────────────────────────────────────────────────
  console.log('═══════════════════════════════════════════════════════');
  console.log(`  Candidatos a DESACTIVAR: ${candidates.length}`);
  console.log('═══════════════════════════════════════════════════════');
  if (!onlyDelete) {
    console.log('— Hits por regla —');
    for (const r of RULES) {
      console.log(`  ${r.id} ${r.label.padEnd(40)} → ${ruleHits[r.id]}`);
    }
  }
  if (candidates.length > 0) {
    console.log('\n— Muestra (primeros 30) —');
    for (const c of candidates.slice(0, 30)) {
      console.log(`  [${c.hits.join(',')}] ${String(c.name).slice(0, 50).padEnd(50)} status=${c.status}`);
    }
    if (candidates.length > 30) {
      console.log(`  … y ${candidates.length - 30} más`);
    }
  }

  console.log('\n═══════════════════════════════════════════════════════');
  console.log(`  Candidatos a BORRAR (offline viejos >${DAYS}d): ${toDelete.length}`);
  console.log('═══════════════════════════════════════════════════════');
  if (toDelete.length > 0) {
    for (const d of toDelete.slice(0, 20)) {
      const last = new Date(d.lastCheckedAt).toISOString().slice(0, 16);
      console.log(`  · ${String(d.name).slice(0, 50)} (último check ${last})`);
    }
    if (toDelete.length > 20) {
      console.log(`  … y ${toDelete.length - 20} más`);
    }
  }

  // ── Ejecución ──────────────────────────────────────────────────────
  if (EFFECTIVE_DRY) {
    console.log('\n⚠️  DRY-RUN. Para aplicar:');
    const cmd = ['node', 'scripts/cleanup-tv.mjs', '--apply'];
    if (onlyDelete) cmd.push('--only-delete');
    else if (skipDelete) cmd.push('--skip-delete');
    cmd.push(`--threshold=${THRESHOLD}`, `--days=${DAYS}`);
    console.log(`  ${cmd.join(' ')}`);
    await pool.end();
    return;
  }

  if (candidates.length === 0 && toDelete.length === 0) {
    console.log('\n✅ Nada que modificar.');
    await pool.end();
    return;
  }

  // Backup antes de cualquier cambio
  if (!onlyDelete && candidates.length > 0) {
    const sqlPath = join(AUDITS_DIR, `backup-pre-cleanup-${stamp}.sql`);
    console.log(`\n💾 Backup previo a desactivación: ${sqlPath}`);
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
        { stdio: 'ignore' }
      );
      console.log('  ✓ Backup OK');
    } catch (err) {
      console.error(`  ✗ Backup falló: ${err.message}`);
      console.error('  Abortamos por seguridad.');
      await pool.end();
      process.exit(1);
    }
  }

  if (toDelete.length > 0) {
    const sqlPath = join(AUDITS_DIR, `backup-pre-delete-${stamp}.sql`);
    console.log(`\n💾 Backup previo a borrado: ${sqlPath}`);
    try {
      execFileSync(
        'pg_dump',
        [
          '--data-only',
          '--no-owner',
          '--no-privileges',
          '--table=tv_channel',
          '--file=' + sqlPath,
          process.env.DATABASE_URL,
        ],
        { stdio: 'ignore' }
      );
      console.log('  ✓ Backup OK');
    } catch (err) {
      console.error(`  ✗ Backup falló: ${err.message}`);
      console.error('  Abortamos por seguridad.');
      await pool.end();
      process.exit(1);
    }
  }

  // Desactivar
  if (candidates.length > 0) {
    const ids = candidates.map((c) => c.id);
    const res = await pool.query(
      `UPDATE tv_channel SET "isActive" = false WHERE id = ANY($1::text[])`,
      [ids]
    );
    console.log(`\n✓ Desactivados: ${res.rowCount}`);
  }

  // Borrar
  if (toDelete.length > 0) {
    const ids = toDelete.map((d) => d.id);
    const res = await pool.query(
      `DELETE FROM tv_channel WHERE id = ANY($1::text[])`,
      [ids]
    );
    console.log(`✓ Borrados: ${res.rowCount}`);
  }

  // Resumen final
  const summary = await pool.query(`
    SELECT "streamStatus", "isActive", count(*)::int AS n
    FROM tv_channel
    GROUP BY 1, 2
    ORDER BY n DESC
  `);
  console.log('\n— Estado final —');
  for (const r of summary.rows) {
    console.log(`  ${String(r.streamStatus).padEnd(8)} active=${String(r.isActive).padEnd(5)} → ${r.n}`);
  }

  // Log
  const logPath = join(AUDITS_DIR, `cleanup-${stamp}.json`);
  const fs = await import('node:fs/promises');
  await fs.mkdir(AUDITS_DIR, { recursive: true });
  writeFileSync(
    logPath,
    JSON.stringify(
      {
        stamp,
        threshold: THRESHOLD,
        days: DAYS,
        candidatesCount: candidates.length,
        candidatesSample: candidates.slice(0, 100),
        ruleHits,
        deleteCount: toDelete.length,
        deleteIds: toDelete.map((d) => d.id),
        summary: summary.rows,
      },
      null,
      2
    ),
    'utf8'
  );
  console.log(`\n📄 Log: ${logPath}\n`);

  await pool.end();
}

main().catch((err) => {
  console.error('FATAL:', err);
  process.exit(1);
});