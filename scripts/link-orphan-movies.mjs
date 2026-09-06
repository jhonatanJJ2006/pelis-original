#!/usr/bin/env node
/**
 * Enlaza películas huérfanas (token hex) con metadatos completos y videoUrl anidado.
 *
 * Uso:
 *   node scripts/link-orphan-movies.mjs --dry-run
 *   node scripts/link-orphan-movies.mjs
 *   node scripts/link-orphan-movies.mjs --skip-posters
 *   node scripts/link-orphan-movies.mjs --from-fix-json
 *   node scripts/link-orphan-movies.mjs --from-fix-json=scripts/.link-orphans-fix.json
 */

import { readFileSync, existsSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const SEED_SQL_PATH = resolve(ROOT, 'packages/convex/src/seed_sql.ts');
const POSTERS_DIR = resolve(ROOT, 'apps/web/public/peliculas');
const API_KEY = 'b1261ab7cbed1aaacf052f9ec50abbe4';
const IMAGE_URL = 'https://image.tmdb.org/t/p/w342';

const FIX_JSON_DEFAULT = resolve(ROOT, 'scripts/.link-orphans-fix.json');
const MANIFEST_CANDIDATES = ['playlist.m3u8', 'index.m3u8', 'master.m3u8'];

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

const GENRE_MAP = {
  28: 'Acción', 12: 'Aventura', 16: 'Animación', 35: 'Comedia',
  80: 'Crimen', 99: 'Documental', 18: 'Drama', 10751: 'Familia',
  14: 'Fantasía', 36: 'Historia', 27: 'Terror', 10402: 'Música',
  9648: 'Misterio', 10749: 'Romance', 878: 'Ciencia', 10770: 'TV',
  53: 'Suspenso', 10752: 'Bélica', 37: 'Western',
};

/** token → { search, year?, displayName?, source: 'tmdb'|'seed' } */
const ORPHAN_MAP = [
  { token: '66622b5c9c829', source: 'seed', displayName: 'Sayen' },
  { token: 'ok-ru-5', search: 'Ghosts of Mars', year: '2001', displayName: 'Ghost of Mars', source: 'tmdb' },
  { token: 'ok', search: 'Fifty Shades Darker', year: '2017', displayName: 'Cincuenta sombras más oscuras', source: 'tmdb' },
  { token: '66651a94d0bb6', source: 'seed', displayName: 'La idea de ti' },
  { token: '66625866104ce', search: 'Kingdom of the Planet of the Apes', year: '2024', displayName: 'El reino del planeta de los simios', source: 'tmdb' },
  { token: '661a0ff44d5df', search: 'Spaceman', year: '2024', displayName: 'Spaceman', source: 'tmdb' },
  { token: '664fd59398fb0', search: 'Pocket Dial Murder', year: '2023', displayName: 'Pocket Dial Murder', source: 'tmdb' },
  { token: '66605de198b03', source: 'seed', displayName: 'JUNG_E' },
];

const SEED_TOKENS = new Set(ORPHAN_MAP.filter((m) => m.source === 'seed').map((m) => m.token));

function cleanSynopsis(text) {
  return (text ?? '').replace(/\\r\\n/g, ' ').replace(/\s+/g, ' ').trim();
}

function loadSeedMovies() {
  const content = readFileSync(SEED_SQL_PATH, 'utf8');
  const start = content.indexOf('const SQL_MOVIES = [');
  const end = content.indexOf('];\n\nconst SQL_SERIES');
  if (start === -1 || end === -1) throw new Error('No se pudo parsear seed_sql.ts');

  const arrayText = content.slice(start + 'const SQL_MOVIES = '.length, end + 1);
  // eslint-disable-next-line no-new-func
  const movies = new Function(`return ${arrayText}`)();
  const byToken = new Map();
  for (const movie of movies) {
    if (SEED_TOKENS.has(movie.token)) {
      byToken.set(movie.token, {
        name: movie.name,
        synopsis: cleanSynopsis(movie.synopsis),
        genre: movie.genre,
        actors: movie.actors.replace(/,/g, ', '),
        classification: movie.classification,
        releaseYear: movie.releaseYear,
        image: movie.image,
        mediaType: movie.mediaType ?? 'movie',
      });
    }
  }
  return byToken;
}

function pickClassification(genre) {
  if (['Terror', 'Suspenso'].includes(genre)) return 'R';
  if (genre === 'Animación') return 'PG';
  if (genre === 'Familia') return 'G';
  return 'PG-13';
}

function hasVideoOnDisk(token) {
  for (const root of getOutputRoots()) {
    for (const name of MANIFEST_CANDIDATES) {
      if (existsSync(`${root}/${token}/${token}/${name}`)) return true;
      if (existsSync(`${root}/${token}/${name}`)) return true;
    }
    // Progressive download / Telegram dumper mp4 (see link-telegram-dumper-videos.mjs)
    if (existsSync(`${root}/${token}/${token}/video.mp4`)) return true;
    if (existsSync(`${root}/${token}/video.mp4`)) return true;
  }
  return false;
}

function parseFixJsonArg(argv) {
  const flag = argv.find((a) => a.startsWith('--from-fix-json'));
  if (!flag) return null;
  if (flag === '--from-fix-json') return FIX_JSON_DEFAULT;
  const custom = flag.slice('--from-fix-json='.length);
  return resolve(ROOT, custom);
}

function loadOrphanMapFromFixJson(filePath) {
  const data = JSON.parse(readFileSync(filePath, 'utf8'));
  const entries = data.entries ?? data.movies ?? data;
  if (!Array.isArray(entries)) {
    throw new Error(`Formato inválido en ${filePath}: se esperaba { entries: [...] }`);
  }

  return entries.map((entry) => {
    const hasFullMetadata =
      entry.synopsis &&
      entry.genre &&
      entry.actors &&
      entry.classification &&
      entry.releaseYear;

    if (hasFullMetadata) {
      return {
        token: entry.token,
        source: 'complete',
        complete: entry,
      };
    }

    return {
      token: entry.token,
      source: entry.source ?? 'tmdb',
      search: entry.search ?? entry.name,
      year: entry.year ?? entry.releaseYear,
      displayName: entry.displayName ?? entry.name,
      tmdbId: entry.tmdbId,
      noVideo: entry.noVideo,
    };
  });
}

function nestedVideoUrl(token) {
  return `/api/stream/${token}/${token}/playlist.m3u8`;
}

async function searchMovie(search, year) {
  const params = new URLSearchParams({
    query: search,
    language: 'es-MX',
    page: '1',
    api_key: API_KEY,
    ...(year ? { year } : {}),
  });
  const resp = await fetch(`https://api.themoviedb.org/3/search/movie?${params}`, {
    headers: { accept: 'application/json' },
    signal: AbortSignal.timeout(15000),
  });
  if (!resp.ok) return null;
  const data = await resp.json();
  let movie = data.results?.[0];
  if (!movie) {
    const enParams = new URLSearchParams({
      query: search,
      language: 'en-US',
      page: '1',
      api_key: API_KEY,
      ...(year ? { year } : {}),
    });
    const enResp = await fetch(`https://api.themoviedb.org/3/search/movie?${enParams}`, {
      signal: AbortSignal.timeout(15000),
    });
    if (enResp.ok) {
      const enData = await enResp.json();
      movie = enData.results?.[0];
    }
  }
  return movie ?? null;
}

async function getCredits(movieId) {
  const params = new URLSearchParams({ api_key: API_KEY, language: 'es-MX' });
  const resp = await fetch(`https://api.themoviedb.org/3/movie/${movieId}/credits?${params}`, {
    signal: AbortSignal.timeout(10000),
  });
  if (!resp.ok) return [];
  const data = await resp.json();
  return (data.cast ?? []).slice(0, 6).map((c) => c.name);
}

async function fetchMovieById(movieId) {
  const resp = await fetch(
    `https://api.themoviedb.org/3/movie/${movieId}?api_key=${API_KEY}&language=es-MX`,
    { signal: AbortSignal.timeout(15000) }
  );
  if (!resp.ok) return null;
  return resp.json();
}

async function fetchTmdbEntry(spec) {
  let movie = spec.tmdbId ? await fetchMovieById(spec.tmdbId) : null;
  if (!movie) {
    movie = await searchMovie(spec.search, spec.year);
  }
  if (!movie) {
    throw new Error(`TMDB sin resultados para "${spec.search}"`);
  }

  const credits = await getCredits(movie.id);
  const genreIds = movie.genre_ids ?? movie.genres?.map((g) => g.id) ?? [];
  const genre = genreIds.map((id) => GENRE_MAP[id]).filter(Boolean)[0] ?? 'Drama';
  let synopsis = movie.overview?.trim() ?? '';
  if (synopsis.length < 10) {
    const enResp = await fetch(
      `https://api.themoviedb.org/3/movie/${movie.id}?api_key=${API_KEY}&language=en-US`,
      { signal: AbortSignal.timeout(10000) }
    );
    if (enResp.ok) {
      const enMovie = await enResp.json();
      synopsis = enMovie.overview?.trim() ?? '';
    }
  }
  if (synopsis.length < 10) {
    throw new Error(`Synopsis vacía para "${spec.search}"`);
  }

  return {
    name: spec.displayName ?? movie.title ?? movie.original_title ?? spec.search,
    synopsis,
    genre,
    actors: credits.join(', '),
    classification: pickClassification(genre),
    releaseYear: movie.release_date?.split('-')[0] ?? spec.year ?? '2023',
    mediaType: 'movie',
    tmdbId: movie.id,
    posterPath: movie.poster_path,
  };
}

async function downloadPoster(tmdbId, token) {
  mkdirSync(POSTERS_DIR, { recursive: true });
  const filepath = resolve(POSTERS_DIR, `${token}.webp`);
  if (existsSync(filepath)) return filepath;

  const detailResp = await fetch(
    `https://api.themoviedb.org/3/movie/${tmdbId}?api_key=${API_KEY}`,
    { signal: AbortSignal.timeout(10000) }
  );
  if (!detailResp.ok) return null;
  const detail = await detailResp.json();
  if (!detail.poster_path) return null;

  const imgResp = await fetch(`${IMAGE_URL}${detail.poster_path}`, {
    signal: AbortSignal.timeout(15000),
  });
  if (!imgResp.ok) return null;
  const buf = Buffer.from(await imgResp.arrayBuffer());
  writeFileSync(filepath, buf);
  return filepath;
}

async function buildEntries({ downloadPosters, orphanMap }) {
  const seedByToken = loadSeedMovies();
  const entries = [];
  const summary = [];

  for (const spec of orphanMap) {
    const onDisk = hasVideoOnDisk(spec.token);
    process.stdout.write(`${spec.token} (${spec.source})... `);

    try {
      let meta;
      let tmdbId;

      if (spec.source === 'complete') {
        meta = {
          name: spec.complete.name,
          synopsis: spec.complete.synopsis,
          genre: spec.complete.genre,
          actors: spec.complete.actors,
          classification: spec.complete.classification,
          releaseYear: spec.complete.releaseYear,
          mediaType: spec.complete.mediaType ?? 'movie',
          image: spec.complete.image,
        };
        tmdbId = spec.complete.tmdbId;
      } else if (spec.source === 'seed') {
        meta = seedByToken.get(spec.token);
        if (!meta) throw new Error('No encontrado en seed_sql.ts');
        if (spec.displayName) meta = { ...meta, name: spec.displayName };
      } else {
        meta = await fetchTmdbEntry(spec);
        tmdbId = meta.tmdbId;
      }

      const entry = {
        token: spec.token,
        name: meta.name,
        synopsis: meta.synopsis,
        genre: meta.genre,
        actors: meta.actors,
        classification: meta.classification,
        releaseYear: meta.releaseYear,
        mediaType: meta.mediaType ?? 'movie',
      };

      if (meta.image) {
        entry.image = meta.image;
      }

      if (!spec.noVideo && onDisk) {
        entry.videoUrl = nestedVideoUrl(spec.token);
      } else if (spec.noVideo) {
        entry.clearVideoUrl = true;
      }

      if (downloadPosters && tmdbId) {
        const posterPath = `/peliculas/${spec.token}.webp`;
        const fullPath = resolve(POSTERS_DIR, `${spec.token}.webp`);
        if (!existsSync(fullPath)) {
          await downloadPoster(tmdbId, spec.token);
        }
        if (existsSync(fullPath)) {
          entry.image = posterPath;
        }
      }

      entries.push(entry);
      summary.push({
        token: spec.token,
        name: entry.name,
        video: spec.noVideo ? 'sin disco' : onDisk ? 'sí' : 'NO EN DISCO',
        image: entry.image ?? '(conservar existente)',
      });
      console.log(`✓ ${entry.name}`);
    } catch (err) {
      console.log(`✗ ${err.message}`);
      summary.push({ token: spec.token, name: spec.search ?? spec.token, error: err.message });
    }
  }

  return { entries, summary };
}

function printSummary(summary) {
  console.log('\n--- Resumen ---');
  for (const row of summary) {
    if (row.error) {
      console.log(`${row.token} | ERROR | ${row.error}`);
    } else {
      console.log(`${row.token} | ${row.name} | video: ${row.video} | img: ${row.image}`);
    }
  }
}

async function main() {
  loadEnvFromRoot();
  const dryRun = process.argv.includes('--dry-run');
  const skipPosters = process.argv.includes('--skip-posters');
  const downloadPosters = !skipPosters;
  const fixJsonPath = parseFixJsonArg(process.argv);
  const orphanMap = fixJsonPath ? loadOrphanMapFromFixJson(fixJsonPath) : ORPHAN_MAP;

  console.log(
    `Modo: ${dryRun ? 'DRY-RUN' : 'APPLY'} | posters: ${downloadPosters ? 'sí' : 'no'} | fuente: ${fixJsonPath ?? 'ORPHAN_MAP'}\n`
  );

  const { entries, summary } = await buildEntries({ downloadPosters, orphanMap });
  printSummary(summary);

  if (entries.length === 0) {
    console.error('\nNo hay entradas válidas para aplicar.');
    process.exit(1);
  }

  const payload = JSON.stringify({ entries });
  const payloadPath = resolve(ROOT, 'scripts/.link-orphans-payload.json');
  writeFileSync(payloadPath, payload, 'utf8');

  if (dryRun) {
    console.log(`\nPayload guardado en ${payloadPath} (${entries.length} películas)`);
    return;
  }

  // LEGACY: apply still calls Convex (removed from stack — Postgres + Prisma now).
  // Do not revive Convex. For new videoUrl writes use scripts/link-telegram-dumper-videos.mjs
  // (DATABASE_URL + pg) or a Postgres/Prisma path. Dry-run / payload generation still works.
  console.error('\nERROR: apply via Convex is dead (stack is Postgres + Prisma).');
  console.error('Payload saved at', payloadPath);
  console.error('For dumper mp4 → catalog linking use: node scripts/link-telegram-dumper-videos.mjs --apply');
  process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
