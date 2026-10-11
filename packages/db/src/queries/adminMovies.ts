import { z } from 'zod';
import { prisma } from '../client';
import { notifyChange } from '../realtime';
import { register } from '../registry';
import { requireAdmin } from '../lib/requireAdmin';
import { normalizePageArgs, sliceAdminPage, toAdminPage } from '../lib/adminPage';
import { toMovieShape } from '../lib/shapes';
import {
  getMovieQualityFlags,
  matchesQualityFilter,
  type MovieQualityFilter,
} from '../lib/movieQuality';
import { hasManifestForToken } from '../lib/hasManifestForToken';
import { movieMatchesGenre } from '../lib/movieGenre';
import { adminMovieListWhere } from '../lib/adminMovieListWhere';
import { BULK_MAX_TARGETS, isBulkEligible } from '../lib/adminBulk';

const qualityFilterValidator = z.enum([
  'all',
  'orphan_ids',
  'missing_image',
  'missing_image_titled',
  'missing_video',
  'incomplete',
  'missing_backdrop',
]);

/**
 * Ids de todas las películas del filtro actual (búsqueda, género y calidad) que son
 * elegibles para una acción masiva. Lo usa el panel para "todo el filtro".
 */
export const bulkTargetIds = register({
  kind: 'action',
  name: 'adminMovies.bulkTargetIds',
  reads: ['movie'],
  args: z.object({
    search: z.string().optional(),
    genre: z.string().optional(),
    qualityFilter: qualityFilterValidator.optional(),
    purpose: z.enum(['enrich', 'backdrops']),
  }),
  handler: async (ctx, a) => {
    await requireAdmin(ctx);
    const filter: MovieQualityFilter = a.qualityFilter ?? 'all';
    const genre = a.genre?.trim() ?? '';
    const where = adminMovieListWhere({ search: a.search, genre });
    let movies = await prisma.movie.findMany({ where, orderBy: { name: 'asc' } });
    if (genre) movies = movies.filter((movie) => movieMatchesGenre(movie.genre, genre));
    const ids: string[] = [];
    for (const m of movies) {
      const input = {
        name: m.name,
        token: m.token,
        image: m.image,
        videoUrl: m.videoUrl,
        synopsis: m.synopsis,
        actors: m.actors,
        classification: m.classification,
        genre: m.genre,
        backdropImage: m.backdropImage,
      };
      // El manifiesto solo importa para los filtros de video; evitarlo ahorra E/S.
      const needsManifest = filter !== 'all' && (!m.videoUrl || m.videoUrl.trim() === '');
      const hasManifest = needsManifest ? await hasManifestForToken(m.token) : true;
      if (filter !== 'all' && !matchesQualityFilter({ ...input, hasManifest }, filter)) continue;
      if (!isBulkEligible(getMovieQualityFlags({ ...input, hasManifest }), a.purpose)) continue;
      ids.push(m.id);
    }
    return {
      ids: ids.slice(0, BULK_MAX_TARGETS),
      total: ids.length,
      truncated: ids.length > BULK_MAX_TARGETS,
    };
  },
});

export const adminList = register({
  kind: 'query',
  name: 'adminMovies.adminList',
  reads: ['movie'],
  args: z
    .object({
      search: z.string().optional(),
      genre: z.string().optional(),
      qualityFilter: qualityFilterValidator.optional(),
      limit: z.number().optional(),
      offset: z.number().optional(),
    })
    .optional(),
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const a = args ?? {};
    const filter: MovieQualityFilter = a.qualityFilter ?? 'all';
    const genre = a.genre?.trim() ?? '';
    const where = adminMovieListWhere({ search: a.search, genre });
    const paged = a.offset !== undefined;
    const page = normalizePageArgs(a.offset, a.limit);
    // Sin filtros en memoria (género o calidad) se pagina directo en la base de datos.
    const dbPaged = paged && !genre && filter === 'all';
    let movies = await prisma.movie.findMany({
      where,
      orderBy: { name: 'asc' },
      ...(dbPaged
        ? { skip: page.offset, take: page.limit }
        : paged
          ? {}
          : { take: a.limit ?? 200 }),
    });
    const dbTotal = dbPaged ? await prisma.movie.count({ where }) : 0;
    if (genre) {
      movies = movies.filter((movie) => movieMatchesGenre(movie.genre, genre));
    }

    const enriched = await Promise.all(
      movies.map(async (m) => {
        const needsManifestCheck = !m.videoUrl || m.videoUrl.trim() === '';
        const hasManifest = needsManifestCheck ? await hasManifestForToken(m.token) : true;
        return { movie: m, hasManifest };
      })
    );

    let filtered = enriched;
    if (filter !== 'all') {
      filtered = enriched.filter(({ movie: m, hasManifest }) =>
        matchesQualityFilter(
          {
            name: m.name,
            token: m.token,
            image: m.image,
            videoUrl: m.videoUrl,
            synopsis: m.synopsis,
            actors: m.actors,
            classification: m.classification,
            genre: m.genre,
            backdropImage: m.backdropImage,
            hasManifest,
          },
          filter
        )
      );
    }

    const shape = ({ movie, hasManifest }: (typeof filtered)[number]) => ({
      ...toMovieShape(movie),
      quality: getMovieQualityFlags({
        name: movie.name,
        token: movie.token,
        image: movie.image,
        videoUrl: movie.videoUrl,
        synopsis: movie.synopsis,
        actors: movie.actors,
        classification: movie.classification,
        genre: movie.genre,
        backdropImage: movie.backdropImage,
        hasManifest,
      }),
    });
    if (dbPaged) return toAdminPage(filtered.map(shape), dbTotal, page.offset, page.limit);
    if (paged) {
      const slice = sliceAdminPage(filtered, page.offset, page.limit);
      return { ...slice, items: slice.items.map(shape) };
    }
    return filtered.map(shape);
  },
});

export const adminStats = register({
  kind: 'query',
  name: 'adminMovies.adminStats',
  reads: ['movie'],
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const movies = await prisma.movie.findMany();
    let orphanIds = 0;
    let missingImage = 0;
    let missingVideo = 0;
    let incomplete = 0;
    let missingBackdrop = 0;
    for (const movie of movies) {
      const needsManifestCheck = !movie.videoUrl || movie.videoUrl.trim() === '';
      const hasManifest = needsManifestCheck ? await hasManifestForToken(movie.token) : true;
      const flags = getMovieQualityFlags({
        name: movie.name,
        token: movie.token,
        image: movie.image,
        videoUrl: movie.videoUrl,
        synopsis: movie.synopsis,
        actors: movie.actors,
        classification: movie.classification,
        genre: movie.genre,
        backdropImage: movie.backdropImage,
        hasManifest,
      });
      if (flags.isOrphanId) orphanIds++;
      if (flags.isMissingImage) missingImage++;
      if (flags.isMissingVideo) missingVideo++;
      if (flags.isIncomplete) incomplete++;
      if (flags.isMissingBackdrop) missingBackdrop++;
    }
    return {
      total: movies.length,
      orphanIds,
      missingImage,
      missingVideo,
      incomplete,
      missingBackdrop,
    };
  },
});

export const merge = register({
  kind: 'mutation',
  name: 'adminMovies.merge',
  writes: ['movie', 'favorite', 'history'],
  args: z.object({
    sourceId: z.string(),
    targetId: z.string(),
  }),
  handler: async (ctx, { sourceId, targetId }) => {
    await requireAdmin(ctx);
    if (sourceId === targetId) throw new Error('No se puede fusionar una película consigo misma');
    const source = await prisma.movie.findUnique({ where: { id: sourceId } });
    const target = await prisma.movie.findUnique({ where: { id: targetId } });
    if (!source || !target) throw new Error('Película no encontrada');

    // Move favorites & history from source to target.
    await prisma.favorite.updateMany({ where: { movieId: sourceId }, data: { movieId: targetId } });
    await prisma.history.updateMany({ where: { movieId: sourceId }, data: { movieId: targetId } });

    // Patch target with any missing fields from source.
    const patch: Record<string, unknown> = {};
    const pickIfMissing = (
      key: string,
      targetVal: string | null | undefined,
      sourceVal: string | null | undefined
    ) => {
      if ((!targetVal || targetVal === '') && sourceVal && sourceVal !== '') patch[key] = sourceVal;
    };
    pickIfMissing('actors', target.actors, source.actors);
    pickIfMissing('synopsis', target.synopsis, source.synopsis);
    pickIfMissing('classification', target.classification, source.classification);
    pickIfMissing('genre', target.genre, source.genre);
    pickIfMissing('releaseYear', target.releaseYear, source.releaseYear);
    if (!target.image || target.image === '') patch.image = source.image;
    if (!target.videoUrl && source.videoUrl) patch.videoUrl = source.videoUrl;

    if (Object.keys(patch).length > 0) {
      await prisma.movie.update({ where: { id: targetId }, data: patch });
    }
    await prisma.movie.delete({ where: { id: sourceId } });
    await notifyChange('movie', 'update', targetId);
    return { merged: true, targetId };
  },
});

export const recent = register({
  kind: 'query',
  name: 'adminMovies.recent',
  reads: ['movie'],
  args: z
    .object({
      sinceDays: z.number().optional(),
      limit: z.number().optional(),
    })
    .optional(),
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const sinceDays = args?.sinceDays ?? 30;
    const limit = args?.limit ?? 100;
    const since = new Date(Date.now() - sinceDays * 24 * 60 * 60 * 1000);
    const movies = await prisma.movie.findMany({
      where: { createdAt: { gte: since } },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
    return movies.map((movie) => ({
      ...toMovieShape(movie),
      quality: getMovieQualityFlags({
        name: movie.name,
        token: movie.token,
        image: movie.image,
        videoUrl: movie.videoUrl,
        synopsis: movie.synopsis,
        actors: movie.actors,
        classification: movie.classification,
        genre: movie.genre,
        backdropImage: movie.backdropImage,
      }),
    }));
  },
});
