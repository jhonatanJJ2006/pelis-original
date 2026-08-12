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
    isPopular: v.optional(v.boolean()),
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
      if (typeof args.isPopular === 'boolean') patch.isPopular = args.isPopular;
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
      isPopular: args.isPopular,
      streamStatus: 'unknown',
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

// ==========================================
//   Helpers de probing
// ==========================================

export const getChannelForProbe = internalQuery({
  args: { channelId: v.id('tvChannels') },
  handler: async (ctx, args) => {
    const channel = await ctx.db.get(args.channelId);
    if (!channel) return null;
    return { _id: channel._id, name: channel.name, streamUrl: channel.streamUrl };
  },
});

export const listAllChannelIdsForProbe = internalQuery({
  args: { onlyActive: v.optional(v.boolean()) },
  handler: async (ctx, args) => {
    const channels = await ctx.db.query('tvChannels').collect();
    return channels
      .filter((c) => (args.onlyActive ? c.isActive : true))
      .map((c) => ({
        channelId: c._id,
        name: c.name,
        streamUrl: c.streamUrl,
      }));
  },
});

export const applyProbeResult = internalMutation({
  args: {
    channelId: v.id('tvChannels'),
    streamStatus: v.union(
      v.literal('online'),
      v.literal('offline'),
      v.literal('unknown')
    ),
    lastStreamError: v.optional(v.string()),
    failureThreshold: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const channel = await ctx.db.get(args.channelId);
    if (!channel) return false;

    const threshold = args.failureThreshold ?? 2;
    const now = Date.now();
    const previous = channel.consecutiveFailures ?? 0;

    let nextFailures = previous;
    if (args.streamStatus === 'online') {
      nextFailures = 0;
    } else if (args.streamStatus === 'offline') {
      nextFailures = previous + 1;
    }

    // Los canales populares NUNCA se desactivan automáticamente:
    // el probe se hace desde el servidor (que puede estar geo-bloqueado),
    // pero los usuarios en Latam pueden acceder a esos streams.
    const shouldDeactivate =
      !channel.isPopular && nextFailures >= threshold;

    const patch: Record<string, unknown> = {
      streamStatus: args.streamStatus,
      lastCheckedAt: now,
      lastStreamError: args.lastStreamError,
      consecutiveFailures: shouldDeactivate ? 0 : nextFailures,
    };

    if (shouldDeactivate) {
      patch.isActive = false;
    }

    await ctx.db.patch(args.channelId, patch);
    return shouldDeactivate;
  },
});