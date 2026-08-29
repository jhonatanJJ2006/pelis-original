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

export const getContinueWatching = register({
  kind: 'query',
  name: 'history.getContinueWatching',
  reads: ['history', 'movie'],
  args: z.object({ userId: z.string().optional(), limit: z.number().optional() }).optional(),
  handler: async (ctx, args) => {
    const userId = requireUser(ctx);
    const all = await prisma.history.findMany({
      where: { userId },
      include: { movie: true },
    });
    const inProgress = all
      .filter((h) => h.duration > 0 && h.progress > 0 && h.progress < h.duration * 0.95)
      .sort((a, b) => b.lastWatched.getTime() - a.lastWatched.getTime())
      .slice(0, args?.limit ?? 10);
    return inProgress.map((h) => ({ ...h, movie: h.movie }));
  },
});
