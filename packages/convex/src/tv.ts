import { v } from 'convex/values';
import { query, mutation, action } from './_generated/server';

export const list = query({
  args: {
    category: v.optional(v.string()),
    language: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let channels = await ctx.db
      .query('tvChannels')
      .filter((q) => q.eq(q.field('isActive'), true))
      .collect();

    if (args.category) {
      channels = channels.filter((c) => c.category === args.category);
    }

    if (args.language) {
      channels = channels.filter((c) => c.language === args.language);
    }

    return channels.sort((a, b) => a.name.localeCompare(b.name));
  },
});

export const getById = query({
  args: { id: v.id('tvChannels') },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

export const getCategories = query({
  args: {},
  handler: async (ctx) => {
    const channels = await ctx.db.query('tvChannels').collect();
    const categories = [...new Set(channels.map((c) => c.category))];
    return categories.sort();
  },
});

export const seedFromM3U = action({
  args: {
    m3uUrl: v.string(),
    language: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const response = await fetch(args.m3uUrl);
    const text = await response.text();

    const channels: Array<{
      name: string;
      logo: string;
      category: string;
      streamUrl: string;
      source: string;
      language: string;
      isActive: boolean;
    }> = [];

    const lines = text.split('\n');
    let currentExtinf: string | null = null;

    for (const line of lines) {
      const trimmed = line.trim();

      if (trimmed.startsWith('#EXTINF:')) {
        currentExtinf = trimmed;
      } else if (trimmed && !trimmed.startsWith('#') && currentExtinf) {
        const streamUrl = trimmed;

        const logoMatch = currentExtinf.match(/tvg-logo="([^"]*)"/);
        const logo = logoMatch?.[1] || '';

        const groupMatch = currentExtinf.match(/group-title="([^"]*)"/);
        const category = groupMatch?.[1] || 'General';

        const nameMatch = currentExtinf.match(/,(.+)$/);
        const name = nameMatch?.[1]?.trim() || 'Unknown';

        channels.push({
          name,
          logo,
          category,
          streamUrl,
          source: 'iptv-org',
          language: args.language || 'es',
          isActive: true,
        });

        currentExtinf = null;
      }
    }

    const existing = await ctx.runQuery(api.tv.list, {});
    const existingUrls = new Set(existing.map((c: any) => c.streamUrl));

    let added = 0;
    for (const channel of channels) {
      if (!existingUrls.has(channel.streamUrl)) {
        await ctx.runMutation(api.tv.addChannel, channel);
        added++;
      }
    }

    return { total: channels.length, added };
  },
});

export const addChannel = mutation({
  args: {
    name: v.string(),
    logo: v.string(),
    category: v.string(),
    streamUrl: v.string(),
    source: v.string(),
    language: v.string(),
    isActive: v.boolean(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert('tvChannels', args);
  },
});
