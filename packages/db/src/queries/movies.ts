import { z } from 'zod';
import { prisma } from '../client';
import { register } from '../registry';
import { AuthError } from '../lib/requireAdmin';
import { toMovieShape } from '../lib/shapes';

const MediaTypeEnum = z.enum(['movie', 'series']);

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
    })
    .optional(),
  handler: async (_ctx, args) => {
    const a = args ?? {};
    const where: Record<string, unknown> = {};
    if (a.mediaType) where.mediaType = a.mediaType === 'movie' ? 'MOVIE' : 'SERIES';
    if (a.genre) where.genre = a.genre;
    if (a.year) where.releaseYear = a.year;
    if (a.classification) where.classification = a.classification;
    if (a.search) {
      const q = a.search.toLowerCase();
      where.OR = [
        { name: { contains: q, mode: 'insensitive' } },
        { actors: { contains: q, mode: 'insensitive' } },
        { genre: { contains: q, mode: 'insensitive' } },
      ];
    }
    const movies = await prisma.movie.findMany({ where, orderBy: { name: 'asc' } });
    return movies.map(toMovieShape);
  },
});

export const search = register({
  kind: 'query',
  name: 'movies.search',
  reads: ['movie'],
  args: z.object({ q: z.string(), limit: z.number().optional() }),
  handler: async (_ctx, { q, limit }) => {
    const ql = q.toLowerCase();
    const movies = await prisma.movie.findMany({
      where: {
        OR: [
          { name: { contains: ql, mode: 'insensitive' } },
          { actors: { contains: ql, mode: 'insensitive' } },
        ],
      },
      orderBy: { name: 'asc' },
      take: limit ?? 8,
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
    if (featured.length > 0) return featured.map(toMovieShape);
    return (await prisma.movie.findMany({ orderBy: { name: 'asc' }, take: 10 })).map(toMovieShape);
  },
});

export const getTrending = register({
  kind: 'query',
  name: 'movies.getTrending',
  reads: ['movie'],
  args: z.object({ limit: z.number().optional() }).optional(),
  handler: async (_ctx, args) => {
    const movies = await prisma.movie.findMany({
      orderBy: { releaseYear: 'desc' },
      take: args?.limit ?? 12,
    });
    return movies.map(toMovieShape);
  },
});

export const getByGenre = register({
  kind: 'query',
  name: 'movies.getByGenre',
  reads: ['movie'],
  args: z.object({ genre: z.string(), limit: z.number().optional() }),
  handler: async (_ctx, { genre, limit }) => {
    return (await prisma.movie.findMany({
      where: { genre },
      orderBy: { name: 'asc' },
      take: limit ?? 12,
    })).map(toMovieShape);
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
    if (series.length > 0) return series.map(toMovieShape);
    const all = await prisma.movie.findMany({ orderBy: { name: 'asc' } });
    return all.filter((_, i) => i % 3 === 0).map((m) => ({
      ...toMovieShape(m),
      mediaType: 'series' as const,
      episodes: m.episodes ?? 8,
    }));
  },
});

export const getGenres = register({
  kind: 'query',
  name: 'movies.getGenres',
  reads: ['movie'],
  handler: async () => {
    const movies = await prisma.movie.findMany({ select: { genre: true } });
    return Array.from(new Set(movies.map((m) => m.genre).filter(Boolean))).sort();
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