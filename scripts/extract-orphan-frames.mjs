#!/usr/bin/env node
/**
 * Extrae frames JPG de películas huérfanas para identificación visual.
 *
 * Uso:
 *   node scripts/extract-orphan-frames.mjs --limit=30
 *   node scripts/extract-orphan-frames.mjs --tokens=661a0ff44d5df,665d5687158fa
 *   node scripts/extract-orphan-frames.mjs --dry-run
 *   node scripts/extract-orphan-frames.mjs --skip-existing
 *
 * Con --skip-existing, excluye tokens que ya tienen frames ANTES de aplicar
 * --limit (así cada ejecución avanza al siguiente lote, no repite los mismos 15).
 */

import { execSync, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const CONVEX_DIR = resolve(ROOT, 'packages/convex');
const FRAMES_DIR = resolve(ROOT, 'tmp/movie-frames');
const MANIFEST_PATH = resolve(FRAMES_DIR, 'manifest.json');

const MANIFEST_CANDIDATES = ['playlist.m3u8', 'index.m3u8', 'master.m3u8'];

const ORPHAN_ID_RE = /^[a-f0-9]{6,}$/i;
const LEGACY_ORPHAN_RE = /^ok(-ru-\d+)?$/i;
const DOCUMENT_ID_RE = /^document[-_]\d+$/i;

const FIXED_TIMESTAMPS_SEC = [120, 600];

function parseArgs(argv) {
  const opts = {
    limit: 30,
    tokens: null,
    dryRun: false,
    skipExisting: false,
    fromFile: null,
  };

  for (const arg of argv) {
    if (arg === '--dry-run') opts.dryRun = true;
    else if (arg === '--skip-existing') opts.skipExisting = true;
    else if (arg.startsWith('--limit=')) opts.limit = Number.parseInt(arg.slice(8), 10);
    else if (arg.startsWith('--tokens=')) {
      opts.tokens = arg
        .slice(9)
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);
    } else if (arg.startsWith('--from-file=')) {
      opts.fromFile = arg.slice(12);
    }
  }

  return opts;
}

function getOutputRoots() {
  const multi = process.env.MOVIE_OUTPUT_ROOTS?.split(':').map((r) => r.trim()).filter(Boolean);
  if (multi?.length) return multi;

  const single = process.env.MOVIE_OUTPUT_ROOT?.trim();
  if (single) return [single];

  return [
    '/run/media/det/Pelis-A/output',
    '/run/media/det/Pelis-B/output',
  ];
}

function isOrphanIdName(name, token) {
  const trimmed = (name ?? '').trim();
  if (!trimmed) return true;
  if (ORPHAN_ID_RE.test(trimmed)) return true;
  if (LEGACY_ORPHAN_RE.test(trimmed)) return true;
  if (DOCUMENT_ID_RE.test(trimmed)) return true;
  if (token && trimmed.toLowerCase() === token.toLowerCase()) return true;
  if (token && trimmed.replace(/_/g, '-').toLowerCase() === token.toLowerCase()) return true;
  return false;
}

function manifestApiPaths(token) {
  const paths = [];
  for (const name of MANIFEST_CANDIDATES) {
    paths.push(`${token}/${token}/${name}`);
    paths.push(`${token}/${name}`);
  }
  return paths;
}

function findManifestForToken(token) {
  for (const root of getOutputRoots()) {
    for (const rel of manifestApiPaths(token)) {
      const filePath = resolve(root, rel);
      if (existsSync(filePath)) {
        return { filePath, root, rel };
      }
    }
  }
  return null;
}

function loadEnvFromRoot() {
  const envPath = resolve(ROOT, '.env');
  if (!existsSync(envPath)) return;
  const content = readFileSync(envPath, 'utf8');
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    if (!process.env[key]) process.env[key] = value;
  }
}

function hasExtractedFrames(token) {
  return (
    existsSync(resolve(FRAMES_DIR, `${token}-t120.jpg`)) &&
    existsSync(resolve(FRAMES_DIR, `${token}-t600.jpg`))
  );
}

function fetchOrphanTokensFromConvex(limit, { skipWithFrames = false } = {}) {
  const raw = execSync('npx convex run movies:list', {
    cwd: CONVEX_DIR,
    encoding: 'utf8',
    maxBuffer: 50 * 1024 * 1024,
  });

  const movies = JSON.parse(raw);
  let orphans = movies
    .filter((m) => isOrphanIdName(m.name, m.token))
    .sort((a, b) => a.token.localeCompare(b.token));

  const totalOrphans = orphans.length;

  if (skipWithFrames) {
    orphans = orphans.filter((m) => !hasExtractedFrames(m.token));
  }

  const pending = orphans.length;

  return {
    targets: orphans.slice(0, limit).map((m) => ({
      token: m.token,
      name: m.name,
      _id: m._id,
    })),
    totalOrphans,
    pending,
  };
}

function loadTokensFromFile(filePath) {
  const abs = resolve(ROOT, filePath);
  const data = JSON.parse(readFileSync(abs, 'utf8'));
  if (Array.isArray(data)) {
    return data.map((item) =>
      typeof item === 'string' ? { token: item } : { token: item.token, name: item.name }
    );
  }
  if (Array.isArray(data.entries)) {
    return data.entries.map((e) => ({ token: e.token, name: e.name }));
  }
  if (Array.isArray(data.movies)) {
    return data.movies.map((m) => ({ token: m.token, name: m.name }));
  }
  throw new Error(`Formato no reconocido en ${filePath}`);
}

function probeDurationSec(manifestPath) {
  const result = spawnSync(
    'ffprobe',
    [
      '-v',
      'error',
      '-show_entries',
      'format=duration',
      '-of',
      'default=noprint_wrappers=1:nokey=1',
      manifestPath,
    ],
    { encoding: 'utf8' }
  );

  if (result.status !== 0) return null;
  const value = Number.parseFloat(result.stdout.trim());
  return Number.isFinite(value) && value > 0 ? value : null;
}

function extractFrame(manifestPath, timestampSec, outputPath) {
  const result = spawnSync(
    'ffmpeg',
    [
      '-hide_banner',
      '-loglevel',
      'error',
      '-ss',
      String(Math.floor(timestampSec)),
      '-i',
      manifestPath,
      '-frames:v',
      '1',
      '-q:v',
      '2',
      '-y',
      outputPath,
    ],
    { encoding: 'utf8' }
  );

  if (result.status !== 0) {
    throw new Error(result.stderr?.trim() || `ffmpeg falló en t=${timestampSec}s`);
  }
  if (!existsSync(outputPath)) {
    throw new Error(`No se generó ${outputPath}`);
  }
}

function buildTimestamps(durationSec) {
  const timestamps = [...FIXED_TIMESTAMPS_SEC];
  if (durationSec && durationSec > 60) {
    const pct = Math.max(30, Math.floor(durationSec * 0.15));
    if (!timestamps.includes(pct)) timestamps.push(pct);
  }
  return timestamps.sort((a, b) => a - b);
}

function expectedFramePaths(token, timestamps) {
  return timestamps.map((t) => resolve(FRAMES_DIR, `${token}-t${t}.jpg`));
}

function allFramesExist(token, timestamps) {
  return expectedFramePaths(token, timestamps).every((p) => existsSync(p));
}

async function main() {
  loadEnvFromRoot();
  const opts = parseArgs(process.argv.slice(2));

  let targets;
  if (opts.tokens?.length) {
    targets = opts.tokens.map((token) => ({ token }));
  } else if (opts.fromFile) {
    targets = loadTokensFromFile(opts.fromFile);
  } else {
    const selection = fetchOrphanTokensFromConvex(opts.limit, {
      skipWithFrames: opts.skipExisting,
    });
    targets = selection.targets;
    console.log(
      `Huérfanos en BD: ${selection.totalOrphans} | Sin frames: ${selection.pending} | Este lote: ${targets.length} (limit=${opts.limit})`
    );
    if (opts.skipExisting && targets.length === 0) {
      console.log('\nTodos los huérfanos pendientes ya tienen frames. Nada que extraer.');
      return;
    }
  }

  if (targets.length === 0) {
    console.log('No hay tokens para procesar.');
    return;
  }

  mkdirSync(FRAMES_DIR, { recursive: true });

  const manifest = existsSync(MANIFEST_PATH)
    ? JSON.parse(readFileSync(MANIFEST_PATH, 'utf8'))
    : { generatedAt: null, movies: [] };

  const existingByToken = new Map(manifest.movies.map((m) => [m.token, m]));
  const results = [];

  console.log(`Procesando ${targets.length} token(s)...`);
  if (opts.dryRun) console.log('(modo dry-run: no se extraen frames)\n');

  for (const target of targets) {
    const { token } = target;
    process.stdout.write(`${token}... `);

    const manifestInfo = findManifestForToken(token);
    if (!manifestInfo) {
      console.log('✗ sin video en disco');
      results.push({
        token,
        name: target.name ?? token,
        hasVideo: false,
        frames: [],
        error: 'No se encontró manifiesto HLS',
      });
      continue;
    }

    let durationSec = null;
    if (!opts.dryRun) {
      durationSec = probeDurationSec(manifestInfo.filePath);
    }

    const timestamps = buildTimestamps(durationSec);

    if (opts.skipExisting && allFramesExist(token, timestamps)) {
      const frames = expectedFramePaths(token, timestamps).map((p, i) => ({
        path: p.replace(`${ROOT}/`, ''),
        timestampSec: timestamps[i],
      }));
      console.log('↷ frames existentes');
      results.push({
        token,
        name: target.name ?? token,
        hasVideo: true,
        durationSec,
        manifestPath: manifestInfo.filePath,
        frames,
        skipped: true,
      });
      continue;
    }

    if (opts.dryRun) {
      console.log(`✓ video (${manifestInfo.rel}) dur=${durationSec ?? '?'}s ts=${timestamps.join(',')}`);
      results.push({
        token,
        name: target.name ?? token,
        hasVideo: true,
        durationSec,
        manifestPath: manifestInfo.filePath,
        plannedTimestamps: timestamps,
      });
      continue;
    }

    const frames = [];
    let failed = false;

    for (const t of timestamps) {
      const outPath = resolve(FRAMES_DIR, `${token}-t${t}.jpg`);
      try {
        extractFrame(manifestInfo.filePath, t, outPath);
        frames.push({
          path: outPath.replace(`${ROOT}/`, ''),
          timestampSec: t,
        });
      } catch (err) {
        failed = true;
        console.log(`\n  ⚠ frame t=${t}s: ${err.message}`);
      }
    }

    if (frames.length === 0) {
      console.log('✗ extracción fallida');
      results.push({
        token,
        name: target.name ?? token,
        hasVideo: true,
        durationSec,
        manifestPath: manifestInfo.filePath,
        frames: [],
        error: 'No se pudo extraer ningún frame',
      });
      continue;
    }

    console.log(`✓ ${frames.length} frame(s)${failed ? ' (parcial)' : ''}`);
    results.push({
      token,
      name: target.name ?? token,
      hasVideo: true,
      durationSec,
      manifestPath: manifestInfo.filePath,
      frames,
    });
  }

  for (const entry of results) {
    existingByToken.set(entry.token, entry);
  }

  const updatedManifest = {
    generatedAt: new Date().toISOString(),
    outputRoots: getOutputRoots(),
    movies: [...existingByToken.values()].sort((a, b) => a.token.localeCompare(b.token)),
  };

  if (!opts.dryRun) {
    writeFileSync(MANIFEST_PATH, JSON.stringify(updatedManifest, null, 2), 'utf8');
  }

  const withVideo = results.filter((r) => r.hasVideo && (r.frames?.length ?? 0) > 0).length;
  const noVideo = results.filter((r) => !r.hasVideo).length;

  console.log('\n--- Resumen ---');
  console.log(`Total: ${results.length} | Con frames: ${withVideo} | Sin video: ${noVideo}`);
  if (!opts.dryRun) {
    console.log(`Manifest: ${MANIFEST_PATH}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
