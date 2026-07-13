import { writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const API_KEY = 'b1261ab7cbed1aaacf052f9ec50abbe4';

const GENRE_MAP = {
  28: 'Acción', 12: 'Aventura', 16: 'Animación', 35: 'Comedia',
  80: 'Crimen', 99: 'Documental', 18: 'Drama', 10751: 'Familia',
  14: 'Fantasía', 36: 'Historia', 27: 'Terror', 10402: 'Música',
  9648: 'Misterio', 10749: 'Romance', 878: 'Ciencia', 10770: 'TV',
  53: 'Suspenso', 10752: 'Bélica', 37: 'Western',
};

const MOVIES = [
  { token: 'ultimo-horizonte', search: 'The Martian' },
  { token: 'sombras-pasado', search: 'El secreto de sus ojos' },
  { token: 'risas-cadena', search: 'Superbad' },
  { token: 'corazon-fuego', search: 'Like Water for Chocolate' },
  { token: 'bosque-susurrante', search: 'The Witch' },
  { token: 'aventura-cumbre', search: 'Everest' },
  { token: 'dibujos-animados', search: 'Inside Out' },
  { token: 'codigo-rojo', search: 'Mission Impossible Fallout' },
  { token: 'juicio-final', search: 'The Verdict' },
  { token: 'ultima-frontera', search: 'Blade Runner 2049' },
  { token: 'noche-mentiras', search: 'The Dinner' },
  { token: 'enigma-faraon', search: 'The Mummy' },
  { token: 'tormenta-inminente', search: 'Twister' },
  { token: 'lazos-sangre', search: 'The Good Lie' },
  { token: 'cupido-electrico', search: 'Her' },
  { token: 'panico', search: 'The Conjuring' },
  { token: 'ritmo-salvaje', search: 'Step Up' },
  { token: 'traves-espejo', search: 'Coherence' },
  { token: 'guerra-vecinos', search: 'The War of the Roses' },
  { token: 'mar-profundo', search: 'The Abyss' },
  { token: 'secreto-abuela', search: 'No se aceptan devoluciones' },
  { token: 'galaxia-perdida', search: 'Lost in Space' },
  { token: 'amor-primera-linea', search: 'The Notebook' },
  { token: 'mas-alla-razon', search: 'Shutter Island' },
  { token: 'rio-lavanda', search: 'A Good Year' },
  { token: 'operacion-fenix', search: 'Rambo First Blood Part II' },
  { token: 'reino-hielo', search: 'Frozen' },
  { token: 'noche-juego', search: 'Jumanji Welcome to the Jungle' },
  { token: 'casa-acantilado', search: 'The Others' },
  { token: 'camino-casa', search: 'Hachi A Dog Tale' },
  { token: 'nomada-digital', search: 'Into the Wild' },
  { token: 'ultima-cancion', search: 'Coco' },
  { token: 'super-familia', search: 'The Incredibles' },
  { token: 'hacker', search: 'Who Am I' },
  { token: 'ultimo-dragon', search: 'How to Train Your Dragon' },
  { token: 'punto-quiebre', search: 'Rocky' },
  { token: 'gran-salto', search: 'Hidden Figures' },
  { token: 'misterio-venecia', search: 'Death on the Nile' },
  { token: 'planeta-salvaje', search: 'The Jungle Book' },
  { token: 'amigas-siempre', search: 'Bridesmaids' },
  { token: 'latidos-corazon', search: 'Sweet November' },
  { token: 'eclipse', search: 'The Sixth Sense' },
  { token: 'rebano', search: 'The Grey' },
  { token: 'inventor', search: 'Hugo' },
  { token: 'filo-tiempo', search: 'Back to the Future' },
  { token: 'rescate-altamar', search: 'The Poseidon Adventure' },
  { token: 'hechizo-luna', search: 'Practical Magic' },
  { token: 'zombielandia', search: 'World War Z' },
  { token: 'bajo-cero', search: 'The Thing' },
  { token: 'receta-secreta', search: 'Ratatouille' },
  { token: 'desaparecida', search: 'Gone Baby Gone' },
  { token: 'luna-sangre', search: 'Midsommar' },
  { token: 'vuelo-colibri', search: 'Rio' },
  { token: '8-segundos', search: '8 Seconds' },
  { token: 'amigo-robot', search: 'Big Hero 6' },
  { token: 'amor-cafe', search: 'You Got Mail' },
  { token: 'contrarreloj', search: 'The Hurt Locker' },
  { token: 'legado', search: 'Diarios de motocicleta' },
  { token: 'aventura-prehistorica', search: 'Jurassic Park' },
  { token: 'ciudad-cristal', search: 'The Devil Wears Prada' },
];

async function getMovieData(search) {
  const params = new URLSearchParams({ query: search, language: 'es-MX', page: '1', api_key: API_KEY });
  const resp = await fetch(`https://api.themoviedb.org/3/search/movie?${params}`, {
    headers: { accept: 'application/json' },
    signal: AbortSignal.timeout(15000),
  });
  if (!resp.ok) return null;
  const data = await resp.json();

  let movie = data.results?.[0];
  // If language didn't match, retry in English
  if (!movie) {
    const enParams = new URLSearchParams({ query: search, language: 'en-US', page: '1', api_key: API_KEY });
    const enResp = await fetch(`https://api.themoviedb.org/3/search/movie?${enParams}`, {
      headers: { accept: 'application/json' }, signal: AbortSignal.timeout(15000),
    });
    if (enResp.ok) {
      const enData = await enResp.json();
      movie = enData.results?.[0];
    }
  }
  return movie || null;
}

async function getCredits(movieId) {
  try {
    const params = new URLSearchParams({ api_key: API_KEY, language: 'es-MX' });
    const resp = await fetch(`https://api.themoviedb.org/3/movie/${movieId}/credits?${params}`,
      { signal: AbortSignal.timeout(10000) });
    if (!resp.ok) return null;
    return await resp.json();
  } catch { return null; }
}

async function main() {
  const results = [];

  for (let i = 0; i < MOVIES.length; i++) {
    const { token, search } = MOVIES[i];
    process.stdout.write(`[${i + 1}/60] ${token} ← "${search}"... `);
    const movie = await getMovieData(search);

    if (!movie) {
      console.log('✗ no data');
      results.push({ token, title: search, synopsis: '', genre: 'Drama', year: '2024', actors: '' });
      continue;
    }

    const title = movie.title || movie.original_title || search;
    const synopsis = movie.overview?.trim() || '';
    const year = movie.release_date?.split('-')[0] || '2024';
    const genreIds = movie.genre_ids || [];
    const genreNames = genreIds.map(id => GENRE_MAP[id]).filter(Boolean);
    const mainGenre = genreNames[0] || 'Drama';

    const credits = await getCredits(movie.id);
    const actors = (credits?.cast || []).slice(0, 4).map(c => c.name).join(', ');

    console.log(`✓ ${title}`);
    results.push({ token, title, synopsis, genre: mainGenre, year, actors });
  }

  const outPath = resolve(__dirname, '..', 'tmdb-data.json');
  writeFileSync(outPath, JSON.stringify(results, null, 2), 'utf-8');
  console.log(`\n✓ ${results.length} películas guardadas en tmdb-data.json`);
}

main().catch(console.error);
