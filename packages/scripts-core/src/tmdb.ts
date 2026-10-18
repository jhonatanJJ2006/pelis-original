/**
 * Normaliza resultados de TMDB (`/search/movie`, `/discover/movie`) al shape
 * del seed de Pelis.
 *
 * @module @pelis/scripts-core/tmdb
 */

import { slugify } from './slugify';

export type TmdbMovieRaw = {
  id: number;
  title?: string;
  original_title?: string;
  overview?: string | null;
  genre_ids?: number[];
  release_date?: string;
  poster_path?: string | null;
  vote_average?: number;
};

export type TmdbGenreMap = Record<number, string>;

export type NormalizedMovie = {
  token: string;
  name: string;
  synopsis: string;
  genre: string;
  classification: string;
  releaseYear: string;
  image: string;
  actors: string;
  mediaType: 'movie';
};

export const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p/w500';
const FALLBACK_YEAR = '1970';

/**
 * Convierte un registro TMDB al shape interno. `genre` es el primer género
 * encontrado en `genreMap`; el token es `slug(título)-{id}` (único por id).
 */
export function normalizeTmdbMovie(raw: TmdbMovieRaw, genreMap: TmdbGenreMap): NormalizedMovie {
  const title = raw.title?.trim() || raw.original_title?.trim() || `tmdb-${raw.id}`;
  const token = slugify(`${title}-${raw.id}`);
  const year = raw.release_date?.slice(0, 4);
  const genreId = raw.genre_ids?.[0];
  const genre = (genreId != null && genreMap[genreId]) || 'Sin clasificar';
  const image = raw.poster_path ? `${TMDB_IMAGE_BASE}${raw.poster_path}` : '';

  return {
    token,
    name: title,
    synopsis: raw.overview?.trim() || 'Sin sinopsis disponible.',
    genre,
    classification: 'PG-13',
    releaseYear: year && /^\d{4}$/.test(year) ? year : FALLBACK_YEAR,
    image,
    actors: '',
    mediaType: 'movie',
  };
}
