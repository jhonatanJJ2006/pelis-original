import { z } from 'zod';
import { prisma } from '../client';
import { register } from '../registry';
import { toAnimeShape } from '../lib/shapes';

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

const PROVIDERS = [
  { id: 'gogoanime', name: 'GogoAnime', baseUrl: 'https://gogoanime.cl', language: 'sub' as const },
  { id: 'zoro', name: 'Zoro', baseUrl: 'https://zoro.to', language: 'sub' as const },
  { id: 'animepahe', name: 'AnimePahe', baseUrl: 'https://animepahe.ru', language: 'sub' as const },
];

export const getProviders = register({
  kind: 'query',
  name: 'anime.getProviders',
  reads: [],
  handler: async () => PROVIDERS.map((p) => ({ id: p.id, name: p.name, baseUrl: p.baseUrl, language: p.language })),
});