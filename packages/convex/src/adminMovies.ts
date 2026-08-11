import { v } from 'convex/values';
import { query, mutation } from './_generated/server';
import { enrichMovies } from './lib/resolveMovieImage';
import { requireAdmin } from './lib/requireAdmin';
import {
  getMovieQualityFlags,
  hasValidMovieTitle,
  isMissingBackdrop,
  isMissingImage,
  isMissingVideo,
  matchesQualityFilter,
  needsPosterWithValidTitle,
  type MovieQualityFilter,
} from './lib/movieQuality';
import type { Doc, Id } from './_generated/dataModel';
import type { MutationCtx } from './_generated/server';

const qualityFilterValidator = v.union(
  v.literal('all'),
  v.literal('orphan_ids'),
  v.literal('missing_image'),
  v.literal('missing_image_titled'),
  v.literal('missing_video'),
  v.literal('incomplete'),
  v.literal('missing_backdrop')
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
    let missingImageTitled = 0;
    let missingVideo = 0;
    let incomplete = 0;
    let missingBackdrop = 0;

    for (const movie of movies) {
      const flags = getMovieQualityFlags(movie);
      if (flags.isOrphanId) orphanIds += 1;
      if (flags.isMissingImage) missingImage += 1;
      if (needsPosterWithValidTitle(movie)) missingImageTitled += 1;
      if (flags.isMissingVideo) missingVideo += 1;
      if (flags.isIncomplete) incomplete += 1;
      if (
        flags.isMissingBackdrop &&
        hasValidMovieTitle(movie.name, movie.token)
      ) {
        missingBackdrop += 1;
      }
    }

    return {
      total: movies.length,
      orphanIds,
      missingImage,
      missingImageTitled,
      missingVideo,
      incomplete,
      missingBackdrop,
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

const orphanEntryValidator = v.object({
  token: v.string(),
  name: v.string(),
  synopsis: v.string(),
  genre: v.string(),
  actors: v.string(),
  classification: v.string(),
  releaseYear: v.string(),
  image: v.optional(v.string()),
  videoUrl: v.optional(v.string()),
  clearVideoUrl: v.optional(v.boolean()),
  mediaType: v.optional(v.union(v.literal('movie'), v.literal('series'))),
});

function normalizeName(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

async function migrateMovieReferences(
  ctx: MutationCtx,
  sourceId: Id<'movies'>,
  targetId: Id<'movies'>
) {
  const favorites = await ctx.db
    .query('favorites')
    .withIndex('by_movie', (q) => q.eq('movieId', sourceId))
    .collect();

  for (const favorite of favorites) {
    const existing = await ctx.db
      .query('favorites')
      .withIndex('by_user_movie', (q) =>
        q.eq('userId', favorite.userId).eq('movieId', targetId)
      )
      .first();

    if (existing) {
      await ctx.db.delete(favorite._id);
    } else {
      await ctx.db.patch(favorite._id, { movieId: targetId });
    }
  }

  const historyItems = await ctx.db
    .query('history')
    .withIndex('by_movie', (q) => q.eq('movieId', sourceId))
    .collect();

  for (const item of historyItems) {
    const existing = await ctx.db
      .query('history')
      .withIndex('by_user_movie', (q) =>
        q.eq('userId', item.userId).eq('movieId', targetId)
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
      await ctx.db.patch(item._id, { movieId: targetId });
    }
  }
}

function buildPatchFromEntry(
  entry: {
    name: string;
    synopsis: string;
    genre: string;
    actors: string;
    classification: string;
    releaseYear: string;
    image?: string;
    videoUrl?: string;
    clearVideoUrl?: boolean;
    mediaType?: 'movie' | 'series';
  },
  existing: Doc<'movies'>
): Partial<Doc<'movies'>> {
  const patch: Partial<Doc<'movies'>> = {
    name: entry.name,
    synopsis: entry.synopsis,
    genre: entry.genre,
    actors: entry.actors,
    classification: entry.classification,
    releaseYear: entry.releaseYear,
    mediaType: entry.mediaType ?? 'movie',
  };

  if (entry.videoUrl) {
    patch.videoUrl = entry.videoUrl;
  } else if (entry.clearVideoUrl) {
    patch.videoUrl = undefined;
  }

  if (entry.image && isMissingImage(existing.image)) {
    patch.image = entry.image;
  }

  return patch;
}

export const bulkLinkOrphans = mutation({
  args: {
    entries: v.array(orphanEntryValidator),
    deleteTokens: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const movies = await ctx.db.query('movies').collect();
    const byToken = new Map(movies.map((movie) => [movie.token, movie]));

    const results: Array<{
      token: string;
      action: 'updated' | 'merged' | 'skipped';
      name: string;
      message?: string;
    }> = [];

    for (const entry of args.entries) {
      const orphan = byToken.get(entry.token);
      if (!orphan) {
        results.push({
          token: entry.token,
          action: 'skipped',
          name: entry.name,
          message: 'Token no encontrado en BD',
        });
        continue;
      }

      const normalized = normalizeName(entry.name);
      const duplicate = movies.find(
        (movie) =>
          movie._id !== orphan._id &&
          normalizeName(movie.name) === normalized &&
          movie.token !== entry.token
      );

      if (duplicate && isMissingVideo(duplicate.videoUrl)) {
        const patch = buildPatchFromEntry(entry, duplicate);
        if (entry.videoUrl) patch.videoUrl = entry.videoUrl;
        if (entry.image && isMissingImage(duplicate.image)) {
          patch.image = entry.image;
        }
        await ctx.db.patch(duplicate._id, patch);
        await migrateMovieReferences(ctx, orphan._id, duplicate._id);
        await ctx.db.delete(orphan._id);
        byToken.delete(entry.token);

        results.push({
          token: entry.token,
          action: 'merged',
          name: entry.name,
        });
        continue;
      }

      const patch = buildPatchFromEntry(entry, orphan);
      await ctx.db.patch(orphan._id, patch);

      results.push({
        token: entry.token,
        action: 'updated',
        name: entry.name,
      });
    }

    if (args.deleteTokens?.length) {
      for (const token of args.deleteTokens) {
        const movie = byToken.get(token) ?? movies.find((m) => m.token === token);
        if (movie) {
          await ctx.db.delete(movie._id);
          results.push({
            token,
            action: 'skipped',
            name: token,
            message: 'Registro huérfano eliminado',
          });
        }
      }
    }

    return results;
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

    await migrateMovieReferences(ctx, args.sourceId, args.targetId);
    await ctx.db.delete(args.sourceId);

    return args.targetId;
  },
});
