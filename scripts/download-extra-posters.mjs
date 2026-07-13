import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const API_KEY = 'b1261ab7cbed1aaacf052f9ec50abbe4';
const IMAGE_URL = 'https://image.tmdb.org/t/p/w342';
const POSTERS_DIR = resolve(import.meta.dirname, '..', 'apps', 'web', 'public', 'peliculas');

function slugify(text) {
  const spanish = {'á':'a','é':'e','í':'i','ó':'o','ú':'u','ü':'u','ñ':'n'};
  let s = text.toLowerCase().trim();
  for (const [k, v] of Object.entries(spanish)) s = s.replaceAll(k, v);
  s = s.replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  if (s.length > 40) s = s.slice(0, 40).replace(/-+$/g, '');
  return s;
}

const GENRE_MAP = {
  'Ciencia ficción': 'Ciencia', 'Suspense': 'Suspenso',
  'Familia': 'Animación', 'Crimen': 'Suspenso',
  'Historia': 'Drama', 'Música': 'Drama',
  'Bélica': 'Acción', 'Western': 'Acción',
};

function mapGenre(g) {
  return GENRE_MAP[g] || g || 'Drama';
}

const CLASS_BY_GENRE = {
  'Terror': 'R', 'Suspenso': 'R', 'Animación': 'PG',
};
function pickClass(genre) { return CLASS_BY_GENRE[genre] || 'PG-13'; }

// Skip these tokens (already in DB or duplicate movies)
const SKIP_TOKENS = new Set(['como-entrenar-a-tu-dragon']);

async function downloadPoster(tmdbId, token) {
  const filepath = resolve(POSTERS_DIR, `${token}.webp`);
  if (existsSync(filepath)) return true;

  const r = await fetch(`https://api.themoviedb.org/3/movie/${tmdbId}?api_key=${API_KEY}`, { signal: AbortSignal.timeout(10000) });
  const movie = await r.json();
  if (!movie.poster_path) return false;

  const img = await fetch(`${IMAGE_URL}${movie.poster_path}`, { signal: AbortSignal.timeout(30000) });
  if (!img.ok) return false;

  writeFileSync(filepath, Buffer.from(await img.arrayBuffer()));
  return true;
}

async function main() {
  const movies = JSON.parse(readFileSync(resolve(import.meta.dirname, '..', 'movies-extra.json'), 'utf-8'));

  const results = [];
  for (const m of movies) {
    const token = slugify(m.title);
    if (SKIP_TOKENS.has(token)) { console.log(`skip ${m.title}`); continue; }

    const genre = mapGenre(m.genre);
    const classification = pickClass(genre);
    const ok = await downloadPoster(m.tmdbId, token);
    console.log(`${ok ? '✓' : '✗'} ${m.title} → ${token}`);
    if (!ok) continue;

    results.push({
      token, name: m.title, image: `/peliculas/${token}.webp`,
      synopsis: m.overview || '', genre,
      actors: (m.actors || []).join(', '),
      classification, releaseYear: String(m.releaseYear), mediaType: 'movie',
    });
  }

  writeFileSync(resolve(import.meta.dirname, '..', 'movies-extra-processed.json'), JSON.stringify(results, null, 2));
  console.log(`\n✓ ${results.length} movies ready`);
}

main().catch(console.error);
