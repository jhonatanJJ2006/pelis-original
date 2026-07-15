import { writeFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = resolve(__dirname, '..', 'apps', 'web', 'public', 'peliculas');
const API_KEY = 'b1261ab7cbed1aaacf052f9ec50abbe4';
const DISCOVER_URL = 'https://api.themoviedb.org/3/discover/movie';
const IMAGE_URL = 'https://image.tmdb.org/t/p/w342';

const GENRE_MAP = {
  'Ciencia': 878,
  'Suspenso': 9648,
  'Comedia': 35,
  'Romance': 10749,
  'Terror': 27,
  'Aventura': 12,
  'Animación': 16,
  'Acción': 28,
  'Drama': 18,
};

// For each movie: search by a known real movie title that fits the genre
const MOVIES = [
  { token: 'ultimo-horizonte', search: 'The Martian', genre: 'Ciencia' },
  { token: 'sombras-pasado', search: 'The Secret in Their Eyes', genre: 'Suspenso' },
  { token: 'risas-cadena', search: 'Superbad', genre: 'Comedia' },
  { token: 'corazon-fuego', search: 'Like Water for Chocolate', genre: 'Romance' },
  { token: 'bosque-susurrante', search: 'The Witch', genre: 'Terror' },
  { token: 'aventura-cumbre', search: 'Everest', genre: 'Aventura' },
  { token: 'dibujos-animados', search: 'Inside Out', genre: 'Animación' },
  { token: 'codigo-rojo', search: 'Mission: Impossible - Fallout', genre: 'Acción' },
  { token: 'juicio-final', search: 'The Verdict', genre: 'Drama' },
  { token: 'ultima-frontera', search: 'Blade Runner 2049', genre: 'Ciencia' },
  { token: 'noche-mentiras', search: 'The Dinner', genre: 'Comedia' },
  { token: 'enigma-faraon', search: 'The Mummy', genre: 'Aventura' },
  { token: 'tormenta-inminente', search: 'Twister', genre: 'Acción' },
  { token: 'lazos-sangre', search: 'The Good Lie', genre: 'Drama' },
  { token: 'cupido-electrico', search: 'Her', genre: 'Romance' },
  { token: 'panico', search: 'The Conjuring', genre: 'Terror' },
  { token: 'ritmo-salvaje', search: 'Step Up', genre: 'Drama' },
  { token: 'traves-espejo', search: 'Coherence', genre: 'Ciencia' },
  { token: 'guerra-vecinos', search: 'The War of the Roses', genre: 'Comedia' },
  { token: 'mar-profundo', search: 'The Abyss', genre: 'Aventura' },
  { token: 'secreto-abuela', search: 'Like Water for Chocolate', genre: 'Drama' },
  { token: 'galaxia-perdida', search: 'Lost in Space', genre: 'Ciencia' },
  { token: 'amor-primera-linea', search: 'The Notebook', genre: 'Romance' },
  { token: 'mas-alla-razon', search: 'Shutter Island', genre: 'Suspenso' },
  { token: 'rio-lavanda', search: 'A Good Year', genre: 'Romance' },
  { token: 'operacion-fenix', search: 'Rambo: First Blood', genre: 'Acción' },
  { token: 'reino-hielo', search: 'Frozen', genre: 'Animación' },
  { token: 'noche-juego', search: 'Jumanji: Welcome to the Jungle', genre: 'Comedia' },
  { token: 'casa-acantilado', search: 'The Others', genre: 'Terror' },
  { token: 'camino-casa', search: 'Hachi: A Dog\'s Tale', genre: 'Aventura' },
  { token: 'nomada-digital', search: 'Into the Wild', genre: 'Drama' },
  { token: 'ultima-cancion', search: 'Coco', genre: 'Drama' },
  { token: 'super-familia', search: 'The Incredibles', genre: 'Comedia' },
  { token: 'hacker', search: 'Who Am I', genre: 'Suspenso' },
  { token: 'ultimo-dragon', search: 'How to Train Your Dragon', genre: 'Animación' },
  { token: 'punto-quiebre', search: 'Rocky', genre: 'Drama' },
  { token: 'gran-salto', search: 'Hidden Figures', genre: 'Drama' },
  { token: 'misterio-venecia', search: 'Death on the Nile', genre: 'Suspenso' },
  { token: 'planeta-salvaje', search: 'The Jungle Book', genre: 'Aventura' },
  { token: 'amigas-siempre', search: 'Bridesmaids', genre: 'Comedia' },
  { token: 'latidos-corazon', search: 'Sweet November', genre: 'Romance' },
  { token: 'eclipse', search: 'The Sixth Sense', genre: 'Suspenso' },
  { token: 'rebano', search: 'The Grey', genre: 'Terror' },
  { token: 'inventor', search: 'The Invention of Hugo Cabret', genre: 'Ciencia' },
  { token: 'filo-tiempo', search: 'Back to the Future', genre: 'Ciencia' },
  { token: 'rescate-altamar', search: 'The Poseidon Adventure', genre: 'Acción' },
  { token: 'hechizo-luna', search: 'Practical Magic', genre: 'Romance' },
  { token: 'zombielandia', search: 'World War Z', genre: 'Acción' },
  { token: 'bajo-cero', search: 'The Thing', genre: 'Terror' },
  { token: 'receta-secreta', search: 'Ratatouille', genre: 'Comedia' },
  { token: 'desaparecida', search: 'Gone Baby Gone', genre: 'Drama' },
  { token: 'luna-sangre', search: 'Midsommar', genre: 'Terror' },
  { token: 'vuelo-colibri', search: 'The Jungle Book', genre: 'Animación' },
  { token: '8-segundos', search: '8 Seconds', genre: 'Drama' },
  { token: 'amigo-robot', search: 'Big Hero 6', genre: 'Ciencia' },
  { token: 'amor-cafe', search: 'You\'ve Got Mail', genre: 'Romance' },
  { token: 'contrarreloj', search: 'The Hurt Locker', genre: 'Acción' },
  { token: 'legado', search: 'The Heir', genre: 'Drama' },
  { token: 'aventura-prehistorica', search: 'Jurassic Park', genre: 'Animación' },
  { token: 'ciudad-cristal', search: 'The Fountainhead', genre: 'Drama' },
];

async function searchMovie(query, genre) {
  // First try: exact search by title
  const searchParams = new URLSearchParams({ query, language: 'en-US', page: '1', api_key: API_KEY });
  const searchUrl = `https://api.themoviedb.org/3/search/movie?${searchParams}`;
  let resp = await fetch(searchUrl, { headers: { accept: 'application/json' }, signal: AbortSignal.timeout(15000) });
  if (!resp.ok) throw new Error(`TMDB ${resp.status}`);
  let data = await resp.json();

  if (data.results?.[0]?.poster_path) return data.results[0];

  // Fallback: discover by genre (popularity desc)
  const genreId = GENRE_MAP[genre];
  if (!genreId) return null;

  const discParams = new URLSearchParams({
    with_genres: String(genreId),
    sort_by: 'popularity.desc',
    language: 'en-US',
    page: '1',
    api_key: API_KEY,
  });
  const discUrl = `${DISCOVER_URL}?${discParams}`;
  resp = await fetch(discUrl, { headers: { accept: 'application/json' }, signal: AbortSignal.timeout(15000) });
  if (!resp.ok) return null;
  data = await resp.json();
  return data.results?.find(r => r.poster_path) || null;
}

async function main() {
  const results = [];

  for (let i = 0; i < MOVIES.length; i++) {
    const { token, search, genre } = MOVIES[i];
    const filepath = resolve(OUT_DIR, `${token}.webp`);

    if (existsSync(filepath)) {
      console.log(`[${i + 1}/60] SKIP ${token}`);
      results.push({ token, status: 'skipped' });
      continue;
    }

    try {
      const movie = await searchMovie(search, genre);
      if (!movie?.poster_path) {
        console.log(`[${i + 1}/60] ✗ ${token}: no poster`);
        results.push({ token, status: 'not_found' });
        continue;
      }

      const title = movie.title || 'unknown';
      const imgUrl = `${IMAGE_URL}${movie.poster_path}`;
      console.log(`[${i + 1}/60] ✓ ${token} ← ${title}`);

      const imgResp = await fetch(imgUrl, { signal: AbortSignal.timeout(30000) });
      if (!imgResp.ok) throw new Error(`HTTP ${imgResp.status}`);
      writeFileSync(filepath, Buffer.from(await imgResp.arrayBuffer()));
      results.push({ token, status: 'downloaded', title });
    } catch (err) {
      console.error(`[${i + 1}/60] ✗ ${token}: ${err.message}`);
      results.push({ token, status: 'failed', error: err.message });
    }
  }

  const d = results.filter(r => r.status === 'downloaded').length;
  const s = results.filter(r => r.status === 'skipped').length;
  const f = results.filter(r => r.status === 'not_found' || r.status === 'failed').length;
  console.log(`\n✓ ${d} | ⏭ ${s} | ✗ ${f} | Total: ${results.length}`);
  results.filter(r => r.status !== 'downloaded').forEach(r => console.log(`  ✗ ${r.token}: ${r.status}`));
}

main().catch(console.error);
