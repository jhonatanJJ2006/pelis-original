import { z } from 'zod';
import { prisma } from '../client';
import { register } from '../registry';
import { toMovieShape } from '../lib/shapes';

export const listByUser = register({
  kind: 'query',
  name: 'history.listByUser',
  reads: ['history', 'movie'],
  args: z.object({ userId: z.string() }),
  handler: async (_ctx, { userId }) => {
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
  args: z.object({ userId: z.string(), movieId: z.string() }),
  handler: async (_ctx, { userId, movieId }) => {
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
    userId: z.string(),
    movieId: z.string(),
    progress: z.number(),
    duration: z.number(),
  }),
  handler: async (_ctx, args) => {
    const row = await prisma.history.upsert({
      where: { userId_movieId: { userId: args.userId, movieId: args.movieId } },
      create: {
        userId: args.userId,
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
  args: z.object({ userId: z.string(), movieId: z.string() }),
  handler: async (_ctx, { userId, movieId }) => {
    await prisma.history.deleteMany({ where: { userId, movieId } });
    return true;
  },
});

export const clearAll = register({
  kind: 'mutation',
  name: 'history.clearAll',
  writes: ['history'],
  args: z.object({ userId: z.string() }),
  handler: async (_ctx, { userId }) => {
    await prisma.history.deleteMany({ where: { userId } });
    return true;
  },
});

export const getContinueWatching = register({
  kind: 'query',
  name: 'history.getContinueWatching',
  reads: ['history', 'movie'],
  args: z.object({ userId: z.string(), limit: z.number().optional() }),
  handler: async (_ctx, { userId, limit }) => {
    const all = await prisma.history.findMany({
      where: { userId },
      include: { movie: true },
    });
    const inProgress = all
      .filter((h) => h.duration > 0 && h.progress > 0 && h.progress < h.duration * 0.95)
      .sort((a, b) => b.lastWatched.getTime() - a.lastWatched.getTime())
      .slice(0, limit ?? 10);
    return inProgress.map((h) => ({ ...h, movie: h.movie }));
  },
});