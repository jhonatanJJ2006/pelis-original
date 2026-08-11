import { v } from 'convex/values';
import { query, mutation } from './_generated/server';
import { requireAdmin } from './lib/requireAdmin';

export const adminList = query({
  args: {
    search: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    const search = args.search?.trim().toLowerCase() ?? '';
    let series = await ctx.db.query('series').collect();

    if (search) {
      series = series.filter(
        (s) =>
          s.name.toLowerCase().includes(search) ||
          s.genre.toLowerCase().includes(search) ||
          s.actors.toLowerCase().includes(search)
      );
    }

    series.sort((a, b) => a.name.localeCompare(b.name));
    const sliced = series.slice(0, args.limit ?? 500);

    return sliced.map((s) => ({
      _id: s._id,
      name: s.name,
      image: s.image,
      synopsis: s.synopsis,
      genre: s.genre,
      token: s.token,
      actors: s.actors,
      classification: s.classification,
      releaseYear: s.releaseYear,
      episodes: s.episodes,
      season: s.season,
      featured: s.featured ?? false,
      isOrphanId: isOrphan(s.name, s.token),
    }));
  },
});

export const adminStats = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const series = await ctx.db.query('series').collect();
    let orphans = 0;
    let withEpisodes = 0;
    for (const s of series) {
      if (isOrphan(s.name, s.token)) orphans += 1;
      if (s.episodes && s.episodes > 0) withEpisodes += 1;
    }
    return {
      total: series.length,
      orphans,
      withEpisodes,
    };
  },
});

export const getById = query({
  args: { id: v.id('series') },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    return await ctx.db.get(args.id);
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    image: v.string(),
    synopsis: v.string(),
    genre: v.string(),
    token: v.string(),
    actors: v.string(),
    classification: v.string(),
    releaseYear: v.string(),
    episodes: v.optional(v.number()),
    season: v.optional(v.number()),
    featured: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    return await ctx.db.insert('series', args);
  },
});

export const update = mutation({
  args: {
    id: v.id('series'),
    name: v.string(),
    image: v.string(),
    synopsis: v.string(),
    genre: v.string(),
    token: v.string(),
    actors: v.string(),
    classification: v.string(),
    releaseYear: v.string(),
    episodes: v.optional(v.number()),
    season: v.optional(v.number()),
    featured: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const { id, ...rest } = args;
    await ctx.db.patch(id, rest);
    return id;
  },
});

export const remove = mutation({
  args: { id: v.id('series') },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    await ctx.db.delete(args.id);
  },
});

function isOrphan(name: string, token: string): boolean {
  const n = name.trim();
  if (!n) return true;
  if (/^[a-f0-9]{6,}$/i.test(n)) return true;
  if (/^ok(-ru-\d+)?$/i.test(n)) return true;
  if (/^document[-_]\d+$/i.test(n)) return true;
  if (n.toLowerCase() === token.toLowerCase()) return true;
  return false;
}