import { z } from 'zod';
import { prisma } from '../client';
import { register } from '../registry';
import { toMovieShape } from '../lib/shapes';

export const listByUser = register({
  kind: 'query',
  name: 'favorites.listByUser',
  reads: ['favorite', 'movie'],
  args: z.object({ userId: z.string() }),
  handler: async (_ctx, { userId }) => {
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
  args: z.object({ userId: z.string(), movieId: z.string() }),
  handler: async (_ctx, { userId, movieId }) => {
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
  args: z.object({ userId: z.string(), movieId: z.string() }),
  handler: async (_ctx, { userId, movieId }) => {
    const fav = await prisma.favorite.upsert({
      where: { userId_movieId: { userId, movieId } },
      create: { userId, movieId },
      update: {},
    });
    return fav.id;
  },
});

export const remove = register({
  kind: 'mutation',
  name: 'favorites.remove',
  writes: ['favorite'],
  args: z.object({ userId: z.string(), movieId: z.string() }),
  handler: async (_ctx, { userId, movieId }) => {
    await prisma.favorite.deleteMany({ where: { userId, movieId } });
    return true;
  },
});