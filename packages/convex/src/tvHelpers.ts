import { v } from 'convex/values';
import { internalMutation, internalQuery } from './_generated/server';

export const listAllActiveUrls = internalQuery({
  args: {},
  handler: async (ctx) => {
    const channels = await ctx.db
      .query('tvChannels')
      .filter((q) => q.eq(q.field('isActive'), true))
      .collect();
    return channels.map((c) => c.streamUrl);
  },
});

export const upsertChannel = internalMutation({
  args: {
    playlistId: v.optional(v.id('tvPlaylists')),
    streamUrl: v.string(),
    name: v.string(),
    logo: v.string(),
    category: v.string(),
    country: v.string(),
    language: v.string(),
    tvgId: v.string(),
    source: v.string(),
    isActive: v.boolean(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query('tvChannels')
      .filter((q) => q.eq(q.field('streamUrl'), args.streamUrl))
      .first();

    if (existing) {
      const patch: Record<string, unknown> = {
        name: args.name,
        logo: args.logo || existing.logo,
        category: args.category || existing.category,
        country: args.country || existing.country,
        language: args.language || existing.language,
        isActive: args.isActive,
      };
      if (args.tvgId) patch.tvgId = args.tvgId;
      if (args.playlistId) patch.sourcePlaylistId = args.playlistId;
      await ctx.db.patch(existing._id, patch);
      return 'updated' as const;
    }

    await ctx.db.insert('tvChannels', {
      name: args.name,
      logo: args.logo,
      category: args.category || 'General',
      country: args.country || undefined,
      language: args.language || undefined,
      streamUrl: args.streamUrl,
      source: args.source,
      sourcePlaylistId: args.playlistId,
      tvgId: args.tvgId || undefined,
      isActive: args.isActive,
    });
    return 'inserted' as const;
  },
});

export const markPlaylistImported = internalMutation({
  args: {
    playlistId: v.id('tvPlaylists'),
    totalChannels: v.number(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.playlistId, {
      lastImportedAt: Date.now(),
      totalChannels: args.totalChannels,
    });
    return args.playlistId;
  },
});