import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const SRC_DIR = resolve(import.meta.dirname, '..');
const tmdb = JSON.parse(readFileSync(resolve(SRC_DIR, 'tmdb-data.json'), 'utf-8'));

// Genre mapping: TMDB genre name → our genre
const GENRE_MAP = {
  'Ciencia Ficción': 'Ciencia',
  'Fantasía': 'Ciencia',
  'Aventura': 'Aventura',
  'Animación': 'Animación',
  'Familia': 'Animación',
  'Comedia': 'Comedia',
  'Drama': 'Drama',
  'Romance': 'Romance',
  'Suspenso': 'Suspenso',
  'Terror': 'Terror',
  'Misterio': 'Misterio',
  'Crimen': 'Suspenso',
  'Acción': 'Acción',
  'Historia': 'Drama',
  'Bélica': 'Acción',
  'Música': 'Drama',
  'Western': 'Acción',
};

// Token → classification (preserved from original seed)
const CLASSIFICATIONS = {
  'ultimo-horizonte': 'PG-13',
  'sombras-pasado': 'R',
  'risas-cadena': 'PG-13',
  'corazon-fuego': 'PG-13',
  'bosque-susurrante': 'R',
  'aventura-cumbre': 'PG',
  'dibujos-animados': 'G',
  'codigo-rojo': 'PG-13',
  'juicio-final': 'PG-13',
  'ultima-frontera': 'PG-13',
  'noche-mentiras': 'PG-13',
  'enigma-faraon': 'PG-13',
  'tormenta-inminente': 'PG-13',
  'lazos-sangre': 'R',
  'cupido-electrico': 'PG-13',
  'panico': 'R',
  'ritmo-salvaje': 'PG',
  'traves-espejo': 'PG-13',
  'guerra-vecinos': 'PG',
  'mar-profundo': 'PG-13',
  'secreto-abuela': 'PG',
  'galaxia-perdida': 'PG-13',
  'amor-primera-linea': 'PG-13',
  'mas-alla-razon': 'R',
  'rio-lavanda': 'PG',
  'operacion-fenix': 'R',
  'reino-hielo': 'PG',
  'noche-juego': 'PG-13',
  'casa-acantilado': 'R',
  'camino-casa': 'G',
  'nomada-digital': 'PG-13',
  'ultima-cancion': 'PG',
  'super-familia': 'PG',
  'hacker': 'PG-13',
  'ultimo-dragon': 'PG',
  'punto-quiebre': 'R',
  'gran-salto': 'PG',
  'misterio-venecia': 'PG-13',
  'planeta-salvaje': 'PG',
  'amigas-siempre': 'PG-13',
  'latidos-corazon': 'PG-13',
  'eclipse': 'R',
  'rebano': 'R',
  'inventor': 'PG',
  'filo-tiempo': 'PG-13',
  'rescate-altamar': 'PG-13',
  'hechizo-luna': 'PG-13',
  'zombielandia': 'R',
  'bajo-cero': 'R',
  'receta-secreta': 'PG',
  'desaparecida': 'R',
  'luna-sangre': 'R',
  'vuelo-colibri': 'G',
  '8-segundos': 'PG-13',
  'amigo-robot': 'PG',
  'amor-cafe': 'PG',
  'contrarreloj': 'R',
  'legado': 'PG-13',
  'aventura-prehistorica': 'PG',
  'ciudad-cristal': 'PG-13',
};

// Featured tokens
const FEATURED = new Set([
  'ultimo-horizonte', 'sombras-pasado', 'risas-cadena', 'corazon-fuego',
  'codigo-rojo', 'galaxia-perdida', 'gran-salto',
]);

const MEDIA_TYPE = 'movie';

function mapGenre(tmdbGenre) {
  return GENRE_MAP[tmdbGenre] || tmdbGenre || 'Drama';
}

const movies = tmdb.map(entry => {
  const t = entry.token;
  const genre = mapGenre(entry.genre);
  const classification = CLASSIFICATIONS[t] || 'PG-13';
  const featured = FEATURED.has(t);

  return {
    name: entry.title,
    image: `/peliculas/${t}.webp`,
    synopsis: entry.synopsis || '',
    genre,
    token: t,
    actors: entry.actors || '',
    classification,
    releaseYear: entry.year || '2024',
    ...(featured ? { featured: true } : {}),
    mediaType: MEDIA_TYPE,
  };
});

// Generate TypeScript code
const code = `import { mutation } from './_generated/server';

const MOVIES = ${JSON.stringify(movies, null, 2).split('\n').map((line, i) => i === 0 ? line : '  ' + line).join('\n')};

const PLANS = [
  {
    name: 'Básico',
    price: 6.99,
    description: 'Disfruta del catálogo esencial',
    features: [
      'Catálogo de películas y series',
      'Calidad HD (720p)',
      '1 dispositivo',
      'Pausa la membresía cuando quieras',
    ],
    icon: 'Zap',
    months: 1,
    recommended: false,
  },
  {
    name: 'Estándar',
    price: 13.99,
    description: 'La mejor relación calidad-precio',
    features: [
      'Catálogo completo sin restricciones',
      'Calidad Full HD (1080p)',
      '2 dispositivos simultáneos',
      'Descargas en 2 dispositivos',
      'Pausa la membresía cuando quieras',
    ],
    icon: 'Star',
    months: 1,
    recommended: true,
  },
  {
    name: 'Premium',
    price: 19.99,
    description: 'La experiencia completa en 4K',
    features: [
      'Catálogo completo sin restricciones',
      'Calidad Ultra HD (4K) + HDR',
      '4 dispositivos simultáneos',
      'Descargas en 6 dispositivos',
      'Audio espacial (Dolby Atmos)',
      'Pausa la membresía cuando quieras',
    ],
    icon: 'Crown',
    months: 1,
    recommended: false,
  },
];

export const run = mutation({
  args: {},
  handler: async (ctx) => {
    const existingMovies = await ctx.db.query('movies').collect();
    const existingPlans = await ctx.db.query('plans').collect();

    const results: Record<string, unknown> = {};

    if (existingMovies.length === 0) {
      for (const movie of MOVIES) {
        await ctx.db.insert('movies', movie);
      }
      results.movies = { inserted: MOVIES.length };
    } else {
      results.movies = { skipped: true, count: existingMovies.length };
    }

    for (const plan of existingPlans) {
      await ctx.db.delete(plan._id);
    }
    for (const plan of PLANS) {
      await ctx.db.insert('plans', plan);
    }
    results.plans = { replaced: PLANS.length, deleted: existingPlans.length };

    return results;
  },
});
`;

writeFileSync(resolve(SRC_DIR, 'packages', 'convex', 'src', 'seed.ts'), code);
console.log('✓ seed.ts generated with', movies.length, 'real TMDB movies');
