/**
 * Additive writer for the public series catalog.
 *
 * Writes only `movie` rows with mediaType = SERIES (what /series reads).
 * Allowed Prisma calls: movie.findMany, movie.create, and series.findMany
 * (read-only mirror of admin rows). No update, delete, upsert, or truncate.
 * Does not touch user, subscription, favorite, history, session, or account.
 */
import { Prisma, PrismaClient } from '@prisma/client';
import {
  addSeriesMovies,
  collectTmdbSeries,
  movieInsertFromAdminSeries,
  type AddSeriesMoviesResult,
  type SeriesMovieInsert,
  type SeriesMovieStore,
  type TmdbTvListItem,
  TMDB_SERIES_PAGE_DELAY_MS,
} from './tmdb-series-catalog';

export {
  addSeriesMovies,
  collectTmdbSeries,
  movieInsertFromAdminSeries,
  TMDB_SERIES_PAGE_DELAY_MS,
};
export type { AddSeriesMoviesResult, SeriesMovieInsert, SeriesMovieStore, TmdbTvListItem };

const TMDB_BASE = 'https://api.themoviedb.org/3';

export function isMovieTokenConflict(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';
}

export function createMovieSeriesStore(prisma: PrismaClient): SeriesMovieStore {
  return {
    async findExistingTokens(tokens) {
      if (tokens.length === 0) return new Set();
      const rows = await prisma.movie.findMany({
        where: { token: { in: tokens } },
        select: { token: true },
      });
      return new Set(rows.map((row) => row.token));
    },
    async insertSeriesMovie(row) {
      try {
        await prisma.movie.create({
          data: {
            name: row.name,
            image: row.image,
            backdropImage: row.backdropImage,
            synopsis: row.synopsis,
            genre: row.genre,
            token: row.token,
            actors: row.actors,
            classification: row.classification,
            releaseYear: row.releaseYear,
            episodes: row.episodes,
            mediaType: 'SERIES',
            featured: row.featured,
          },
        });
        return 'inserted';
      } catch (error) {
        if (isMovieTokenConflict(error)) return 'skipped';
        throw error;
      }
    },
  };
}

export async function fetchTmdbPopularTvPage(
  page: number,
  apiKey: string
): Promise<TmdbTvListItem[]> {
  const params = new URLSearchParams({
    api_key: apiKey,
    language: 'es-ES',
    include_adult: 'false',
    page: String(page),
  });
  const res = await fetch(`${TMDB_BASE}/tv/popular?${params.toString()}`);
  if (!res.ok) {
    throw new Error(`TMDB TV popular respondió ${res.status}`);
  }
  const data = (await res.json()) as { results?: TmdbTvListItem[] };
  return data.results ?? [];
}

/** Read admin series and insert any token that is not already a movie. Never deletes those rows. */
export async function mirrorAdminSeriesToMovies(
  prisma: PrismaClient,
  store: SeriesMovieStore = createMovieSeriesStore(prisma)
): Promise<AddSeriesMoviesResult> {
  const rows = await prisma.series.findMany();
  const mapped = rows
    .map((row) => movieInsertFromAdminSeries(row))
    .filter((row): row is SeriesMovieInsert => row !== null);
  return addSeriesMovies(mapped, store);
}

export async function importPopularTmdbSeries(
  prisma: PrismaClient,
  limit: number,
  apiKey: string,
  store: SeriesMovieStore = createMovieSeriesStore(prisma)
): Promise<AddSeriesMoviesResult> {
  const rows = await collectTmdbSeries(limit, {
    delayMs: TMDB_SERIES_PAGE_DELAY_MS,
    fetchPage: (page) => fetchTmdbPopularTvPage(page, apiKey),
  });
  return addSeriesMovies(rows, store);
}
