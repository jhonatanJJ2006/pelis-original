import { z } from 'zod';
import { prisma } from '../client';
import { notifyChange } from '../realtime';
import { register } from '../registry';
import { getProvidersSortedByPriority } from '../lib/anime-providers';
import { deriveSeriesFields } from '../lib/anime-series';
import { ANIME_SEED } from '../lib/anime-seed-data';
import { slugifyTitle } from '../lib/anilist';

const PROVIDERS = getProvidersSortedByPriority();

export const seed = register({
  kind: 'mutation',
  name: 'anime.seed',
  writes: ['anime'],
  args: z.object({}).optional(),
  handler: async () => {
    const existing = await prisma.anime.count();
    if (existing > 0) return { count: existing, seeded: 0 };
    const defaultProviders = PROVIDERS.slice(0, 2).map((p) => ({
      name: p.name,
      url: `${p.baseUrl}/`,
      language: p.language === 'sub/dub' ? 'sub' : p.language,
      isActive: true,
    }));
    let seeded = 0;
    for (const a of ANIME_SEED) {
      const series = deriveSeriesFields(a.title, a.format);
      const seriesMainExists = await prisma.anime.count({
        where: { seriesKey: series.seriesKey, isSeriesMain: true },
      });
      await prisma.anime.create({
        data: {
          title: a.title,
          alternativeTitle: a.alternativeTitle ?? null,
          slug: slugifyTitle(a.title),
          anilistId: a.anilistId,
          malId: a.malId ?? null,
          image: a.image,
          synopsis: a.synopsis,
          genre: a.genre,
          episodes: a.episodes,
          status: a.status === 'ongoing' ? 'ONGOING' : 'COMPLETED',
          year: a.year,
          rating: a.rating ?? null,
          providers: defaultProviders as object,
          ...series,
          isSeriesMain: seriesMainExists === 0,
        },
      });
      seeded++;
    }
    await notifyChange('anime', 'insert', 'seed');
    return { count: seeded, seeded };
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
    const series = deriveSeriesFields(args.title);
    const seriesMainExists = await prisma.anime.count({
      where: { seriesKey: series.seriesKey, isSeriesMain: true },
    });
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
        ...series,
        isSeriesMain: seriesMainExists === 0,
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
    const current = await prisma.anime.findUnique({ where: { id }, select: { title: true, format: true } });
    // Renaming can move an entry to a different franchise, so recompute the
    // series columns when the title changes.
    const series =
      current && current.title !== rest.title
        ? deriveSeriesFields(rest.title, current.format)
        : null;

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
        ...(series ?? {}),
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