import { v } from 'convex/values';
import { query, mutation } from './_generated/server';
import { enrichMovieImage } from './lib/resolveMovieImage';

export const listByUser = query({
  args: { userId: v.id('user') },
  handler: async (ctx, args) => {
    const history = await ctx.db
      .query('history')
      .withIndex('by_user', (q) => q.eq('userId', args.userId))
      .collect();

    const historyWithMovies = await Promise.all(
      history.map(async (h) => {
        const movie = await ctx.db.get(h.movieId);
        return { ...h, movie: await enrichMovieImage(ctx, movie) };
      })
    );

    return historyWithMovies.sort((a, b) => b.lastWatched - a.lastWatched);
  },
});

export const getByUserAndMovie = query({
  args: { userId: v.id('user'), movieId: v.id('movies') },
  handler: async (ctx, args) => {
    const history = await ctx.db
      .query('history')
      .withIndex('by_user_movie', (q) =>
        q.eq('userId', args.userId).eq('movieId', args.movieId)
      )
      .first();

    return history;
  },
});

export const upsert = mutation({
  args: {
    userId: v.id('user'),
    movieId: v.id('movies'),
    progress: v.number(),
    duration: v.number(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query('history')
      .withIndex('by_user_movie', (q) =>
        q.eq('userId', args.userId).eq('movieId', args.movieId)
      )
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        progress: args.progress,
        duration: args.duration,
        lastWatched: Date.now(),
      });
      return existing._id;
    }

    const id = await ctx.db.insert('history', {
      userId: args.userId,
      movieId: args.movieId,
      progress: args.progress,
      duration: args.duration,
      lastWatched: Date.now(),
    });

    return id;
  },
});

export const remove = mutation({
  args: { userId: v.id('user'), movieId: v.id('movies') },
  handler: async (ctx, args) => {
    const history = await ctx.db
      .query('history')
      .withIndex('by_user_movie', (q) =>
        q.eq('userId', args.userId).eq('movieId', args.movieId)
      )
      .first();

    if (history) {
      await ctx.db.delete(history._id);
    }

    return true;
  },
});

export const clearAll = mutation({
  args: { userId: v.id('user') },
  handler: async (ctx, args) => {
    const history = await ctx.db
      .query('history')
      .withIndex('by_user', (q) => q.eq('userId', args.userId))
      .collect();

    await Promise.all(history.map((item) => ctx.db.delete(item._id)));
    return true;
  },
});

export const getContinueWatching = query({
  args: { userId: v.id('user'), limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const history = await ctx.db
      .query('history')
      .withIndex('by_user', (q) => q.eq('userId', args.userId))
      .collect();

    const inProgress = history
      .filter((h) => h.duration > 0 && h.progress > 0 && h.progress < h.duration * 0.95)
      .sort((a, b) => b.lastWatched - a.lastWatched);

    const limited = inProgress.slice(0, args.limit ?? 10);

    return Promise.all(
      limited.map(async (h) => {
        const movie = await ctx.db.get(h.movieId);
        return { ...h, movie: await enrichMovieImage(ctx, movie) };
      })
    );
  },
});
