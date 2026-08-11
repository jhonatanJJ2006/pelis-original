import { v } from 'convex/values';
import { query, mutation } from './_generated/server';
import { requireAdmin } from './lib/requireAdmin';

export const adminList = query({
  args: {
    search: v.optional(v.string()),
    status: v.optional(v.union(v.literal('ongoing'), v.literal('completed'))),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    const search = args.search?.trim().toLowerCase() ?? '';
    let anime = await ctx.db.query('anime').collect();

    if (args.status) {
      anime = anime.filter((a) => a.status === args.status);
    }

    if (search) {
      anime = anime.filter(
        (a) =>
          a.title.toLowerCase().includes(search) ||
          (a.alternativeTitle ?? '').toLowerCase().includes(search)
      );
    }

    anime.sort((a, b) => a.title.localeCompare(b.title));
    return anime.slice(0, args.limit ?? 500);
  },
});

export const adminStats = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const anime = await ctx.db.query('anime').collect();
    let ongoing = 0;
    let completed = 0;
    let totalEpisodes = 0;
    for (const a of anime) {
      if (a.status === 'ongoing') ongoing += 1;
      else completed += 1;
      totalEpisodes += a.episodes ?? 0;
    }
    return {
      total: anime.length,
      ongoing,
      completed,
      totalEpisodes,
    };
  },
});

export const getById = query({
  args: { id: v.id('anime') },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    return await ctx.db.get(args.id);
  },
});

export const create = mutation({
  args: {
    title: v.string(),
    alternativeTitle: v.optional(v.string()),
    image: v.string(),
    synopsis: v.string(),
    genre: v.array(v.string()),
    episodes: v.number(),
    status: v.union(v.literal('ongoing'), v.literal('completed')),
    year: v.number(),
    rating: v.optional(v.number()),
    providers: v.array(
      v.object({
        name: v.string(),
        url: v.string(),
        language: v.union(v.literal('sub'), v.literal('dub'), v.literal('esp')),
        isActive: v.boolean(),
      })
    ),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    return await ctx.db.insert('anime', args);
  },
});

export const update = mutation({
  args: {
    id: v.id('anime'),
    title: v.string(),
    alternativeTitle: v.optional(v.string()),
    image: v.string(),
    synopsis: v.string(),
    genre: v.array(v.string()),
    episodes: v.number(),
    status: v.union(v.literal('ongoing'), v.literal('completed')),
    year: v.number(),
    rating: v.optional(v.number()),
    providers: v.array(
      v.object({
        name: v.string(),
        url: v.string(),
        language: v.union(v.literal('sub'), v.literal('dub'), v.literal('esp')),
        isActive: v.boolean(),
      })
    ),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const { id, ...rest } = args;
    await ctx.db.patch(id, rest);
    return id;
  },
});

export const remove = mutation({
  args: { id: v.id('anime') },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    await ctx.db.delete(args.id);
  },
});