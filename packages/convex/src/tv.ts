import { v } from 'convex/values';
import { query, mutation, action } from './_generated/server';
import { internal } from './_generated/api';
import { requireAdmin } from './lib/requireAdmin';

const CHANNEL_PAGE_SIZE = 48;
const FAILURE_THRESHOLD = 2;

export const list = query({
  args: {
    category: v.optional(v.string()),
    country: v.optional(v.string()),
    language: v.optional(v.string()),
    search: v.optional(v.string()),
    playlistId: v.optional(v.id('tvPlaylists')),
    popularOnly: v.optional(v.boolean()),
    streamStatus: v.optional(
      v.union(v.literal('online'), v.literal('offline'), v.literal('unknown'))
    ),
    limit: v.optional(v.number()),
    offset: v.optional(v.number()),
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

    if (args.popularOnly) {
      channels = channels.filter((c) => c.isPopular === true);
    }

    if (args.streamStatus) {
      channels = channels.filter(
        (c) => (c.streamStatus ?? 'unknown') === args.streamStatus
      );
    }

    if (args.search) {
      const search = args.search.toLowerCase();
      channels = channels.filter((c) => c.name.toLowerCase().includes(search));
    }

    channels.sort((a, b) => {
      const sa = a.sortOrder ?? 1000;
      const sb = b.sortOrder ?? 1000;
      if (sa !== sb) return sa - sb;
      return a.name.localeCompare(b.name);
    });

    const offset = args.offset ?? 0;
    const limit = args.limit ?? CHANNEL_PAGE_SIZE;
    const total = channels.length;
    const page = channels.slice(offset, offset + limit);

    return {
      items: page,
      total,
      offset,
      limit,
      hasMore: offset + limit < total,
    };
  },
});

export const getById = query({
  args: { id: v.id('tvChannels') },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

export const getCategories = query({
  args: {
    popularOnly: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const channels = await ctx.db
      .query('tvChannels')
      .filter((q) => q.eq(q.field('isActive'), true))
      .collect();
    const filtered = args.popularOnly
      ? channels.filter((c) => c.isPopular)
      : channels;
    const categories = [...new Set(filtered.map((c) => c.category))];
    return categories.sort();
  },
});

export const getCountries = query({
  args: {
    popularOnly: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const channels = await ctx.db
      .query('tvChannels')
      .filter((q) => q.eq(q.field('isActive'), true))
      .collect();
    const filtered = args.popularOnly
      ? channels.filter((c) => c.isPopular)
      : channels;
    const countries = [
      ...new Set(filtered.map((c) => c.country).filter(Boolean)),
    ];
    return countries.sort();
  },
});

export const getLanguages = query({
  args: {
    popularOnly: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const channels = await ctx.db
      .query('tvChannels')
      .filter((q) => q.eq(q.field('isActive'), true))
      .collect();
    const filtered = args.popularOnly
      ? channels.filter((c) => c.isPopular)
      : channels;
    const languages = [
      ...new Set(filtered.map((c) => c.language).filter(Boolean)),
    ];
    return languages.sort();
  },
});

export const getStats = query({
  args: {},
  handler: async (ctx) => {
    const channels = await ctx.db.query('tvChannels').collect();
    let activeCount = 0;
    let popular = 0;
    let online = 0;
    let offline = 0;
    let unknown = 0;
    let geoBlocked = 0;

    for (const c of channels) {
      if (c.isActive) activeCount += 1;
      if (c.isPopular) popular += 1;
      const status = c.streamStatus ?? 'unknown';
      if (status === 'online') online += 1;
      else if (status === 'offline') offline += 1;
      else unknown += 1;
      if (
        typeof c.lastStreamError === 'string' &&
        /geo.?block/i.test(c.lastStreamError)
      ) {
        geoBlocked += 1;
      }
    }

    return {
      total: channels.length,
      active: activeCount,
      popular,
      online,
      offline,
      unknown,
      geoBlocked,
    };
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
      const tvgCountryMatch = currentExtinf.match(/tvg-country="([^"]*)"/i);
      const tvgLangMatch = currentExtinf.match(/tvg-language="([^"]*)"/i);

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
    isPopular: v.optional(v.boolean()),
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
    isPopular: v.optional(v.boolean()),
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

export const togglePopular = mutation({
  args: { id: v.id('tvChannels'), isPopular: v.boolean() },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    await ctx.db.patch(args.id, { isPopular: args.isPopular });
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

// ==========================================
//   Probing (detección de canales muertos)
// ==========================================

const PROBE_TIMEOUT_MS = 12000;

function isGeoBlockedHint(text: string): boolean {
  return /geo.?block|not available in your|region|403|access denied/i.test(text);
}

async function probeUpstream(streamUrl: string): Promise<{
  streamStatus: 'online' | 'offline';
  lastStreamError?: string;
}> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), PROBE_TIMEOUT_MS);

    const response = await fetch(streamUrl, {
      method: 'GET',
      redirect: 'follow',
      cache: 'no-store',
      signal: controller.signal,
      headers: {
        Accept: '*/*',
        'User-Agent':
          'Mozilla/5.0 (compatible; PelisTV-Probe/1.0; +https://verpelis.pro)',
      },
    });

    clearTimeout(timeout);

    if (!response.ok) {
      let detail = `HTTP ${response.status}`;
      try {
        const text = await response.text();
        if (text.length < 200) detail = `${response.status}: ${text.replace(/\s+/g, ' ').trim()}`;
      } catch {
        // ignore
      }
      return {
        streamStatus: 'offline',
        lastStreamError: detail,
      };
    }

    const finalUrl = response.url || streamUrl;
    const contentType = response.headers.get('content-type') ?? '';
    const isManifest =
      contentType.includes('mpegurl') ||
      contentType.includes('x-mpegURL') ||
      finalUrl.toLowerCase().includes('.m3u8');

    if (!isManifest) {
      return { streamStatus: 'online' };
    }

    const text = await response.text();
    if (!text.startsWith('#EXTM3U') && !text.includes('#EXT-X-')) {
      return {
        streamStatus: 'offline',
        lastStreamError: 'Respuesta no es un manifiesto M3U8 válido',
      };
    }
    if (!text.includes('#EXTINF') && !text.includes('#EXT-X-STREAM-INF')) {
      return {
        streamStatus: 'offline',
        lastStreamError: 'Manifiesto sin segmentos de video',
      };
    }

    return { streamStatus: 'online' };
  } catch (err) {
    const message =
      err instanceof Error ? err.message : 'Error de conexión';
    return {
      streamStatus: 'offline',
      lastStreamError: isGeoBlockedHint(message) ? `Geo-block: ${message}` : message,
    };
  }
}

export const probeChannel = action({
  args: { channelId: v.id('tvChannels') },
  handler: async (ctx, args) => {
    const channel = await ctx.runQuery(internal.tvHelpers.getChannelForProbe, {
      channelId: args.channelId,
    });
    if (!channel) throw new Error('Canal no encontrado');

    const result = await probeUpstream(channel.streamUrl);

    await ctx.runMutation(internal.tvHelpers.applyProbeResult, {
      channelId: args.channelId,
      streamStatus: result.streamStatus,
      lastStreamError: result.lastStreamError,
      failureThreshold: FAILURE_THRESHOLD,
    });

    return {
      channelId: args.channelId,
      name: channel.name,
      streamStatus: result.streamStatus,
      lastStreamError: result.lastStreamError,
    };
  },
});

export const probeAllChannels = action({
  args: {
    batchSize: v.optional(v.number()),
    onlyActive: v.optional(v.boolean()),
    deactivateAfterFailures: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const batch = args.batchSize ?? 8;
    const threshold = args.deactivateAfterFailures ?? FAILURE_THRESHOLD;

    const all = await ctx.runQuery(internal.tvHelpers.listAllChannelIdsForProbe, {
      onlyActive: args.onlyActive ?? true,
    });

    let online = 0;
    let offline = 0;
    let deactivated = 0;
    const sampleErrors: Array<{ name: string; error: string }> = [];

    for (let i = 0; i < all.length; i += batch) {
      const slice = all.slice(i, i + batch);
      await Promise.all(
        slice.map(async (entry) => {
          try {
            const result = await probeUpstream(entry.streamUrl);
            const deactivatedFlag = await ctx.runMutation(
              internal.tvHelpers.applyProbeResult,
              {
                channelId: entry.channelId,
                streamStatus: result.streamStatus,
                lastStreamError: result.lastStreamError,
                failureThreshold: threshold,
              }
            );
            if (result.streamStatus === 'online') online += 1;
            else {
              offline += 1;
              if (deactivatedFlag) deactivated += 1;
              if (sampleErrors.length < 20 && result.lastStreamError) {
                sampleErrors.push({
                  name: entry.name,
                  error: result.lastStreamError,
                });
              }
            }
          } catch (err) {
            offline += 1;
            const msg = err instanceof Error ? err.message : 'Error desconocido';
            await ctx.runMutation(internal.tvHelpers.applyProbeResult, {
              channelId: entry.channelId,
              streamStatus: 'offline' as const,
              lastStreamError: msg,
              failureThreshold: threshold,
            });
          }
        })
      );
      // pequeño respiro entre batches
      await new Promise((r) => setTimeout(r, 100));
    }

    return {
      processed: all.length,
      online,
      offline,
      deactivated,
      sampleErrors,
    };
  },
});

export const reportStreamStatus = mutation({
  args: {
    channelId: v.id('tvChannels'),
    streamStatus: v.union(
      v.literal('online'),
      v.literal('offline'),
      v.literal('unknown')
    ),
    lastStreamError: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    await ctx.runMutation(internal.tvHelpers.applyProbeResult, {
      channelId: args.channelId,
      streamStatus: args.streamStatus,
      lastStreamError: args.lastStreamError,
      failureThreshold: FAILURE_THRESHOLD,
    });
    return args.channelId;
  },
});

export const pingAdmin = mutation({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    return true;
  },
});

/**
 * Resetea el estado de probing de un canal (isActive=true, streamStatus=unknown,
 * consecutiveFailures=0). Pensado para que el deployer re-active canales tras
 * un probe fallido. NOTA: intencionalmente sin requireAdmin para que sea
 * invocable desde el script CLI del deployer.
 */
export const resetChannelProbe = mutation({
  args: { id: v.id('tvChannels') },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, {
      isActive: true,
      streamStatus: 'unknown',
      consecutiveFailures: 0,
      lastStreamError: undefined,
    });
    return args.id;
  },
});

export const resetAllChannelsProbe = mutation({
  args: {
    onlyPopular: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const channels = await ctx.db.query('tvChannels').collect();
    let count = 0;
    for (const ch of channels) {
      if (args.onlyPopular && !ch.isPopular) continue;
      await ctx.db.patch(ch._id, {
        isActive: true,
        streamStatus: 'unknown',
        consecutiveFailures: 0,
        lastStreamError: undefined,
      });
      count += 1;
    }
    return { reset: count };
  },
});

/**
 * Limpia duplicados de canales populares: cuando hay varios canales con
 * el mismo nombre, conserva el más reciente (por _creationTime) y elimina
 * el resto. Pensado para corregir el seed cuando cambian URLs.
 */
export const dedupePopularChannels = mutation({
  args: {},
  handler: async (ctx) => {
    const channels = await ctx.db.query('tvChannels').collect();
    const popular = channels.filter((c) => c.isPopular);
    const byKey = new Map<string, typeof popular>();
    for (const ch of popular) {
      const key = ch.name;
      const existing = byKey.get(key) ?? [];
      existing.push(ch);
      byKey.set(key, existing);
    }
    let removed = 0;
    for (const [, list] of byKey) {
      if (list.length <= 1) continue;
      list.sort((a, b) => b._creationTime - a._creationTime);
      for (const ch of list.slice(1)) {
        await ctx.db.delete(ch._id);
        removed += 1;
      }
    }
    return { removed, remaining: popular.length - removed };
  },
});