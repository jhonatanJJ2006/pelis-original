import { z } from 'zod';
import { prisma } from '../client.js';
import { notifyChange } from '../realtime.js';
import { register } from '../registry.js';
import { requireAdmin } from '../lib/requireAdmin.js';

const SeriesCreate = z.object({
  name: z.string(),
  image: z.string(),
  synopsis: z.string(),
  genre: z.string(),
  token: z.string(),
  actors: z.string(),
  classification: z.string(),
  releaseYear: z.string(),
  episodes: z.number().optional(),
  season: z.number().optional(),
  featured: z.boolean().optional(),
});

export const adminList = register({
  kind: 'query',
  name: 'adminSeries.adminList',
  reads: ['series'],
  args: z
    .object({
      search: z.string().optional(),
      limit: z.number().optional(),
    })
    .optional(),
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const a = args ?? {};
    const search = a.search?.trim().toLowerCase() ?? '';
    const where: Record<string, unknown> = {};
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { genre: { contains: search, mode: 'insensitive' } },
        { actors: { contains: search, mode: 'insensitive' } },
      ];
    }
    const items = await prisma.series.findMany({
      where,
      orderBy: { name: 'asc' },
      take: a.limit ?? 500,
    });
    return items.map((s) => ({
      _id: s.id,
      name: s.name,
      image: s.image,
      synopsis: s.synopsis,
      genre: s.genre,
      token: s.token,
      actors: s.actors,
      classification: s.classification,
      releaseYear: s.releaseYear,
      episodes: s.episodes,
      season: s.season,
      featured: s.featured,
      isOrphanId: isOrphan(s.name, s.token),
    }));
  },
});

export const adminStats = register({
  kind: 'query',
  name: 'adminSeries.adminStats',
  reads: ['series'],
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const series = await prisma.series.findMany();
    let orphans = 0;
    let withEpisodes = 0;
    for (const s of series) {
      if (isOrphan(s.name, s.token)) orphans++;
      if (s.episodes && s.episodes > 0) withEpisodes++;
    }
    return { total: series.length, orphans, withEpisodes };
  },
});

export const getById = register({
  kind: 'query',
  name: 'adminSeries.getById',
  reads: ['series'],
  args: z.object({ id: z.string() }),
  handler: async (ctx, { id }) => {
    await requireAdmin(ctx);
    return prisma.series.findUnique({ where: { id } });
  },
});

export const create = register({
  kind: 'mutation',
  name: 'adminSeries.create',
  writes: ['series'],
  args: SeriesCreate,
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const s = await prisma.series.create({ data: args });
    await notifyChange('series', 'insert', s.id);
    return s.id;
  },
});

export const update = register({
  kind: 'mutation',
  name: 'adminSeries.update',
  writes: ['series'],
  args: SeriesCreate.extend({ id: z.string() }),
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const { id, ...rest } = args;
    await prisma.series.update({ where: { id }, data: rest });
    await notifyChange('series', 'update', id);
    return id;
  },
});

export const remove = register({
  kind: 'mutation',
  name: 'adminSeries.remove',
  writes: ['series'],
  args: z.object({ id: z.string() }),
  handler: async (ctx, { id }) => {
    await requireAdmin(ctx);
    await prisma.series.delete({ where: { id } });
    await notifyChange('series', 'delete', id);
    return id;
  },
});

function isOrphan(name: string, token: string): boolean {
  const n = name.trim();
  if (!n) return true;
  if (/^[a-f0-9]{6,}$/i.test(n)) return true;
  if (/^ok(-ru-\d+)?$/i.test(n)) return true;
  if (/^document[-_]\d+$/i.test(n)) return true;
  if (n.toLowerCase() === token.toLowerCase()) return true;
  return false;
}