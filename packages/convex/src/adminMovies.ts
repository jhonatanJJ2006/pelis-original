import { v } from 'convex/values';
import { query, mutation } from './_generated/server';
import { enrichMovies } from './lib/resolveMovieImage';
import { requireAdmin } from './lib/requireAdmin';
import {
  getMovieQualityFlags,
  matchesQualityFilter,
  type MovieQualityFilter,
} from './lib/movieQuality';

const qualityFilterValidator = v.union(
  v.literal('all'),
  v.literal('orphan_ids'),
  v.literal('missing_image'),
  v.literal('missing_video'),
  v.literal('incomplete')
);

export const adminList = query({
  args: {
    search: v.optional(v.string()),
    qualityFilter: v.optional(qualityFilterValidator),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    const filter: MovieQualityFilter = args.qualityFilter ?? 'all';
    const searchLower = args.search?.trim().toLowerCase() ?? '';

    let movies = await ctx.db.query('movies').collect();

    if (searchLower) {
      movies = movies.filter(
        (movie) =>
          movie.name.toLowerCase().includes(searchLower) ||
          movie.token.toLowerCase().includes(searchLower) ||
          movie.actors.toLowerCase().includes(searchLower)
      );
    }

    if (filter !== 'all') {
      movies = movies.filter((movie) => matchesQualityFilter(movie, filter));
    }

    movies.sort((a, b) => a.name.localeCompare(b.name));

    const limit = args.limit ?? 200;
    const sliced = movies.slice(0, limit);
    const enriched = await enrichMovies(ctx, sliced);

    return enriched.map((movie) => ({
      ...movie,
      quality: getMovieQualityFlags(movie),
    }));
  },
});

export const adminStats = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);

    const movies = await ctx.db.query('movies').collect();
    let orphanIds = 0;
    let missingImage = 0;
    let missingVideo = 0;
    let incomplete = 0;

    for (const movie of movies) {
      const flags = getMovieQualityFlags(movie);
      if (flags.isOrphanId) orphanIds += 1;
      if (flags.isMissingImage) missingImage += 1;
      if (flags.isMissingVideo) missingVideo += 1;
      if (flags.isIncomplete) incomplete += 1;
    }

    return {
      total: movies.length,
      orphanIds,
      missingImage,
      missingVideo,
      incomplete,
    };
  },
});

export const adminSearchTargets = query({
  args: {
    q: v.string(),
    excludeId: v.optional(v.id('movies')),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    const q = args.q.trim().toLowerCase();
    if (!q) return [];

    const movies = await ctx.db.query('movies').collect();
    const filtered = movies
      .filter((movie) => {
        if (args.excludeId && movie._id === args.excludeId) return false;
        return (
          movie.name.toLowerCase().includes(q) ||
          movie.token.toLowerCase().includes(q)
        );
      })
      .slice(0, args.limit ?? 10);

    return enrichMovies(ctx, filtered);
  },
});

export const merge = mutation({
  args: {
    sourceId: v.id('movies'),
    targetId: v.id('movies'),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    if (args.sourceId === args.targetId) {
      throw new Error('No puedes fusionar una película consigo misma');
    }

    const source = await ctx.db.get(args.sourceId);
    const target = await ctx.db.get(args.targetId);

    if (!source || !target) {
      throw new Error('Película no encontrada');
    }

    const patch: Partial<typeof target> = {};

    if (!target.videoUrl && source.videoUrl) {
      patch.videoUrl = source.videoUrl;
    }

    if ((!target.image || target.image.endsWith('placeholder.webp')) && source.image) {
      patch.image = source.image;
      if (source.imageId) patch.imageId = source.imageId;
    }

    if (!target.synopsis && source.synopsis) patch.synopsis = source.synopsis;
    if (!target.actors && source.actors) patch.actors = source.actors;
    if (!target.genre && source.genre) patch.genre = source.genre;
    if (!target.classification && source.classification) {
      patch.classification = source.classification;
    }
    if (!target.releaseYear && source.releaseYear) patch.releaseYear = source.releaseYear;

    if (Object.keys(patch).length > 0) {
      await ctx.db.patch(args.targetId, patch);
    }

    const favorites = await ctx.db
      .query('favorites')
      .withIndex('by_movie', (q) => q.eq('movieId', args.sourceId))
      .collect();

    for (const favorite of favorites) {
      const existing = await ctx.db
        .query('favorites')
        .withIndex('by_user_movie', (q) =>
          q.eq('userId', favorite.userId).eq('movieId', args.targetId)
        )
        .first();

      if (existing) {
        await ctx.db.delete(favorite._id);
      } else {
        await ctx.db.patch(favorite._id, { movieId: args.targetId });
      }
    }

    const historyItems = await ctx.db
      .query('history')
      .withIndex('by_movie', (q) => q.eq('movieId', args.sourceId))
      .collect();

    for (const item of historyItems) {
      const existing = await ctx.db
        .query('history')
        .withIndex('by_user_movie', (q) =>
          q.eq('userId', item.userId).eq('movieId', args.targetId)
        )
        .first();

      if (existing) {
        await ctx.db.patch(existing._id, {
          progress: Math.max(existing.progress, item.progress),
          duration: Math.max(existing.duration, item.duration),
          lastWatched: Math.max(existing.lastWatched, item.lastWatched),
        });
        await ctx.db.delete(item._id);
      } else {
        await ctx.db.patch(item._id, { movieId: args.targetId });
      }
    }

    await ctx.db.delete(args.sourceId);

    return args.targetId;
  },
});
