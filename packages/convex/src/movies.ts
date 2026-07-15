import { v } from 'convex/values';
import { query, mutation } from './_generated/server';
import {
  enrichMovieImage,
  enrichMovies,
  resolveImageFromStorage,
} from './lib/resolveMovieImage';

export const list = query({
  args: {
    genre: v.optional(v.string()),
    year: v.optional(v.string()),
    classification: v.optional(v.string()),
    search: v.optional(v.string()),
    mediaType: v.optional(v.union(v.literal('movie'), v.literal('series'))),
  },
  handler: async (ctx, args) => {
    let movies = await ctx.db.query('movies').collect();

    if (args.mediaType) {
      movies = movies.filter(
        (m) => (m.mediaType ?? 'movie') === args.mediaType
      );
    }

    if (args.genre) {
      movies = movies.filter((m) => m.genre === args.genre);
    }

    if (args.year) {
      movies = movies.filter((m) => m.releaseYear === args.year);
    }

    if (args.classification) {
      movies = movies.filter((m) => m.classification === args.classification);
    }

    if (args.search) {
      const searchLower = args.search.toLowerCase();
      movies = movies.filter(
        (m) =>
          m.name.toLowerCase().includes(searchLower) ||
          m.actors.toLowerCase().includes(searchLower) ||
          m.genre.toLowerCase().includes(searchLower)
      );
    }

    movies.sort((a, b) => a.name.localeCompare(b.name));
    return enrichMovies(ctx, movies);
  },
});

export const getById = query({
  args: { id: v.id('movies') },
  handler: async (ctx, args) => {
    const movie = await ctx.db.get(args.id);
    return enrichMovieImage(ctx, movie);
  },
});

export const getFeatured = query({
  args: {},
  handler: async (ctx) => {
    const movies = await ctx.db.query('movies').collect();
    const featured = movies.filter((m) => m.featured);
    const selected =
      featured.length > 0 ? featured.slice(0, 10) : movies.slice(0, 10);
    return enrichMovies(ctx, selected);
  },
});

export const getTrending = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const movies = await ctx.db.query('movies').collect();
    const trending = movies
      .sort((a, b) => b.releaseYear.localeCompare(a.releaseYear))
      .slice(0, args.limit ?? 12);
    return enrichMovies(ctx, trending);
  },
});

export const getByGenre = query({
  args: { genre: v.string(), limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const movies = await ctx.db.query('movies').collect();
    const filtered = movies
      .filter((m) => m.genre === args.genre)
      .slice(0, args.limit ?? 12);
    return enrichMovies(ctx, filtered);
  },
});

export const listSeries = query({
  args: {},
  handler: async (ctx) => {
    const movies = await ctx.db.query('movies').collect();
    const series = movies.filter((m) => m.mediaType === 'series');
    if (series.length > 0) {
      return enrichMovies(
        ctx,
        series.sort((a, b) => a.name.localeCompare(b.name))
      );
    }
    const fallback = movies
      .filter((_, index) => index % 3 === 0)
      .map((m) => ({
        ...m,
        mediaType: 'series' as const,
        episodes: m.episodes ?? 8,
      }));
    return enrichMovies(ctx, fallback);
  },
});

export const getGenres = query({
  args: {},
  handler: async (ctx) => {
    const movies = await ctx.db.query('movies').collect();
    const genres = [...new Set(movies.map((m) => m.genre))];
    return genres.sort();
  },
});

export const getYears = query({
  args: {},
  handler: async (ctx) => {
    const movies = await ctx.db.query('movies').collect();
    const years = [...new Set(movies.map((m) => m.releaseYear))];
    return years.sort().reverse();
  },
});

export const getClassifications = query({
  args: {},
  handler: async (ctx) => {
    const movies = await ctx.db.query('movies').collect();
    const classifications = [...new Set(movies.map((m) => m.classification))];
    return classifications.sort();
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    image: v.string(),
    imageId: v.optional(v.id('_storage')),
    synopsis: v.string(),
    genre: v.string(),
    token: v.string(),
    actors: v.string(),
    classification: v.string(),
    releaseYear: v.string(),
    videoUrl: v.optional(v.string()),
    mediaType: v.optional(v.union(v.literal('movie'), v.literal('series'))),
    episodes: v.optional(v.number()),
    featured: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const image = await resolveImageFromStorage(ctx, args.image, args.imageId);
    const id = await ctx.db.insert('movies', { ...args, image });
    return id;
  },
});

export const update = mutation({
  args: {
    id: v.id('movies'),
    name: v.string(),
    image: v.string(),
    imageId: v.optional(v.id('_storage')),
    synopsis: v.string(),
    genre: v.string(),
    token: v.string(),
    actors: v.string(),
    classification: v.string(),
    releaseYear: v.string(),
    videoUrl: v.optional(v.string()),
    mediaType: v.optional(v.union(v.literal('movie'), v.literal('series'))),
    episodes: v.optional(v.number()),
    featured: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;
    const image = await resolveImageFromStorage(
      ctx,
      updates.image,
      updates.imageId
    );
    await ctx.db.patch(id, { ...updates, image });
    return id;
  },
});

export const remove = mutation({
  args: { id: v.id('movies') },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});

export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    return await ctx.storage.generateUploadUrl();
  },
});
