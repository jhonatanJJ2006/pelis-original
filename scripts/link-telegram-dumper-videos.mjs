#!/usr/bin/env node
/**
 * Link Telegram dumper .mp4 media → catalog movies that are missing videoUrl.
 *
 * Only updates rows where videoUrl IS NULL OR empty (same SQL as
 * scripts/list-movies-without-video.mjs). Does NOT create catalog rows.
 *
 * Symlinks `{outputRoot}/{token}/{token}/video.mp4` → dumper media, then sets
 * videoUrl to `/api/stream/${token}/${token}/video.mp4`. Postgres via DATABASE_URL + pg.
 *
 * Usage:
 *   node scripts/link-telegram-dumper-videos.mjs
 *   node scripts/link-telegram-dumper-videos.mjs --apply
 *   node scripts/link-telegram-dumper-videos.mjs --limit 20
 *   node scripts/link-telegram-dumper-videos.mjs --messages-jsonl=/path/to/messages.jsonl
 *   node scripts/link-telegram-dumper-videos.mjs --no-report
 */

import {
  readFileSync,
  existsSync,
  mkdirSync,
  writeFileSync,
  symlinkSync,
  lstatSync,
  realpathSync,
  unlinkSync,
  createReadStream,
} from 'node:fs';
import { createInterface } from 'node:readline';
import { join, dirname, resolve, isAbsolute } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

const {
  parseCaptionMeta,
  indexMoviesByNormalizedName,
  matchDumperToMovie,
  nestedMp4VideoUrl,
  relativeMp4Path,
  normalizeTitle,
} = await import(pathToFileURL(join(__dirname, 'lib/telegram-dumper-match.mjs')).href);

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

function getOutputRoots() {
  const multi = process.env.MOVIE_OUTPUT_ROOTS?.split(':').map((r) => r.trim()).filter(Boolean);
  if (multi?.length) return multi;
  const single = process.env.MOVIE_OUTPUT_ROOT?.trim();
  if (single) return [single];
  return ['/run/media/det/Pelis-A/output', '/run/media/det/Pelis-B/output'];
}

function timestamp() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}-${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}`;
}

function csvEscape(value) {
  if (value === null || value === undefined) return '';
  const s = String(value);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function parseArgs(argv) {
  const apply = argv.includes('--apply');
  const dryRun = !apply;
  let limit = null;
  let messagesJsonl = null;
  let report = !argv.includes('--no-report');
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--limit=')) limit = Number(a.slice('--limit='.length));
    else if (a === '--limit') limit = Number(argv[++i]);
    else if (a.startsWith('--messages-jsonl=')) messagesJsonl = a.slice('--messages-jsonl='.length);
  }
  return {
    dryRun,
    apply,
    limit: Number.isFinite(limit) && limit > 0 ? limit : null,
    messagesJsonl,
    report,
  };
}
function resolveMessagesPath(custom) {
  if (custom) return resolve(custom);
  const candidates = [
    join(ROOT, 'tools/telegram-dumper/data/messages.jsonl'),
    resolve(ROOT, '../pelis-original/tools/telegram-dumper/data/messages.jsonl'),
    '/home/det/Desktop/PELIS/pelis-original/tools/telegram-dumper/data/messages.jsonl',
  ];
  for (const c of candidates) {
    if (existsSync(c)) return c;
  }
  return candidates[0];
}
function resolveMediaPath(mediaPath, messagesPath) {
  if (!mediaPath) return null;
  if (isAbsolute(mediaPath) && existsSync(mediaPath)) return mediaPath;
  const mediaRoot = join(dirname(messagesPath), 'media');
  const base = mediaPath.split(/[\/\\]/).pop();
  const local = join(mediaRoot, base);
  if (existsSync(local)) return local;
  if (isAbsolute(mediaPath)) return mediaPath;
  return local;
}

function pickWritableRootSync(roots) {
  for (const root of roots) {
    try {
      if (!existsSync(root)) continue;
      const probe = join(root, `.pelis-write-probe-${process.pid}`);
      writeFileSync(probe, 'ok');
      try { unlinkSync(probe); } catch { /* ignore */ }
      return root;
    } catch {
      /* try next */
    }
  }
  return null;
}

async function loadPg() {
  try {
    return (await import('pg')).default;
  } catch {
    const alts = [
      resolve(ROOT, '../pelis-original/node_modules/pg/esm/index.js'),
      '/home/det/Desktop/PELIS/pelis-original/node_modules/pg/esm/index.js',
    ];
    for (const p of alts) {
      if (existsSync(p)) return (await import(pathToFileURL(p).href)).default;
    }
    throw new Error('Cannot import pg. Ensure node_modules (pnpm install) or sibling pelis-original install.');
  }
}

async function loadMp4Messages(messagesPath) {
  const rl = createInterface({ input: createReadStream(messagesPath, { encoding: 'utf8' }) });
  const out = [];
  for await (const line of rl) {
    if (!line.trim()) continue;
    let m;
    try { m = JSON.parse(line); } catch { continue; }
    if (!m.media_path || !/\.mp4$/i.test(m.media_path)) continue;
    if (m.sticker) continue;
    if (!(m.text ?? '').trim()) continue;
    out.push(m);
  }
  return out;
}

function pathExistsLoose(p) {
  try { lstatSync(p); return true; } catch { return false; }
}

function ensureSymlink(targetAbs, linkAbs) {
  mkdirSync(dirname(linkAbs), { recursive: true });
  if (pathExistsLoose(linkAbs)) {
    try {
      const st = lstatSync(linkAbs);
      if (st.isSymbolicLink()) {
        try {
          const cur = realpathSync(linkAbs);
          if (cur === realpathSync(targetAbs)) return { ok: true, action: 'exists-same' };
          return { ok: false, action: 'exists-other-symlink', current: cur };
        } catch {
          return { ok: false, action: 'dangling-symlink' };
        }
      }
      if (st.isFile()) return { ok: true, action: 'exists-file' };
      return { ok: false, action: 'exists-other' };
    } catch {
      /* fall through */
    }
  }
  symlinkSync(targetAbs, linkAbs);
  return { ok: true, action: 'created' };
}

async function main() {
  loadEnv();
  const args = parseArgs(process.argv.slice(2));
  const messagesPath = resolveMessagesPath(args.messagesJsonl);
  const roots = getOutputRoots();
  const OUT_DIR = join(ROOT, 'tmp');
  mkdirSync(OUT_DIR, { recursive: true });

  console.log('Pelis — Link Telegram dumper videos → catalog (missing videoUrl only)\n');
  console.log(`Mode: ${args.dryRun ? 'DRY-RUN' : 'APPLY'}`);
  console.log(`messages: ${messagesPath}`);
  console.log(`output roots: ${roots.join(' | ')}`);
  if (process.env.DATABASE_URL) {
    console.log(`DB: ${process.env.DATABASE_URL.replace(/:[^@]+@/, ':***@')}`);
  } else {
    console.error('ERROR: DATABASE_URL no definida. Revisá .env');
    process.exit(1);
  }
  if (!existsSync(messagesPath)) {
    console.error(`ERROR: messages.jsonl no encontrado en ${messagesPath}`);
    process.exit(1);
  }

  const pg = await loadPg();
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

  const COLUMNS = ['id', 'token', 'name', 'releaseYear', 'mediaType', 'videoUrl'];
  const { rows: missing } = await pool.query(`
    SELECT ${COLUMNS.map((c) => `"${c}"`).join(', ')}
    FROM movie
    WHERE "videoUrl" IS NULL OR TRIM("videoUrl") = ''
    ORDER BY "createdAt" DESC, name ASC
  `);

  console.log(`\nCatalog movies missing videoUrl: ${missing.length}`);

  const byNorm = indexMoviesByNormalizedName(missing);
  const messages = await loadMp4Messages(messagesPath);
  console.log(`Dumper mp4 messages with text: ${messages.length}`);

  const writableRoot = pickWritableRootSync(roots);
  if (writableRoot) console.log(`Writable output root: ${writableRoot}`);
  else console.log('WARNING: no writable output root — matches only; symlink skipped');

  const stats = {
    scanned: 0,
    mediaMissing: 0,
    matched: 0,
    skippedAmbiguous: 0,
    skippedNoMatch: 0,
    skippedYearMismatch: 0,
    skippedAlreadyPlanned: 0,
    diskOk: 0,
    diskSkipped: 0,
    dbUpdated: 0,
  };

  const plannedByMovieId = new Map();
  const reportRows = [];

  for (const msg of messages) {
    stats.scanned++;
    const mediaAbs = resolveMediaPath(msg.media_path, messagesPath);
    if (!mediaAbs || !existsSync(mediaAbs)) {
      stats.mediaMissing++;
      continue;
    }

    const meta = parseCaptionMeta(msg.text);
    const result = matchDumperToMovie(meta, byNorm);

    if (!result.movie) {
      if (result.reason === 'ambiguous' || result.reason === 'ambiguous-year' || result.reason === 'ambiguous-or-year') {
        stats.skippedAmbiguous++;
      } else if (result.reason === 'year-mismatch') {
        stats.skippedYearMismatch++;
      } else {
        stats.skippedNoMatch++;
      }
      continue;
    }

    const movie = result.movie;
    if (plannedByMovieId.has(movie.id)) {
      stats.skippedAlreadyPlanned++;
      continue;
    }

    const plan = {
      movieId: movie.id,
      token: movie.token,
      name: movie.name,
      releaseYear: movie.releaseYear,
      msgId: msg.id,
      mediaAbs,
      mediaSize: msg.media_size ?? null,
      videoUrl: nestedMp4VideoUrl(movie.token),
      rel: relativeMp4Path(movie.token),
      reason: result.reason,
      via: result.via ?? meta.titles[0],
      captionYear: meta.year,
      caption: meta.rawFirstLine.slice(0, 160),
    };
    plannedByMovieId.set(movie.id, plan);
    stats.matched++;
    if (args.limit && plannedByMovieId.size >= args.limit) break;
  }

  const plans = [...plannedByMovieId.values()];
  console.log(`\nUnique matches (missing-video catalog ∩ dumper): ${plans.length}`);

  for (const plan of plans) {
    let diskAction = 'skipped-no-root';
    if (writableRoot) {
      const linkAbs = join(writableRoot, plan.rel);
      if (args.dryRun) {
        diskAction = existsSync(linkAbs) ? 'dry-run-exists' : 'dry-run-would-symlink';
        stats.diskOk++;
      } else {
        try {
          const res = ensureSymlink(plan.mediaAbs, linkAbs);
          diskAction = res.action;
          if (res.ok) stats.diskOk++;
          else {
            stats.diskSkipped++;
            diskAction = `fail:${res.action}`;
          }
        } catch (err) {
          stats.diskSkipped++;
          diskAction = `error:${err.message}`;
        }
      }
    } else {
      stats.diskSkipped++;
    }

    let dbAction = 'dry-run';
    if (!args.dryRun) {
      if (diskAction.startsWith('fail:') || diskAction.startsWith('error:') || diskAction === 'skipped-no-root') {
        dbAction = 'skipped-no-disk';
      } else {
        const upd = await pool.query(
          `UPDATE movie SET "videoUrl" = $1, "updatedAt" = NOW() WHERE id = $2 AND ("videoUrl" IS NULL OR TRIM("videoUrl") = '')`,
          [plan.videoUrl, plan.movieId],
        );
        dbAction = upd.rowCount === 1 ? 'updated' : 'skipped-race';
        if (upd.rowCount === 1) stats.dbUpdated++;
      }
    }

    reportRows.push({ ...plan, diskAction, dbAction, normalizeProbe: normalizeTitle(plan.name) });
  }

  console.log('\nSample matches (up to 15):');
  for (const r of reportRows.slice(0, 15)) {
    console.log(`  ${r.token} | ${r.name} (${r.releaseYear ?? '?'}) ← msg ${r.msgId} [${r.reason}] → ${r.videoUrl}`);
  }

  console.log('\n--- Stats ---');
  console.log(JSON.stringify(stats, null, 2));

  if (args.report) {
    const stamp = timestamp();
    const csvPath = join(OUT_DIR, `link-telegram-dumper-${stamp}.csv`);
    const cols = [
      'movieId', 'token', 'name', 'releaseYear', 'msgId', 'mediaAbs', 'mediaSize',
      'videoUrl', 'reason', 'via', 'captionYear', 'caption', 'diskAction', 'dbAction',
    ];
    const csvLines = [cols.join(',')];
    for (const r of reportRows) csvLines.push(cols.map((c) => csvEscape(r[c])).join(','));
    writeFileSync(csvPath, csvLines.join('\n') + '\n', 'utf8');
    console.log(`\nCSV report: ${csvPath}`);
  }

  if (args.dryRun) {
    console.log('\nDry-run only — no DB writes, no new symlinks. Re-run with --apply to commit.');
  } else {
    console.log(`\nApply done. DB rows updated: ${stats.dbUpdated}; disk ok: ${stats.diskOk}`);
  }

  await pool.end();
}

main().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
