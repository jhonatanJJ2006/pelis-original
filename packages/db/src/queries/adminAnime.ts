import { z } from 'zod';
import { prisma } from '../client.js';
import { register } from '../registry.js';
import { requireAdmin } from '../lib/requireAdmin.js';

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
    return prisma.anime.findMany({
      where,
      orderBy: { title: 'asc' },
      take: a.limit ?? 500,
    });
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
    return prisma.anime.findUnique({ where: { id } });
  },
});