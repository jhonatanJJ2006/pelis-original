import { z } from 'zod';
import { prisma } from '../client';
import { register } from '../registry';
import { toMovieShape } from '../lib/shapes';
import { requireUser } from '../lib/requireAdmin';

export const listByUser = register({
  kind: 'query',
  name: 'history.listByUser',
  reads: ['history', 'movie'],
  args: z.object({ userId: z.string().optional() }).optional(),
  handler: async (ctx) => {
    const userId = requireUser(ctx);
    const items = await prisma.history.findMany({
      where: { userId },
      include: { movie: true },
      orderBy: { lastWatched: 'desc' },
    });
    return items.map((h) => ({
      ...h,
      movie: h.movie ? toMovieShape(h.movie) : null,
    }));
  },
});

export const getByUserAndMovie = register({
  kind: 'query',
  name: 'history.getByUserAndMovie',
  reads: ['history'],
  args: z.object({ userId: z.string().optional(), movieId: z.string() }),
  handler: async (ctx, { movieId }) => {
    const userId = requireUser(ctx);
    return prisma.history.findUnique({
      where: { userId_movieId: { userId, movieId } },
    });
  },
});

export const upsert = register({
  kind: 'mutation',
  name: 'history.upsert',
  writes: ['history'],
  args: z.object({
    userId: z.string().optional(),
    movieId: z.string(),
    progress: z.number(),
    duration: z.number(),
  }),
  handler: async (ctx, args) => {
    const userId = requireUser(ctx);
    const row = await prisma.history.upsert({
      where: { userId_movieId: { userId, movieId: args.movieId } },
      create: {
        userId,
        movieId: args.movieId,
        progress: args.progress,
        duration: args.duration,
        lastWatched: new Date(),
      },
      update: {
        progress: args.progress,
        duration: args.duration,
        lastWatched: new Date(),
      },
    });
    return row.id;
  },
});

export const remove = register({
  kind: 'mutation',
  name: 'history.remove',
  writes: ['history'],
  args: z.object({ userId: z.string().optional(), movieId: z.string() }),
  handler: async (ctx, { movieId }) => {
    const userId = requireUser(ctx);
    await prisma.history.deleteMany({ where: { userId, movieId } });
    return true;
  },
});

export const clearAll = register({
  kind: 'mutation',
  name: 'history.clearAll',
  writes: ['history'],
  args: z.object({ userId: z.string().optional() }).optional(),
  handler: async (ctx) => {
    const userId = requireUser(ctx);
    await prisma.history.deleteMany({ where: { userId } });
    return true;
  },
});

/**
 * Fila de historial con la película en forma pública (`_id`, imagen resuelta:
 * imageId → /uploads, hash → /peliculas/peliculas). Se mantienen `id` y
 * `mediaType` en mayúsculas para las APK de TV ≤ 2.0.1, que leían la fila cruda.
 */
function shapeHistoryMovie<M extends { id: string; mediaType: string }>(movie: M) {
  return {
    ...(toMovieShape(movie as never) as object),
    id: movie.id,
    mediaType: movie.mediaType,
  } as Record<string, unknown>;
}

const continueWhere = (userId: string) => ({ userId, duration: { gt: 0 }, progress: { gt: 0 } });

export const getContinueWatching = register({
  kind: 'query',
  name: 'history.getContinueWatching',
  reads: ['history', 'movie'],
  args: z.object({ userId: z.string().optional(), limit: z.number().optional() }).optional(),
  handler: async (ctx, args) => {
    const userId = requireUser(ctx);
    const all = await prisma.history.findMany({
      where: continueWhere(userId),
      include: { movie: true },
      orderBy: { lastWatched: 'desc' },
    });
    const inProgress = all
      .filter((h) => h.progress < h.duration * 0.95)
      .slice(0, Math.min(Math.max(args?.limit ?? 10, 1), 50));
    // Antes devolvía `movie` crudo de Prisma: sin `_id` (el enlace de la web iba a
    // /movies/undefined) y con `image` sin resolver (se ignoraba imageId).
    return inProgress.map((h) => ({ ...h, movie: h.movie ? shapeHistoryMovie(h.movie) : null }));
  },
});

/** Historial paginado en servidor: { items, total, offset, limit, hasMore }. */
export const listByUserPage = register({
  kind: 'query',
  name: 'history.listByUserPage',
  reads: ['history', 'movie'],
  args: z
    .object({
      userId: z.string().optional(),
      limit: z.number().int().positive().max(100).optional(),
      offset: z.number().int().min(0).optional(),
    })
    .optional(),
  handler: async (ctx, args) => {
    const userId = requireUser(ctx);
    const limit = args?.limit ?? 24;
    const offset = args?.offset ?? 0;
    const [total, rows] = await Promise.all([
      prisma.history.count({ where: { userId } }),
      prisma.history.findMany({
        where: { userId },
        include: { movie: true },
        orderBy: { lastWatched: 'desc' },
        take: limit,
        skip: offset,
      }),
    ]);
    return {
      items: rows.map((h) => ({ ...h, movie: h.movie ? toMovieShape(h.movie) : null })),
      total,
      offset,
      limit,
      hasMore: offset + limit < total,
    };
  },
});
