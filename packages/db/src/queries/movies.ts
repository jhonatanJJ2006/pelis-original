import { z } from 'zod';
import { prisma } from '../client';
import { register } from '../registry';
import { AuthError } from '../lib/requireAdmin';
import { toMovieShape } from '../lib/shapes';
import { isMissingVideo } from '../lib/movieQuality';
import { hasManifestForToken } from '../lib/hasManifestForToken';
import { genreTokenWhere, movieMatchesGenre, splitMovieGenres } from '../lib/movieGenre';

/** Keep series as-is; movies need videoUrl or an on-disk HLS manifest. */
async function filterPlayableCatalog<
  T extends { mediaType?: string | null; videoUrl?: string | null; token: string },
>(movies: T[]): Promise<T[]> {
  const out: T[] = [];
  for (const movie of movies) {
    const mediaType = (movie.mediaType ?? 'MOVIE').toString().toUpperCase();
    if (mediaType === 'SERIES') {
      out.push(movie);
      continue;
    }
    if (!isMissingVideo(movie.videoUrl)) {
      out.push(movie);
      continue;
    }
    if (await hasManifestForToken(movie.token)) {
      out.push(movie);
    }
  }
  return out;
}

const MediaTypeEnum = z.enum(['movie', 'series']);

/**
 * When a limit is set, over-fetch before the playable filter so Android TV /
 * search are not left with an empty page because the first N rows lacked video.
 */
async function findPlayableMovies(opts: {
  where: Record<string, unknown>;
  orderBy: Record<string, 'asc' | 'desc'> | Array<Record<string, 'asc' | 'desc'>>;
  limit?: number;
  offset?: number;
}) {
  const { where, orderBy, limit, offset = 0 } = opts;
  if (limit == null) {
    const movies = await prisma.movie.findMany({ where, orderBy });
    return filterPlayableCatalog(movies);
  }
  const batch = await prisma.movie.findMany({
    where,
    orderBy,
    // Pull enough rows to cover skip+take after dropping unplayable movies.
    take: Math.min((offset + limit) * 4, 2000),
  });
  const playable = await filterPlayableCatalog(batch);
  return playable.slice(offset, offset + limit);
}

export const list = register({
  kind: 'query',
  name: 'movies.list',
  reads: ['movie'],
  args: z
    .object({
      genre: z.string().optional(),
      year: z.string().optional(),
      classification: z.string().optional(),
      search: z.string().optional(),
      mediaType: MediaTypeEnum.optional(),
      limit: z.number().optional(),
      offset: z.number().optional(),
    })
    .optional(),
  handler: async (_ctx, args) => {
    const a = args ?? {};
    const where: Record<string, unknown> = {};
    if (a.mediaType) where.mediaType = a.mediaType === 'movie' ? 'MOVIE' : 'SERIES';
    if (a.year) where.releaseYear = a.year;
    if (a.classification) where.classification = a.classification;

    const genre = a.genre?.trim();
    const search = a.search?.trim();

    if (genre && search) {
      const q = search.toLowerCase();
      where.AND = [
        genreTokenWhere(genre),
        {
          OR: [
            { name: { contains: q, mode: 'insensitive' } },
            { actors: { contains: q, mode: 'insensitive' } },
            { genre: { contains: q, mode: 'insensitive' } },
          ],
        },
      ];
    } else if (genre) {
      Object.assign(where, genreTokenWhere(genre));
    } else if (search) {
      const q = search.toLowerCase();
      where.OR = [
        { name: { contains: q, mode: 'insensitive' } },
        { actors: { contains: q, mode: 'insensitive' } },
        { genre: { contains: q, mode: 'insensitive' } },
      ];
    }

    const movies = await findPlayableMovies({
      where,
      orderBy: { name: 'asc' },
      limit: a.limit,
      offset: a.offset,
    });

    const refined = genre ? movies.filter((m) => movieMatchesGenre(m.genre, genre)) : movies;
    return refined.map(toMovieShape);
  },
});

export const search = register({
  kind: 'query',
  name: 'movies.search',
  reads: ['movie'],
  args: z.object({ q: z.string(), limit: z.number().optional() }),
  handler: async (_ctx, { q, limit }) => {
    const ql = q.trim().toLowerCase();
    if (!ql) return [];
    const take = limit ?? 8;
    const movies = await findPlayableMovies({
      where: {
        OR: [
          { name: { contains: ql, mode: 'insensitive' } },
          { actors: { contains: ql, mode: 'insensitive' } },
          { genre: { contains: ql, mode: 'insensitive' } },
        ],
      },
      orderBy: { name: 'asc' },
      limit: take,
    });
    return movies.map(toMovieShape);
  },
});

export const getById = register({
  kind: 'query',
  name: 'movies.getById',
  reads: ['movie'],
  args: z.object({ id: z.string() }),
  handler: async (_ctx, { id }) => {
    const movie = await prisma.movie.findUnique({ where: { id } });
    return movie ? toMovieShape(movie) : null;
  },
});

export const getFeatured = register({
  kind: 'query',
  name: 'movies.getFeatured',
  reads: ['movie'],
  handler: async () => {
    const featured = await prisma.movie.findMany({ where: { featured: true }, take: 10 });
    if (featured.length > 0) return (await filterPlayableCatalog(featured)).map(toMovieShape);
    const fallback = await prisma.movie.findMany({ orderBy: { name: 'asc' }, take: 30 });
    return (await filterPlayableCatalog(fallback)).slice(0, 10).map(toMovieShape);
  },
});

export const getTrending = register({
  kind: 'query',
  name: 'movies.getTrending',
  reads: ['movie'],
  args: z.object({ limit: z.number().optional() }).optional(),
  handler: async (_ctx, args) => {
    const take = args?.limit ?? 12;
    const movies = await prisma.movie.findMany({
      orderBy: { releaseYear: 'desc' },
      take: take * 3,
    });
    return (await filterPlayableCatalog(movies)).slice(0, take).map(toMovieShape);
  },
});

export const getByGenre = register({
  kind: 'query',
  name: 'movies.getByGenre',
  reads: ['movie'],
  args: z.object({ genre: z.string(), limit: z.number().optional() }),
  handler: async (_ctx, { genre, limit }) => {
    const take = limit ?? 12;
    const wanted = genre.trim();
    if (!wanted) return [];
    const movies = await prisma.movie.findMany({
      where: genreTokenWhere(wanted),
      orderBy: { name: 'asc' },
      take: take * 4,
    });
    const matched = movies.filter((m) => movieMatchesGenre(m.genre, wanted));
    return (await filterPlayableCatalog(matched)).slice(0, take).map(toMovieShape);
  },
});

export const listSeries = register({
  kind: 'query',
  name: 'movies.listSeries',
  reads: ['movie', 'series'],
  handler: async () => {
    const series = await prisma.movie.findMany({
      where: { mediaType: 'SERIES' },
      orderBy: { name: 'asc' },
    });
    // Public catalog uses Movie.mediaType = SERIES (favorites/history/detail too).
    // Do NOT invent fake series from random movies when the table is empty —
    // that polluted /series and the home "Series" row with mislabeled films.
    // Admin `Series` rows are a separate table (see TODO "Unificar series").
    return series.map(toMovieShape);
  },
});

export const getGenres = register({
  kind: 'query',
  name: 'movies.getGenres',
  reads: ['movie'],
  handler: async () => {
    const movies = await prisma.movie.findMany({ select: { genre: true } });
    const set = new Set<string>();
    for (const m of movies) {
      for (const g of splitMovieGenres(m.genre)) set.add(g);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'es'));
  },
});

export const getYears = register({
  kind: 'query',
  name: 'movies.getYears',
  reads: ['movie'],
  handler: async () => {
    const movies = await prisma.movie.findMany({ select: { releaseYear: true } });
    return Array.from(new Set(movies.map((m) => m.releaseYear).filter(Boolean)))
      .sort()
      .reverse();
  },
});

export const getClassifications = register({
  kind: 'query',
  name: 'movies.getClassifications',
  reads: ['movie'],
  handler: async () => {
    const movies = await prisma.movie.findMany({ select: { classification: true } });
    return Array.from(new Set(movies.map((m) => m.classification).filter(Boolean))).sort();
  },
});

void AuthError;
