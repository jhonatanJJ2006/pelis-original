import { z } from 'zod';
import { prisma } from '../client';
import { register } from '../registry';
import { notifyChange } from '../realtime';
import { toMovieShape } from '../lib/shapes';
import { requireUser } from '../lib/requireAdmin';

export const listByUser = register({
  kind: 'query',
  name: 'favorites.listByUser',
  reads: ['favorite', 'movie'],
  args: z.object({ userId: z.string().optional() }).optional(),
  handler: async (ctx) => {
    const userId = requireUser(ctx);
    const favorites = await prisma.favorite.findMany({
      where: { userId },
      include: { movie: true },
      orderBy: { createdAt: 'desc' },
    });
    return favorites.map((f) => (f.movie ? toMovieShape(f.movie) : null)).filter(Boolean);
  },
});

export const check = register({
  kind: 'query',
  name: 'favorites.check',
  reads: ['favorite'],
  args: z.object({ userId: z.string().optional(), movieId: z.string() }),
  handler: async (ctx, { movieId }) => {
    const userId = requireUser(ctx);
    const fav = await prisma.favorite.findUnique({
      where: { userId_movieId: { userId, movieId } },
    });
    return !!fav;
  },
});

export const add = register({
  kind: 'mutation',
  name: 'favorites.add',
  writes: ['favorite'],
  args: z.object({ userId: z.string().optional(), movieId: z.string() }),
  handler: async (ctx, { movieId }) => {
    const userId = requireUser(ctx);
    const fav = await prisma.favorite.upsert({
      where: { userId_movieId: { userId, movieId } },
      create: { userId, movieId },
      update: {},
    });
    // Sin este aviso, el botón de Mi lista no se actualizaba hasta recargar.
    await notifyChange('favorite', 'insert', fav.id);
    return fav.id;
  },
});

export const remove = register({
  kind: 'mutation',
  name: 'favorites.remove',
  writes: ['favorite'],
  args: z.object({ userId: z.string().optional(), movieId: z.string() }),
  handler: async (ctx, { movieId }) => {
    const userId = requireUser(ctx);
    await prisma.favorite.deleteMany({ where: { userId, movieId } });
    await notifyChange('favorite', 'delete', movieId);
    return true;
  },
});

/** Mi lista paginada en servidor: { items, total, offset, limit, hasMore }. */
export const listByUserPage = register({
  kind: 'query',
  name: 'favorites.listByUserPage',
  reads: ['favorite', 'movie'],
  args: z
    .object({
      userId: z.string().optional(),
      mediaType: z.enum(['movie', 'series']).optional(),
      limit: z.number().int().positive().max(100).optional(),
      offset: z.number().int().min(0).optional(),
    })
    .optional(),
  handler: async (ctx, args) => {
    const userId = requireUser(ctx);
    const limit = args?.limit ?? 24;
    const offset = args?.offset ?? 0;
    const base = { userId };
    const where = args?.mediaType
      ? { userId, movie: { mediaType: args.mediaType === 'series' ? 'SERIES' : 'MOVIE' } }
      : base;
    const [total, seriesCount, all, rows] = await Promise.all([
      prisma.favorite.count({ where: where as never }),
      prisma.favorite.count({ where: { userId, movie: { mediaType: 'SERIES' } } }),
      prisma.favorite.count({ where: base }),
      prisma.favorite.findMany({
        where: where as never,
        include: { movie: true },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
    ]);
    return {
      items: rows.map((f) => (f.movie ? toMovieShape(f.movie) : null)).filter(Boolean),
      total,
      counts: { all, series: seriesCount, movies: all - seriesCount },
      offset,
      limit,
      hasMore: offset + limit < total,
    };
  },
});
