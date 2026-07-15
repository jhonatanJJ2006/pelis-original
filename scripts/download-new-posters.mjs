import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const API_KEY = 'b1261ab7cbed1aaacf052f9ec50abbe4';
const IMAGE_URL = 'https://image.tmdb.org/t/p/w342';
const POSTERS_DIR = resolve(import.meta.dirname, '..', 'apps', 'web', 'public', 'peliculas');

function slugify(text) {
  const spanish = {
    'á': 'a', 'é': 'e', 'í': 'i', 'ó': 'o', 'ú': 'u',
    'ü': 'u', 'ñ': 'n',
  };
  let s = text.toLowerCase().trim();
  for (const [k, v] of Object.entries(spanish)) s = s.replaceAll(k, v);
  s = s.replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  // truncate if too long
  if (s.length > 40) s = s.slice(0, 40).replace(/-+$/g, '');
  return s;
}

// Genre mapping for TMDB genres
const GENRE_MAP = {
  'Ciencia ficción': 'Ciencia',
  'Suspense': 'Suspenso',
  'Familia': 'Animación',
  'Crimen': 'Suspenso',
  'Historia': 'Drama',
  'Música': 'Drama',
  'Bélica': 'Acción',
  'Western': 'Acción',
};

function mapGenre(tmdbGenres) {
  if (!tmdbGenres) return 'Drama';
  const genres = tmdbGenres.split(', ').map(g => g.trim());
  const mapped = genres.map(g => GENRE_MAP[g] || g);
  return mapped[0]; // take first genre
}

const CLASSIFICATIONS = ['PG', 'PG-13', 'R', 'G'];
function pickClassification(genre) {
  if (['Terror', 'Suspenso'].includes(genre)) return 'R';
  if (['Animación'].includes(genre)) return 'PG';
  return 'PG-13';
}

async function downloadPoster(tmdbId, token) {
  const filepath = resolve(POSTERS_DIR, `${token}.webp`);
  if (existsSync(filepath)) {
    console.log(`  ∃ ${token} (already exists)`);
    return true;
  }

  const r = await fetch(`https://api.themoviedb.org/3/movie/${tmdbId}?api_key=${API_KEY}`, {
    signal: AbortSignal.timeout(10000),
  });
  const movie = await r.json();
  if (!movie.poster_path) {
    console.log(`  ✗ ${token}: no poster`);
    return false;
  }

  const imgResp = await fetch(`${IMAGE_URL}${movie.poster_path}`, { signal: AbortSignal.timeout(30000) });
  if (!imgResp.ok) {
    console.log(`  ✗ ${token}: HTTP ${imgResp.status}`);
    return false;
  }

  writeFileSync(filepath, Buffer.from(await imgResp.arrayBuffer()));
  console.log(`  ✓ ${token}`);
  return true;
}

async function main() {
  const moviesPath = resolve(import.meta.dirname, '..', 'movies.json');
  const movies = JSON.parse(readFileSync(moviesPath, 'utf-8'));

  console.log(`Processing ${movies.length} movies...\n`);

  const results = [];

  for (const movie of movies) {
    const token = slugify(movie.title);
    const genre = mapGenre(movie.genre);
    const classification = movie.classification || pickClassification(genre);

    console.log(`${movie.title} → ${token}`);
    await downloadPoster(movie.tmdbId, token);

    results.push({
      token,
      name: movie.title,
      image: `/peliculas/${token}.webp`,
      synopsis: movie.overview || '',
      genre,
      actors: (movie.actors || []).join(', '),
      classification,
      releaseYear: String(movie.releaseYear),
      mediaType: 'movie',
    });
  }

  // Save the processed data
  writeFileSync(resolve(import.meta.dirname, '..', 'movies-processed.json'), JSON.stringify(results, null, 2));
  console.log(`\n✓ Saved ${results.length} processed movies`);
}

main().catch(console.error);
