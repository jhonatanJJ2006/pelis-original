import { v } from 'convex/values';
import { query, mutation, action } from './_generated/server';
import { internal } from './_generated/api';
import { requireAdmin } from './lib/requireAdmin';

export const list = query({
  args: {
    category: v.optional(v.string()),
    country: v.optional(v.string()),
    language: v.optional(v.string()),
    search: v.optional(v.string()),
    playlistId: v.optional(v.id('tvPlaylists')),
  },
  handler: async (ctx, args) => {
    let channels = await ctx.db
      .query('tvChannels')
      .filter((q) => q.eq(q.field('isActive'), true))
      .collect();

    if (args.category) {
      channels = channels.filter((c) => c.category === args.category);
    }

    if (args.country) {
      channels = channels.filter((c) => c.country === args.country);
    }

    if (args.language) {
      channels = channels.filter((c) => c.language === args.language);
    }

    if (args.playlistId) {
      channels = channels.filter((c) => c.sourcePlaylistId === args.playlistId);
    }

    if (args.search) {
      const search = args.search.toLowerCase();
      channels = channels.filter((c) => c.name.toLowerCase().includes(search));
    }

    return channels.sort((a, b) => {
      const sa = a.sortOrder ?? 1000;
      const sb = b.sortOrder ?? 1000;
      if (sa !== sb) return sa - sb;
      return a.name.localeCompare(b.name);
    });
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
    const channels = await ctx.db
      .query('tvChannels')
      .filter((q) => q.eq(q.field('isActive'), true))
      .collect();
    const categories = [...new Set(channels.map((c) => c.category))];
    return categories.sort();
  },
});

export const getCountries = query({
  args: {},
  handler: async (ctx) => {
    const channels = await ctx.db
      .query('tvChannels')
      .filter((q) => q.eq(q.field('isActive'), true))
      .collect();
    const countries = [
      ...new Set(channels.map((c) => c.country).filter(Boolean)),
    ];
    return countries.sort();
  },
});

export const getLanguages = query({
  args: {},
  handler: async (ctx) => {
    const channels = await ctx.db
      .query('tvChannels')
      .filter((q) => q.eq(q.field('isActive'), true))
      .collect();
    const languages = [
      ...new Set(channels.map((c) => c.language).filter(Boolean)),
    ];
    return languages.sort();
  },
});

export const listPlaylists = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query('tvPlaylists').collect();
  },
});

interface ParsedChannel {
  name: string;
  logo: string;
  category: string;
  country: string;
  language: string;
  streamUrl: string;
  tvgId: string;
}

function parseM3U(
  text: string,
  fallbackCountry: string,
  fallbackLanguage: string
): ParsedChannel[] {
  const channels: ParsedChannel[] = [];
  const lines = text.split(/\r?\n/);
  let currentExtinf: string | null = null;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    if (line.startsWith('#EXTINF:')) {
      currentExtinf = line;
    } else if (!line.startsWith('#') && currentExtinf) {
      const streamUrl = line;
      const logoMatch = currentExtinf.match(/tvg-logo="([^"]*)"/);
      const logo = logoMatch?.[1] ?? '';
      const groupMatch = currentExtinf.match(/group-title="([^"]*)"/);
      const category = groupMatch?.[1]?.trim() || 'General';
      const nameMatch = currentExtinf.match(/,(.+)$/);
      const name = nameMatch?.[1]?.trim() || 'Canal sin nombre';
      const tvgIdMatch = currentExtinf.match(/tvg-id="([^"]*)"/);
      const tvgId = tvgIdMatch?.[1] ?? '';
      const tvgCountryMatch = currentExtinf.match(/tvg-country="([^"]*)"/);
      const tvgLangMatch = currentExtinf.match(/tvg-language="([^"]*)"/);

      channels.push({
        name,
        logo,
        category: category || 'General',
        country: tvgCountryMatch?.[1] ?? fallbackCountry,
        language: tvgLangMatch?.[1] ?? fallbackLanguage,
        streamUrl,
        tvgId,
      });
      currentExtinf = null;
    }
  }
  return channels;
}

export const seedFromM3U = action({
  args: {
    m3uUrl: v.string(),
    playlistId: v.optional(v.id('tvPlaylists')),
    country: v.optional(v.string()),
    language: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const response = await fetch(args.m3uUrl);
    if (!response.ok) {
      throw new Error(`No se pudo descargar la lista M3U: ${response.status}`);
    }
    const text = await response.text();
    const parsed = parseM3U(
      text,
      args.country ?? 'Desconocido',
      args.language ?? 'es'
    );

    const existing = await ctx.runQuery(internal.tvHelpers.listAllActiveUrls, {});
    const existingUrls = new Set(existing);

    let added = 0;
    let updated = 0;
    const failures: string[] = [];

    for (const ch of parsed) {
      try {
        const result = await ctx.runMutation(internal.tvHelpers.upsertChannel, {
          playlistId: args.playlistId,
          streamUrl: ch.streamUrl,
          name: ch.name,
          logo: ch.logo,
          category: ch.category,
          country: ch.country,
          language: ch.language,
          tvgId: ch.tvgId,
          source: args.playlistId ? 'm3u-playlist' : 'iptv-org',
          isActive: true,
        });
        if (result === 'inserted') added += 1;
        else if (result === 'updated') updated += 1;
      } catch (err) {
        failures.push(
          `${ch.name}: ${err instanceof Error ? err.message : 'error'}`
        );
      }
    }

    if (args.playlistId) {
      await ctx.runMutation(internal.tvHelpers.markPlaylistImported, {
        playlistId: args.playlistId,
        totalChannels: parsed.length,
      });
    }

    return {
      total: parsed.length,
      added,
      updated,
      failed: failures.length,
      failures: failures.slice(0, 10),
    };
  },
});

export const addChannel = mutation({
  args: {
    name: v.string(),
    logo: v.string(),
    category: v.string(),
    country: v.optional(v.string()),
    language: v.optional(v.string()),
    streamUrl: v.string(),
    source: v.string(),
    sourcePlaylistId: v.optional(v.id('tvPlaylists')),
    tvgId: v.optional(v.string()),
    isActive: v.boolean(),
    sortOrder: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    return await ctx.db.insert('tvChannels', args);
  },
});

export const updateChannel = mutation({
  args: {
    id: v.id('tvChannels'),
    name: v.string(),
    logo: v.string(),
    category: v.string(),
    country: v.optional(v.string()),
    language: v.optional(v.string()),
    streamUrl: v.string(),
    source: v.string(),
    sourcePlaylistId: v.optional(v.id('tvPlaylists')),
    tvgId: v.optional(v.string()),
    isActive: v.boolean(),
    sortOrder: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const { id, ...rest } = args;
    await ctx.db.patch(id, rest);
    return id;
  },
});

export const toggleChannel = mutation({
  args: { id: v.id('tvChannels'), isActive: v.boolean() },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    await ctx.db.patch(args.id, { isActive: args.isActive });
    return args.id;
  },
});

export const removeChannel = mutation({
  args: { id: v.id('tvChannels') },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    await ctx.db.delete(args.id);
  },
});

export const removeByPlaylist = mutation({
  args: { playlistId: v.id('tvPlaylists') },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const channels = await ctx.db
      .query('tvChannels')
      .withIndex('by_playlist', (q) => q.eq('sourcePlaylistId', args.playlistId))
      .collect();
    for (const ch of channels) {
      await ctx.db.delete(ch._id);
    }
    return channels.length;
  },
});

export const createPlaylist = mutation({
  args: {
    name: v.string(),
    m3uUrl: v.string(),
    country: v.optional(v.string()),
    language: v.optional(v.string()),
    isActive: v.boolean(),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    return await ctx.db.insert('tvPlaylists', {
      ...args,
      lastImportedAt: undefined,
      totalChannels: undefined,
    });
  },
});

export const updatePlaylist = mutation({
  args: {
    id: v.id('tvPlaylists'),
    name: v.string(),
    m3uUrl: v.string(),
    country: v.optional(v.string()),
    language: v.optional(v.string()),
    isActive: v.boolean(),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const { id, ...rest } = args;
    await ctx.db.patch(id, rest);
    return id;
  },
});

export const removePlaylist = mutation({
  args: { id: v.id('tvPlaylists') },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const channels = await ctx.db
      .query('tvChannels')
      .withIndex('by_playlist', (q) => q.eq('sourcePlaylistId', args.id))
      .collect();
    for (const ch of channels) {
      await ctx.db.patch(ch._id, {
        sourcePlaylistId: undefined,
        source: 'manual',
      });
    }
    await ctx.db.delete(args.id);
    return args.id;
  },
});