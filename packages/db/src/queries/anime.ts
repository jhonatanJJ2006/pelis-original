import { z } from 'zod';
import { prisma } from '../client';
import { register } from '../registry';
import { toAnimeShape } from '../lib/shapes';
import { getProvidersSortedByPriority, toProviderListItem } from '../lib/anime-providers';

const StatusEnum = z.enum(['ongoing', 'completed']);

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