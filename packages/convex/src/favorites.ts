import { v } from 'convex/values';
import { query, mutation } from './_generated/server';

export const listByUser = query({
  args: { userId: v.id('user') },
  handler: async (ctx, args) => {
    const favorites = await ctx.db
      .query('favorites')
      .withIndex('by_user', (q) => q.eq('userId', args.userId))
      .collect();

    const movies = await Promise.all(
      favorites.map((fav) => ctx.db.get(fav.movieId))
    );

    return movies.filter(Boolean);
  },
});

export const check = query({
  args: { userId: v.id('user'), movieId: v.id('movies') },
  handler: async (ctx, args) => {
    const favorite = await ctx.db
      .query('favorites')
      .withIndex('by_user_movie', (q) =>
        q.eq('userId', args.userId).eq('movieId', args.movieId)
      )
      .first();

    return !!favorite;
  },
});

export const add = mutation({
  args: { userId: v.id('user'), movieId: v.id('movies') },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query('favorites')
      .withIndex('by_user_movie', (q) =>
        q.eq('userId', args.userId).eq('movieId', args.movieId)
      )
      .first();

    if (existing) return existing._id;

    const id = await ctx.db.insert('favorites', {
      userId: args.userId,
      movieId: args.movieId,
      createdAt: Date.now(),
    });

    return id;
  },
});

export const remove = mutation({
  args: { userId: v.id('user'), movieId: v.id('movies') },
  handler: async (ctx, args) => {
    const favorite = await ctx.db
      .query('favorites')
      .withIndex('by_user_movie', (q) =>
        q.eq('userId', args.userId).eq('movieId', args.movieId)
      )
      .first();

    if (favorite) {
      await ctx.db.delete(favorite._id);
    }

    return true;
  },
});
