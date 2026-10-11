import { z } from 'zod';
import { prisma } from '../client';
import { notifyChange } from '../realtime';
import { register } from '../registry';
import { requireAdmin } from '../lib/requireAdmin';
import { normalizePageArgs, sliceAdminPage, toAdminPage } from '../lib/adminPage';
import { seriesCreateSchema, seriesUpdateSchema } from '../lib/movie-payload';
import {
  addSeriesMovies,
  createMovieSeriesStore,
  movieInsertFromAdminSeries,
} from '../lib/tmdb-series-import';

/**
 * /series reads Movie.mediaType = SERIES, not the admin `series` table.
 * Copy the ficha across when the token is new. If that token already belongs
 * to a film, leave the film alone. If it already belongs to a series movie,
 * refresh the ficha. Never delete users, movies, or subscriptions.
 */
async function mirrorSeriesToPublicCatalog(series: {
  name: string;
  image: string;
  backdropImage: string | null;
  synopsis: string;
  genre: string;
  token: string;
  actors: string;
  classification: string;
  releaseYear: string;
  episodes: number | null;
  featured: boolean;
}) {
  const mapped = movieInsertFromAdminSeries(series);
  if (!mapped) return;
  const existing = await prisma.movie.findUnique({
    where: { token: mapped.token },
    select: { id: true, mediaType: true },
  });
  if (!existing) {
    const result = await addSeriesMovies([mapped], createMovieSeriesStore(prisma));
    if (result.imported === 0) return;
    const created = await prisma.movie.findUnique({
      where: { token: mapped.token },
      select: { id: true },
    });
    if (created) await notifyChange('movie', 'insert', created.id);
    return;
  }
  if (existing.mediaType !== 'SERIES') return;
  await prisma.movie.update({
    where: { id: existing.id },
    data: {
      name: mapped.name,
      image: mapped.image,
      backdropImage: mapped.backdropImage,
      synopsis: mapped.synopsis,
      genre: mapped.genre,
      actors: mapped.actors,
      classification: mapped.classification,
      releaseYear: mapped.releaseYear,
      episodes: mapped.episodes,
      featured: mapped.featured,
    },
  });
  await notifyChange('movie', 'update', existing.id);
}

export const adminList = register({
  kind: 'query',
  name: 'adminSeries.adminList',
  reads: ['series'],
  args: z
    .object({
      search: z.string().optional(),
      limit: z.number().optional(),
      offset: z.number().optional(),
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
    const paged = a.offset !== undefined;
    const page = normalizePageArgs(a.offset, a.limit);
    const items = await prisma.series.findMany({
      where,
      orderBy: { name: 'asc' },
      ...(paged ? { skip: page.offset, take: page.limit } : { take: a.limit ?? 500 }),
    });
    const total = paged ? await prisma.series.count({ where }) : 0;
    const shaped = items.map((s) => ({
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
    return paged ? toAdminPage(shaped, total, page.offset, page.limit) : shaped;
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
  writes: ['series', 'movie'],
  args: seriesCreateSchema,
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const s = await prisma.series.create({ data: args });
    await notifyChange('series', 'insert', s.id);
    await mirrorSeriesToPublicCatalog(s);
    return s.id;
  },
});

export const update = register({
  kind: 'mutation',
  name: 'adminSeries.update',
  writes: ['series', 'movie'],
  args: seriesUpdateSchema,
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const { id, ...rest } = args;
    await prisma.series.update({ where: { id }, data: rest });
    await notifyChange('series', 'update', id);
    const updated = await prisma.series.findUnique({ where: { id } });
    if (updated) await mirrorSeriesToPublicCatalog(updated);
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
    // Public /series rows stay. Deleting the Movie would also drop favorites/history.
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
