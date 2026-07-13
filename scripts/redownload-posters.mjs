import { writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = resolve(__dirname, '..', 'apps', 'web', 'public', 'peliculas');
const API_KEY = 'b1261ab7cbed1aaacf052f9ec50abbe4';
const IMAGE_URL = 'https://image.tmdb.org/t/p/w342';

// Download poster by TMDB movie ID
async function downloadById(movieId, token) {
  const resp = await fetch(`https://api.themoviedb.org/3/movie/${movieId}?api_key=${API_KEY}`, {
    signal: AbortSignal.timeout(10000),
  });
  const movie = await resp.json();
  if (!movie.poster_path) {
    console.log(`  ✗ ${token}: no poster for movie ID ${movieId}`);
    return false;
  }
  const imgUrl = `${IMAGE_URL}${movie.poster_path}`;
  console.log(`  descargando ← ${movie.title} (${movieId})`);
  const imgResp = await fetch(imgUrl, { signal: AbortSignal.timeout(30000) });
  if (!imgResp.ok) { console.log(`  ✗ HTTP ${imgResp.status}`); return false; }
  writeFileSync(resolve(OUT_DIR, `${token}.webp`), Buffer.from(await imgResp.arrayBuffer()));
  console.log(`  ✓ ${token}`);
  return true;
}

const ITEMS = [
  { id: 50348, token: 'vuelo-colibri' },   // Rio (2011)
  { id: 75174, token: 'rebano' },          // The Grey (2011)
];

for (const { id, token } of ITEMS) {
  console.log(`${token}: fetching...`);
  await downloadById(id, token);
}
console.log('\n✓ Done');
