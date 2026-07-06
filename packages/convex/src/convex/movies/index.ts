import { queryGeneric, mutationGeneric } from 'convex/server';
import { v } from 'convex/values';

export const list = queryGeneric({
  args: {
    genre: v.optional(v.string()),
    year: v.optional(v.string()),
    classification: v.optional(v.string()),
    search: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let movies = await ctx.db.query('movies').collect();

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
    return movies;
  },
});

export const getById = queryGeneric({
  args: { id: v.id('movies') },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

export const getFeatured = queryGeneric({
  args: {},
  handler: async (ctx) => {
    const movies = await ctx.db.query('movies').take(10);
    return movies;
  },
});

export const getGenres = queryGeneric({
  args: {},
  handler: async (ctx) => {
    const movies = await ctx.db.query('movies').collect();
    const genres = [...new Set(movies.map((m) => m.genre))];
    return genres.sort();
  },
});

export const getYears = queryGeneric({
  args: {},
  handler: async (ctx) => {
    const movies = await ctx.db.query('movies').collect();
    const years = [...new Set(movies.map((m) => m.releaseYear))];
    return years.sort().reverse();
  },
});

export const getClassifications = queryGeneric({
  args: {},
  handler: async (ctx) => {
    const movies = await ctx.db.query('movies').collect();
    const classifications = [...new Set(movies.map((m) => m.classification))];
    return classifications.sort();
  },
});

export const create = mutationGeneric({
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
  },
  handler: async (ctx, args) => {
    const id = await ctx.db.insert('movies', args);
    return id;
  },
});

export const update = mutationGeneric({
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
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;
    await ctx.db.patch(id, updates);
    return id;
  },
});

export const remove = mutationGeneric({
  args: { id: v.id('movies') },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});

export const generateUploadUrl = mutationGeneric({
  args: {},
  handler: async (ctx) => {
    return await ctx.storage.generateUploadUrl();
  },
});
