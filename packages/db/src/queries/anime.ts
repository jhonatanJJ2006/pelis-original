import { z } from 'zod';
import type { Anime } from '@prisma/client';
import { prisma } from '../client';
import { register } from '../registry';
import { toAnimeShape } from '../lib/shapes';
import { getProvidersSortedByPriority, toProviderListItem } from '../lib/anime-providers';
import { fallbackSeriesKey, isSeasonalFormat, sortSeasons } from '../lib/anime-series';

const StatusEnum = z.enum(['ongoing', 'completed']);

/** Rows not yet processed by the grouping script still need a stable key. */
function seriesKeyOf(a: Anime): string {
  return a.seriesKey ?? fallbackSeriesKey(a.title);
}

function groupBySeriesKey(rows: Anime[]): Map<string, Anime[]> {
  const groups = new Map<string, Anime[]>();
  for (const row of rows) {
    const key = seriesKeyOf(row);
    const bucket = groups.get(key);
    if (bucket) bucket.push(row);
    else groups.set(key, [row]);
  }
  return groups;
}

/**
 * Collapse a franchise into the single card shown in the catalog. The
 * representative entry is the one flagged `isSeriesMain` (the earliest season),
 * while counters aggregate every season so the card reflects the whole series.
 */
function toSeriesCard(key: string, members: Anime[]) {
  const ordered = sortSeasons(members);
  const main = ordered.find((m) => m.isSeriesMain) ?? ordered[0]!;
  const seasons = ordered.filter((m) => isSeasonalFormat(m.format));
  const extras = ordered.filter((m) => !isSeasonalFormat(m.format));
  const ratings = ordered.map((m) => m.rating).filter((r): r is number => typeof r === 'number');

  return {
    _id: main.id,
    seriesKey: key,
    title: main.seriesTitle ?? main.title,
    alternativeTitle: main.alternativeTitle ?? undefined,
    image: main.image,
    backdropImage: main.backdropImage ?? undefined,
    synopsis: main.synopsis,
    genre: Array.from(new Set(ordered.flatMap((m) => m.genre))).sort(),
    year: Math.min(...ordered.map((m) => m.year)),
    latestYear: Math.max(...ordered.map((m) => m.year)),
    rating: ratings.length > 0 ? Math.max(...ratings) : undefined,
    status: ordered.some((m) => m.status === 'ONGOING') ? ('ongoing' as const) : ('completed' as const),
    seasonCount: seasons.length,
    extrasCount: extras.length,
    entryCount: ordered.length,
    totalEpisodes: ordered.reduce((sum, m) => sum + m.episodes, 0),
  };
}

export const list = register({
  kind: 'query',
  name: 'anime.list',
  reads: ['anime'],
  args: z
    .object({
      genre: z.string().optional(),
      status: StatusEnum.optional(),
      search: z.string().optional(),
    })
    .optional(),
  handler: async (_ctx, args) => {
    const a = args ?? {};
    const where: Record<string, unknown> = {};
    if (a.status) where.status = a.status === 'ongoing' ? 'ONGOING' : 'COMPLETED';
    if (a.genre) where.genre = { has: a.genre };
    if (a.search) {
      const q = a.search.toLowerCase();
      where.OR = [
        { title: { contains: q, mode: 'insensitive' } },
        { alternativeTitle: { contains: q, mode: 'insensitive' } },
      ];
    }
    return (await prisma.anime.findMany({ where, orderBy: { title: 'asc' } })).map(toAnimeShape);
  },
});

/**
 * Catalog listing with one card per franchise.
 *
 * Filters are applied per entry and a series survives if any of its seasons
 * matches, so searching "final season" still surfaces the Attack on Titan card.
 */
export const listSeries = register({
  kind: 'query',
  name: 'anime.listSeries',
  reads: ['anime'],
  args: z
    .object({
      genre: z.string().optional(),
      status: StatusEnum.optional(),
      search: z.string().optional(),
    })
    .optional(),
  handler: async (_ctx, args) => {
    const a = args ?? {};
    const rows = await prisma.anime.findMany({ orderBy: { title: 'asc' } });
    const groups = groupBySeriesKey(rows);

    const cards = [...groups.entries()].map(([key, members]) => ({
      card: toSeriesCard(key, members),
      members,
    }));

    const search = a.search?.trim().toLowerCase();

    return cards
      .filter(({ card, members }) => {
        if (a.status && card.status !== a.status) return false;
        if (a.genre && !card.genre.includes(a.genre)) return false;
        if (search) {
          const haystack = [
            card.title,
            card.alternativeTitle ?? '',
            ...members.map((m) => m.title),
            ...members.map((m) => m.alternativeTitle ?? ''),
            ...card.genre,
          ]
            .join(' ')
            .toLowerCase();
          if (!haystack.includes(search)) return false;
        }
        return true;
      })
      .map(({ card }) => card)
      .sort((x, y) => x.title.localeCompare(y.title));
  },
});

export const getById = register({
  kind: 'query',
  name: 'anime.getById',
  reads: ['anime'],
  args: z.object({ id: z.string() }),
  handler: async (_ctx, { id }) => {
    const anime = await prisma.anime.findUnique({ where: { id } });
    return anime ? toAnimeShape(anime) : null;
  },
});

/**
 * Series detail: franchise-level metadata plus every season in viewing order.
 * Accepts the id of *any* member so old links to a single season keep working.
 */
export const getSeries = register({
  kind: 'query',
  name: 'anime.getSeries',
  reads: ['anime'],
  args: z.object({ id: z.string().optional(), seriesKey: z.string().optional() }),
  handler: async (_ctx, { id, seriesKey }) => {
    let members: Anime[] = [];
    let key = seriesKey ?? null;

    if (!key && id) {
      const entry = await prisma.anime.findUnique({ where: { id } });
      if (!entry) return null;
      key = entry.seriesKey ?? null;
      // Not grouped yet: treat the entry as a one-season series.
      if (!key) members = [entry];
    }

    if (key) {
      members = await prisma.anime.findMany({ where: { seriesKey: key } });
    }
    if (members.length === 0) return null;

    const ordered = sortSeasons(members);
    const main = ordered.find((m) => m.isSeriesMain) ?? ordered[0]!;
    const card = toSeriesCard(key ?? seriesKeyOf(main), ordered);

    return {
      ...card,
      seasons: ordered.map((m) => ({
        _id: m.id,
        title: m.title,
        alternativeTitle: m.alternativeTitle ?? undefined,
        seasonNumber: m.seasonNumber ?? undefined,
        seasonLabel: m.seasonLabel ?? m.title,
        format: m.format ?? 'TV',
        isExtra: !isSeasonalFormat(m.format),
        anilistId: m.anilistId ?? undefined,
        malId: m.malId ?? undefined,
        image: m.image,
        synopsis: m.synopsis,
        episodes: m.episodes,
        year: m.year,
        rating: m.rating ?? undefined,
        status: m.status === 'ONGOING' ? ('ongoing' as const) : ('completed' as const),
      })),
    };
  },
});

export const getGenres = register({
  kind: 'query',
  name: 'anime.getGenres',
  reads: ['anime'],
  handler: async () => {
    const all = await prisma.anime.findMany({ select: { genre: true } });
    return Array.from(new Set(all.flatMap((a) => a.genre))).sort();
  },
});

export const search = register({
  kind: 'query',
  name: 'anime.search',
  reads: ['anime'],
  args: z.object({ query: z.string(), limit: z.number().optional() }),
  handler: async (_ctx, { query, limit }) => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    const items = await prisma.anime.findMany({
      where: {
        OR: [
          { title: { contains: q, mode: 'insensitive' } },
          { alternativeTitle: { contains: q, mode: 'insensitive' } },
        ],
      },
      orderBy: { title: 'asc' },
      take: limit ?? 10,
    });
    return items.map(toAnimeShape);
  },
});

const PROVIDERS = getProvidersSortedByPriority();

export const getProviders = register({
  kind: 'query',
  name: 'anime.getProviders',
  reads: [],
  handler: async () => PROVIDERS.map(toProviderListItem),
});