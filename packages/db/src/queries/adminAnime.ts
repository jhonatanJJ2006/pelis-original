import { z } from 'zod';
import { prisma } from '../client';
import { notifyChange } from '../realtime';
import { register } from '../registry';
import { requireAdmin } from '../lib/requireAdmin';
import { toAnimeShape } from '../lib/shapes';

const StatusEnum = z.enum(['ongoing', 'completed']);

export const adminList = register({
  kind: 'query',
  name: 'adminAnime.adminList',
  reads: ['anime'],
  args: z
    .object({
      search: z.string().optional(),
      status: StatusEnum.optional(),
      limit: z.number().optional(),
    })
    .optional(),
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const a = args ?? {};
    const search = a.search?.trim().toLowerCase() ?? '';
    const where: Record<string, unknown> = {};
    if (a.status) where.status = a.status === 'ongoing' ? 'ONGOING' : 'COMPLETED';
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { alternativeTitle: { contains: search, mode: 'insensitive' } },
      ];
    }
    const items = await prisma.anime.findMany({
      where,
      orderBy: { title: 'asc' },
      take: a.limit ?? 500,
    });
    return items.map(toAnimeShape);
  },
});

export const adminStats = register({
  kind: 'query',
  name: 'adminAnime.adminStats',
  reads: ['anime'],
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const all = await prisma.anime.findMany();
    let ongoing = 0;
    let completed = 0;
    let totalEpisodes = 0;
    for (const a of all) {
      if (a.status === 'ONGOING') ongoing++;
      else completed++;
      totalEpisodes += a.episodes ?? 0;
    }
    return { total: all.length, ongoing, completed, totalEpisodes };
  },
});

export const getById = register({
  kind: 'query',
  name: 'adminAnime.getById',
  reads: ['anime'],
  args: z.object({ id: z.string() }),
  handler: async (ctx, { id }) => {
    await requireAdmin(ctx);
    const anime = await prisma.anime.findUnique({ where: { id } });
    return anime ? toAnimeShape(anime) : null;
  },
});

// ─── Mutaciones ──────────────────────────────────────────────────────────

const AnimeUpdate = z.object({
  id: z.string(),
  title: z.string().optional(),
  alternativeTitle: z.string().optional(),
  image: z.string().optional(),
  imageId: z.string().optional(),
  synopsis: z.string().optional(),
  genre: z.array(z.string()).optional(),
  episodes: z.number().optional(),
  status: StatusEnum.optional(),
  year: z.number().optional(),
  rating: z.number().optional(),
  anilistId: z.number().optional(),
  malId: z.number().optional(),
  tmdbId: z.number().optional(),
  slug: z.string().optional(),
  providers: z.array(z.object({
    name: z.string(),
    url: z.string(),
    language: z.string(),
    isActive: z.boolean().optional(),
  })).optional(),
});

const AnimeCreate = AnimeUpdate.omit({ id: true }).extend({
  title: z.string().min(1),
  image: z.string().min(1),
  status: StatusEnum,
  year: z.number(),
  providers: z.array(z.object({
    name: z.string(),
    url: z.string(),
    language: z.string(),
    isActive: z.boolean().optional(),
  })),
});

export const create = register({
  kind: 'mutation',
  name: 'adminAnime.create',
  writes: ['anime'],
  args: AnimeCreate,
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const created = await prisma.anime.create({
      data: {
        title: args.title,
        alternativeTitle: args.alternativeTitle ?? null,
        image: args.image,
        imageId: args.imageId ?? null,
        synopsis: args.synopsis ?? '',
        genre: args.genre ?? [],
        episodes: args.episodes ?? 0,
        status: args.status === 'ongoing' ? 'ONGOING' : 'COMPLETED',
        year: args.year,
        rating: args.rating ?? null,
        anilistId: args.anilistId ?? null,
        malId: args.malId ?? null,
        tmdbId: args.tmdbId ?? null,
        slug: args.slug ?? null,
        providers: args.providers as object,
      },
    });
    await notifyChange('anime', 'insert', created.id);
    return created.id;
  },
});

export const update = register({
  kind: 'mutation',
  name: 'adminAnime.update',
  writes: ['anime'],
  args: AnimeUpdate,
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const { id, ...rest } = args;
    const data: Record<string, unknown> = {};
    if (rest.title !== undefined) data.title = rest.title;
    if (rest.alternativeTitle !== undefined) data.alternativeTitle = rest.alternativeTitle;
    if (rest.image !== undefined) data.image = rest.image;
    if (rest.imageId !== undefined) data.imageId = rest.imageId;
    if (rest.synopsis !== undefined) data.synopsis = rest.synopsis;
    if (rest.genre !== undefined) data.genre = rest.genre;
    if (rest.episodes !== undefined) data.episodes = rest.episodes;
    if (rest.status !== undefined) data.status = rest.status === 'ongoing' ? 'ONGOING' : 'COMPLETED';
    if (rest.year !== undefined) data.year = rest.year;
    if (rest.rating !== undefined) data.rating = rest.rating;
    if (rest.anilistId !== undefined) data.anilistId = rest.anilistId;
    if (rest.malId !== undefined) data.malId = rest.malId;
    if (rest.tmdbId !== undefined) data.tmdbId = rest.tmdbId;
    if (rest.slug !== undefined) data.slug = rest.slug;
    if (rest.providers !== undefined) data.providers = rest.providers as object;
    await prisma.anime.update({ where: { id }, data });
    await notifyChange('anime', 'update', id);
    return id;
  },
});

export const remove = register({
  kind: 'mutation',
  name: 'adminAnime.remove',
  writes: ['anime'],
  args: z.object({ id: z.string() }),
  handler: async (ctx, { id }) => {
    await requireAdmin(ctx);
    await prisma.anime.delete({ where: { id } });
    await notifyChange('anime', 'delete', id);
    return id;
  },
});