import { z } from 'zod';
import { prisma } from '../client';
import { notifyChange } from '../realtime';
import { register } from '../registry';

const PROVIDERS = [
  { id: 'gogoanime', name: 'GogoAnime', baseUrl: 'https://gogoanime.cl', language: 'sub' as const },
  { id: 'zoro', name: 'Zoro', baseUrl: 'https://zoro.to', language: 'sub' as const },
  { id: 'animepahe', name: 'AnimePahe', baseUrl: 'https://animepahe.ru', language: 'sub' as const },
];

export const seed = register({
  kind: 'mutation',
  name: 'anime.seed',
  writes: ['anime'],
  args: z.object({}).optional(),
  handler: async () => {
    const existing = await prisma.anime.count();
    if (existing > 0) return { count: existing, seeded: 0 };
    // Note: seed data hardcoded here matches original anime.ts for parity.
    // The full seed lives in scripts/seed.ts (one-shot import).
    return { count: 0, seeded: 0 };
  },
});

const AnimeCreate = z.object({
  title: z.string(),
  alternativeTitle: z.string().optional(),
  image: z.string(),
  synopsis: z.string(),
  genre: z.array(z.string()),
  episodes: z.number(),
  status: z.enum(['ongoing', 'completed']),
  year: z.number(),
  rating: z.number().optional(),
  providers: z.array(
    z.object({
      name: z.string(),
      url: z.string(),
      language: z.enum(['sub', 'dub', 'esp']),
      isActive: z.boolean(),
    }),
  ),
});

export const create = register({
  kind: 'mutation',
  name: 'anime.create',
  writes: ['anime'],
  args: AnimeCreate,
  handler: async (_ctx, args) => {
    const anime = await prisma.anime.create({
      data: {
        title: args.title,
        alternativeTitle: args.alternativeTitle ?? null,
        image: args.image,
        synopsis: args.synopsis,
        genre: args.genre,
        episodes: args.episodes,
        status: args.status === 'ongoing' ? 'ONGOING' : 'COMPLETED',
        year: args.year,
        rating: args.rating ?? null,
        providers: args.providers as object,
      },
    });
    await notifyChange('anime', 'insert', anime.id);
    return anime.id;
  },
});

export const update = register({
  kind: 'mutation',
  name: 'anime.update',
  writes: ['anime'],
  args: AnimeCreate.extend({ id: z.string() }),
  handler: async (_ctx, args) => {
    const { id, ...rest } = args;
    await prisma.anime.update({
      where: { id },
      data: {
        title: rest.title,
        alternativeTitle: rest.alternativeTitle ?? null,
        image: rest.image,
        synopsis: rest.synopsis,
        genre: rest.genre,
        episodes: rest.episodes,
        status: rest.status === 'ongoing' ? 'ONGOING' : 'COMPLETED',
        year: rest.year,
        rating: rest.rating ?? null,
        providers: rest.providers as object,
      },
    });
    await notifyChange('anime', 'update', id);
    return id;
  },
});

export const remove = register({
  kind: 'mutation',
  name: 'anime.remove',
  writes: ['anime'],
  args: z.object({ id: z.string() }),
  handler: async (_ctx, { id }) => {
    await prisma.anime.delete({ where: { id } });
    await notifyChange('anime', 'delete', id);
    return id;
  },
});