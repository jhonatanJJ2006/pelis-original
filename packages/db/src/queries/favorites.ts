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
