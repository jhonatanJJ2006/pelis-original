import { z } from 'zod';
import { prisma } from '../client';
import { notifyChange } from '../realtime';
import { register } from '../registry';
import { toPublicTvChannelShape, toTvChannelShape, toTvPlaylistShape } from '../lib/shapes';
import { requireAdmin } from '../lib/requireAdmin';
import {
  FEATURED_CATEGORIES,
  channelMatchesCategory,
  isPublicCatalogName,
  mapTvCategory,
  normalizeChannelFields,
  normalizeCountry,
  normalizeLanguage,
} from '../lib/tv-taxonomy';

const TVChannelCreate = z.object({
  name: z.string(),
  logo: z.string(),
  category: z.string(),
  country: z.string().optional(),
  language: z.string().optional(),
  streamUrl: z.string(),
  source: z.string(),
  sourcePlaylistId: z.string().optional(),
  tvgId: z.string().optional(),
  isActive: z.boolean(),
  isPopular: z.boolean().optional(),
  sortOrder: z.number().optional(),
});

function applyPublicDisplay<
  T extends { name: string; category: string; country?: string | null; language?: string | null },
>(row: T) {
  const norm = normalizeChannelFields(row);
  return {
    ...row,
    name: norm.name,
    category: norm.category,
    country: norm.country ?? undefined,
    language: norm.language,
  };
}

const listArgs = z
  .object({
    category: z.string().optional(),
    country: z.string().optional(),
    language: z.string().optional(),
    search: z.string().optional(),
    playlistId: z.string().optional(),
    popularOnly: z.boolean().optional(),
    streamStatus: z.enum(['online', 'offline', 'unknown']).optional(),
    limit: z.number().optional(),
    offset: z.number().optional(),
  })
  .optional();

export const list = register({
  kind: 'query',
  name: 'tv.list',
  reads: ['tv_channel'],
  args: listArgs,
  handler: async (_ctx, args) => {
    const a = args ?? {};
    const where: Record<string, unknown> = { isActive: true };
    // Category is matched via mapTvCategory (same as getCategories / UI), not raw DB equality.
    const categoryFilter = a.category?.trim() || undefined;
    if (a.country) {
      const country = normalizeCountry(a.country) ?? a.country;
      where.country = country;
    }
    if (a.language) where.language = normalizeLanguage(a.language);
    if (a.playlistId) where.sourcePlaylistId = a.playlistId;
    if (a.popularOnly) where.isPopular = true;
    if (a.streamStatus) where.streamStatus = a.streamStatus.toUpperCase();
    if (a.search) {
      where.name = { contains: a.search, mode: 'insensitive' };
    }
    const limit = a.limit ?? 48;
    const offset = a.offset ?? 0;

    if (categoryFilter) {
      const channels = await prisma.tVChannel.findMany({
        where,
        orderBy: [{ isPopular: 'desc' }, { sortOrder: 'asc' }, { name: 'asc' }],
      });
      const items = channels
        .filter((c) => isPublicCatalogName(c.name))
        .filter((c) => channelMatchesCategory(c, categoryFilter))
        .map((c) => applyPublicDisplay(toPublicTvChannelShape(c)));
      const total = items.length;
      const page = items.slice(offset, offset + limit);
      return {
        items: page,
        total,
        offset,
        limit,
        hasMore: offset + limit < total,
      };
    }

    const total = await prisma.tVChannel.count({ where });
    const channels = await prisma.tVChannel.findMany({
      where,
      orderBy: [{ isPopular: 'desc' }, { sortOrder: 'asc' }, { name: 'asc' }],
      take: limit,
      skip: offset,
    });
    const items = channels
      .filter((c) => isPublicCatalogName(c.name))
      .map((c) => applyPublicDisplay(toPublicTvChannelShape(c)));
    return {
      items,
      total,
      offset,
      limit,
      hasMore: offset + limit < total,
    };
  },
});

export const adminList = register({
  kind: 'query',
  name: 'tv.adminList',
  reads: ['tv_channel'],
  args: z
    .object({
      search: z.string().optional(),
      streamStatus: z.enum(['online', 'offline', 'unknown']).optional(),
      popularOnly: z.boolean().optional(),
      includeInactive: z.boolean().optional(),
      limit: z.number().optional(),
      offset: z.number().optional(),
    })
    .optional(),
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const a = args ?? {};
    const where: Record<string, unknown> = {};
    if (!a.includeInactive) where.isActive = true;
    if (a.popularOnly) where.isPopular = true;
    if (a.streamStatus) where.streamStatus = a.streamStatus.toUpperCase();
    if (a.search) where.name = { contains: a.search, mode: 'insensitive' };
    const total = await prisma.tVChannel.count({ where });
    const channels = await prisma.tVChannel.findMany({
      where,
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      take: a.limit ?? 48,
      skip: a.offset ?? 0,
    });
    return {
      items: channels.map((c) => applyPublicDisplay(toTvChannelShape(c))),
      total,
      offset: a.offset ?? 0,
      limit: a.limit ?? 48,
      hasMore: (a.offset ?? 0) + (a.limit ?? 48) < total,
    };
  },
});

export const getById = register({
  kind: 'query',
  name: 'tv.getById',
  reads: ['tv_channel'],
  args: z.object({ id: z.string() }),
  handler: async (_ctx, { id }) => {
    const channel = await prisma.tVChannel.findUnique({ where: { id } });
    if (!channel) return null;
    return applyPublicDisplay(toPublicTvChannelShape(channel));
  },
});

export const adminGetById = register({
  kind: 'query',
  name: 'tv.adminGetById',
  reads: ['tv_channel'],
  args: z.object({ id: z.string() }),
  handler: async (ctx, { id }) => {
    await requireAdmin(ctx);
    const channel = await prisma.tVChannel.findUnique({ where: { id } });
    if (!channel) return null;
    return applyPublicDisplay(toTvChannelShape(channel));
  },
});

export const getCategories = register({
  kind: 'query',
  name: 'tv.getCategories',
  reads: ['tv_channel'],
  args: z.object({ popularOnly: z.boolean().optional() }).optional(),
  handler: async (_ctx, args) => {
    const where = args?.popularOnly ? { isActive: true, isPopular: true } : { isActive: true };
    const channels = await prisma.tVChannel.findMany({
      where,
      select: { category: true, name: true },
    });
    const counts = new Map<string, number>();
    for (const c of channels) {
      if (!isPublicCatalogName(c.name)) continue;
      const cat = mapTvCategory(c.category, c.name);
      counts.set(cat, (counts.get(cat) ?? 0) + 1);
    }
    const names = new Set<string>([...FEATURED_CATEGORIES, ...counts.keys()]);
    return Array.from(names).sort((a, b) => {
      const ai = FEATURED_CATEGORIES.indexOf(a as (typeof FEATURED_CATEGORIES)[number]);
      const bi = FEATURED_CATEGORIES.indexOf(b as (typeof FEATURED_CATEGORIES)[number]);
      if (ai !== -1 || bi !== -1) {
        if (ai === -1) return 1;
        if (bi === -1) return -1;
        return ai - bi;
      }
      return a.localeCompare(b, 'es');
    });
  },
});

export const getCountries = register({
  kind: 'query',
  name: 'tv.getCountries',
  reads: ['tv_channel'],
  args: z.object({ popularOnly: z.boolean().optional() }).optional(),
  handler: async (_ctx, args) => {
    const where = args?.popularOnly ? { isActive: true, isPopular: true } : { isActive: true };
    const channels = await prisma.tVChannel.findMany({
      where,
      select: { country: true },
    });
    const set = new Set<string>();
    for (const c of channels) {
      const country = normalizeCountry(c.country);
      if (country) set.add(country);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'es'));
  },
});

export const getLanguages = register({
  kind: 'query',
  name: 'tv.getLanguages',
  reads: ['tv_channel'],
  args: z.object({ popularOnly: z.boolean().optional() }).optional(),
  handler: async (_ctx, args) => {
    const where = args?.popularOnly ? { isActive: true, isPopular: true } : { isActive: true };
    const channels = await prisma.tVChannel.findMany({
      where,
      select: { language: true },
    });
    const set = new Set<string>();
    for (const c of channels) set.add(normalizeLanguage(c.language));
    return Array.from(set).sort();
  },
});

export const getStats = register({
  kind: 'query',
  name: 'tv.getStats',
  reads: ['tv_channel'],
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const channels = await prisma.tVChannel.findMany({
      select: {
        isActive: true,
        isPopular: true,
        streamStatus: true,
        lastStreamError: true,
      },
    });
    let active = 0;
    let popular = 0;
    let online = 0;
    let offline = 0;
    let unknown = 0;
    let geoBlocked = 0;
    for (const c of channels) {
      if (c.isActive) active++;
      if (c.isPopular) popular++;
      const status = c.streamStatus;
      if (status === 'ONLINE') online++;
      else if (status === 'OFFLINE') offline++;
      else unknown++;
      if (typeof c.lastStreamError === 'string' && /geo.?block/i.test(c.lastStreamError)) {
        geoBlocked++;
      }
    }
    return { total: channels.length, active, popular, online, offline, unknown, geoBlocked };
  },
});

export const listPlaylists = register({
  kind: 'query',
  name: 'tv.listPlaylists',
  reads: ['tv_playlist'],
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const playlists = await prisma.tVPlaylist.findMany();
    return playlists.map(toTvPlaylistShape);
  },
});

export const pingAdmin = register({
  kind: 'mutation',
  name: 'tv.pingAdmin',
  writes: [],
  handler: async (ctx) => {
    await requireAdmin(ctx);
    return true;
  },
});

export const addChannel = register({
  kind: 'mutation',
  name: 'tv.addChannel',
  writes: ['tv_channel'],
  args: TVChannelCreate,
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const norm = normalizeChannelFields(args);
    const ch = await prisma.tVChannel.create({
      data: {
        name: norm.name,
        logo: args.logo,
        category: norm.category,
        country: norm.country,
        language: norm.language,
        streamUrl: args.streamUrl,
        source: args.source,
        sourcePlaylistId: args.sourcePlaylistId ?? null,
        tvgId: args.tvgId ?? null,
        isActive: args.isActive,
        isPopular: args.isPopular ?? false,
        sortOrder: args.sortOrder ?? null,
        streamStatus: 'UNKNOWN',
      },
    });
    await notifyChange('tv_channel', 'insert', ch.id);
    return ch.id;
  },
});

export const updateChannel = register({
  kind: 'mutation',
  name: 'tv.updateChannel',
  writes: ['tv_channel'],
  args: TVChannelCreate.extend({ id: z.string() }),
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const { id, ...rest } = args;
    const norm = normalizeChannelFields(rest);
    await prisma.tVChannel.update({
      where: { id },
      data: {
        name: norm.name,
        logo: rest.logo,
        category: norm.category,
        country: norm.country,
        language: norm.language,
        streamUrl: rest.streamUrl,
        source: rest.source,
        sourcePlaylistId: rest.sourcePlaylistId ?? null,
        tvgId: rest.tvgId ?? null,
        isActive: rest.isActive,
        isPopular: rest.isPopular ?? false,
        sortOrder: rest.sortOrder ?? null,
      },
    });
    await notifyChange('tv_channel', 'update', id);
    return id;
  },
});

export const toggleChannel = register({
  kind: 'mutation',
  name: 'tv.toggleChannel',
  writes: ['tv_channel'],
  args: z.object({ id: z.string(), isActive: z.boolean() }),
  handler: async (ctx, { id, isActive }) => {
    await requireAdmin(ctx);
    await prisma.tVChannel.update({ where: { id }, data: { isActive } });
    await notifyChange('tv_channel', 'update', id);
    return id;
  },
});

export const togglePopular = register({
  kind: 'mutation',
  name: 'tv.togglePopular',
  writes: ['tv_channel'],
  args: z.object({ id: z.string(), isPopular: z.boolean() }),
  handler: async (ctx, { id, isPopular }) => {
    await requireAdmin(ctx);
    await prisma.tVChannel.update({ where: { id }, data: { isPopular } });
    await notifyChange('tv_channel', 'update', id);
    return id;
  },
});

export const removeChannel = register({
  kind: 'mutation',
  name: 'tv.removeChannel',
  writes: ['tv_channel'],
  args: z.object({ id: z.string() }),
  handler: async (ctx, { id }) => {
    await requireAdmin(ctx);
    await prisma.tVChannel.delete({ where: { id } });
    await notifyChange('tv_channel', 'delete', id);
    return id;
  },
});

export const removeByPlaylist = register({
  kind: 'mutation',
  name: 'tv.removeByPlaylist',
  writes: ['tv_channel'],
  args: z.object({ playlistId: z.string() }),
  handler: async (ctx, { playlistId }) => {
    await requireAdmin(ctx);
    const count = await prisma.tVChannel.count({ where: { sourcePlaylistId: playlistId } });
    await prisma.tVChannel.deleteMany({ where: { sourcePlaylistId: playlistId } });
    await notifyChange('tv_channel', 'delete');
    return count;
  },
});

export const createPlaylist = register({
  kind: 'mutation',
  name: 'tv.createPlaylist',
  writes: ['tv_playlist'],
  args: z.object({
    name: z.string(),
    m3uUrl: z.string(),
    country: z.string().optional(),
    language: z.string().optional(),
    isActive: z.boolean(),
  }),
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const playlist = await prisma.tVPlaylist.create({
      data: {
        name: args.name,
        m3uUrl: args.m3uUrl,
        country: args.country ?? null,
        language: args.language ?? null,
        isActive: args.isActive,
      },
    });
    await notifyChange('tv_playlist', 'insert', playlist.id);
    return playlist.id;
  },
});

export const updatePlaylist = register({
  kind: 'mutation',
  name: 'tv.updatePlaylist',
  writes: ['tv_playlist'],
  args: z.object({
    id: z.string(),
    name: z.string(),
    m3uUrl: z.string(),
    country: z.string().optional(),
    language: z.string().optional(),
    isActive: z.boolean(),
  }),
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const { id, ...rest } = args;
    await prisma.tVPlaylist.update({
      where: { id },
      data: {
        name: rest.name,
        m3uUrl: rest.m3uUrl,
        country: rest.country ?? null,
        language: rest.language ?? null,
        isActive: rest.isActive,
      },
    });
    await notifyChange('tv_playlist', 'update', id);
    return id;
  },
});

export const removePlaylist = register({
  kind: 'mutation',
  name: 'tv.removePlaylist',
  writes: ['tv_playlist', 'tv_channel'],
  args: z.object({ id: z.string() }),
  handler: async (ctx, { id }) => {
    await requireAdmin(ctx);
    await prisma.tVChannel.updateMany({
      where: { sourcePlaylistId: id },
      data: { sourcePlaylistId: null, source: 'manual' },
    });
    await prisma.tVPlaylist.delete({ where: { id } });
    await notifyChange('tv_playlist', 'delete', id);
    return id;
  },
});

export const reportStreamStatus = register({
  kind: 'mutation',
  name: 'tv.reportStreamStatus',
  writes: ['tv_channel'],
  args: z.object({
    channelId: z.string(),
    streamStatus: z.enum(['online', 'offline', 'unknown']),
    lastStreamError: z.string().optional(),
  }),
  handler: async (ctx, { channelId, streamStatus, lastStreamError }) => {
    await requireAdmin(ctx);
    const channel = await prisma.tVChannel.findUnique({ where: { id: channelId } });
    if (!channel) return channelId;

    const threshold = 2;
    const previous = channel.consecutiveFailures ?? 0;
    let nextFailures = previous;
    if (streamStatus === 'online') nextFailures = 0;
    else if (streamStatus === 'offline') nextFailures = previous + 1;
    const shouldDeactivate = !channel.isPopular && nextFailures >= threshold;
    await prisma.tVChannel.update({
      where: { id: channelId },
      data: {
        streamStatus: streamStatus.toUpperCase() as 'ONLINE' | 'OFFLINE' | 'UNKNOWN',
        lastCheckedAt: new Date(),
        lastStreamError: lastStreamError ?? null,
        consecutiveFailures: shouldDeactivate ? 0 : nextFailures,
        isActive: shouldDeactivate ? false : channel.isActive,
      },
    });
    await notifyChange('tv_channel', 'update', channelId);
    return channelId;
  },
});

export const resetChannelProbe = register({
  kind: 'mutation',
  name: 'tv.resetChannelProbe',
  writes: ['tv_channel'],
  args: z.object({ id: z.string() }),
  handler: async (ctx, { id }) => {
    await requireAdmin(ctx);
    await prisma.tVChannel.update({
      where: { id },
      data: {
        isActive: true,
        streamStatus: 'UNKNOWN',
        consecutiveFailures: 0,
        lastStreamError: null,
      },
    });
    await notifyChange('tv_channel', 'update', id);
    return id;
  },
});

export const resetAllChannelsProbe = register({
  kind: 'mutation',
  name: 'tv.resetAllChannelsProbe',
  writes: ['tv_channel'],
  args: z.object({ onlyPopular: z.boolean().optional() }).optional(),
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const where = args?.onlyPopular ? { isPopular: true } : {};
    const result = await prisma.tVChannel.updateMany({
      where,
      data: {
        isActive: true,
        streamStatus: 'UNKNOWN',
        consecutiveFailures: 0,
        lastStreamError: null,
      },
    });
    await notifyChange('tv_channel', 'update');
    return { reset: result.count };
  },
});

export const dedupePopularChannels = register({
  kind: 'mutation',
  name: 'tv.dedupePopularChannels',
  writes: ['tv_channel'],
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const channels = await prisma.tVChannel.findMany();
    const popular = channels.filter((c) => c.isPopular);
    const byKey = new Map<string, typeof popular>();
    for (const ch of popular) {
      const list = byKey.get(ch.name) ?? [];
      list.push(ch);
      byKey.set(ch.name, list);
    }
    let removed = 0;
    for (const [, list] of byKey) {
      if (list.length <= 1) continue;
      list.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      for (const ch of list.slice(1)) {
        await prisma.tVChannel.delete({ where: { id: ch.id } });
        removed++;
      }
    }
    await notifyChange('tv_channel', 'delete');
    return { removed, remaining: popular.length - removed };
  },
});
