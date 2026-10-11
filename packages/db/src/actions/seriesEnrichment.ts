/**
 * Series-specific enrichment actions.
 */
import { z } from 'zod';
import { prisma } from '../client';
import { notifyChange } from '../realtime';
import { register } from '../registry';
import { requireAdmin } from '../lib/requireAdmin';
import {
  fetchTmdbMetadata,
  downloadPosterBlob,
  downloadBackdropBlob,
  type TmdbMetadata,
} from './enrichment';
import { uploadFile, deleteFile } from '../storage';
import { resolveMovieImagePath } from '../lib/resolveMovieImage';
import { isMissingBackdrop, isMissingImage } from '../lib/movieQuality';

export const fetchTmdbMetadataAction = register({
  kind: 'action',
  name: 'adminSeriesEnrichment.fetchTmdbMetadata',
  args: z.object({
    name: z.string(),
    releaseYear: z.string().optional(),
    tmdbId: z.number().optional(),
  }),
  handler: async (_ctx, args): Promise<TmdbMetadata | null> => {
    return fetchTmdbMetadata(args.name, args.releaseYear, args.tmdbId);
  },
});

export const downloadPosterAction = register({
  kind: 'action',
  name: 'adminSeriesEnrichment.downloadPoster',
  args: z.object({ posterPath: z.string() }),
  handler: async (_ctx, { posterPath }) => {
    const blob = await downloadPosterBlob(posterPath);
    if (!blob) return null;
    return blob.toString('base64');
  },
});

export const downloadBackdropAction = register({
  kind: 'action',
  name: 'adminSeriesEnrichment.downloadBackdrop',
  args: z.object({ backdropPath: z.string() }),
  handler: async (_ctx, { backdropPath }) => {
    const blob = await downloadBackdropBlob(backdropPath);
    if (!blob) return null;
    return blob.toString('base64');
  },
});

export const previewSeriesMetadata = register({
  kind: 'action',
  name: 'adminSeriesEnrichment.previewSeriesMetadata',
  args: z.object({ seriesId: z.string(), tmdbId: z.number().optional() }),
  handler: async (ctx, { seriesId, tmdbId }) => {
    await requireAdmin(ctx);
    const series = await prisma.series.findUnique({ where: { id: seriesId } });
    if (!series) throw new Error('Serie no encontrada');
    const metadata = await fetchTmdbMetadata(series.name, series.releaseYear, tmdbId);
    if (!metadata) {
      return {
        status: 'not_found',
        series: { id: series.id, name: series.name },
        searchQuery: series.name,
      };
    }
    return {
      status: 'ok',
      series: { id: series.id, name: series.name, image: series.image },
      tmdb: metadata,
      canReplaceImage: !!metadata.posterPath,
      hasExistingImage: !isMissingImage(series.image),
      canReplaceBackdrop: !!metadata.backdropPath,
      hasExistingBackdrop: !isMissingBackdrop(series.backdropImage),
    };
  },
});

export const enrichSeries = register({
  kind: 'action',
  name: 'adminSeriesEnrichment.enrichSeries',
  writes: ['series'],
  args: z.object({
    seriesId: z.string(),
    tmdbId: z.number(),
    replaceImage: z.boolean().optional(),
    replaceBackdrop: z.boolean().optional(),
  }),
  handler: async (ctx, { seriesId, tmdbId, replaceImage, replaceBackdrop }) => {
    await requireAdmin(ctx);
    const series = await prisma.series.findUnique({ where: { id: seriesId } });
    if (!series) throw new Error('Serie no encontrada');
    const metadata = await fetchTmdbMetadata(series.name, series.releaseYear, tmdbId);
    if (!metadata) throw new Error(`TMDB sin resultados para "${series.name}"`);
    let imageId: string | undefined;
    if (metadata.posterPath) {
      const blob = await downloadPosterBlob(metadata.posterPath);
      if (blob) {
        const uploaded = await uploadFile(blob);
        imageId = uploaded.id;
      }
    }
    const patch: Record<string, unknown> = {};
    if (imageId && (replaceImage || isMissingImage(series.image))) {
      if (replaceImage && series.imageId) {
        await deleteFile(series.imageId).catch(() => undefined);
      }
      patch.imageId = imageId;
      patch.image = `/uploads/${imageId}.webp`;
    }
    if (!series.synopsis || series.synopsis.trim().length < 10) patch.synopsis = metadata.synopsis;
    if (!series.actors || !series.actors.trim()) patch.actors = metadata.actors;
    if (!series.classification || !series.classification.trim())
      patch.classification = metadata.classification;
    if (!series.genre || !series.genre.trim()) patch.genre = metadata.genre;
    if (Object.keys(patch).length > 0) {
      await prisma.series.update({ where: { id: seriesId }, data: patch });
    }
    if (metadata.backdropPath && (replaceBackdrop || isMissingBackdrop(series.backdropImage))) {
      const blob = await downloadBackdropBlob(metadata.backdropPath);
      if (blob) {
        const uploaded = await uploadFile(blob);
        if (replaceBackdrop && series.backdropImageId) {
          await deleteFile(series.backdropImageId).catch(() => undefined);
        }
        await prisma.series.update({
          where: { id: seriesId },
          data: {
            backdropImageId: uploaded.id,
            backdropImage: resolveMovieImagePath(`/uploads/${uploaded.id}.webp`),
          },
        });
      }
    }
    await notifyChange('series', 'update', seriesId);
    return { updated: true };
  },
});

export const previewSeriesBackdrop = register({
  kind: 'action',
  name: 'adminSeriesEnrichment.previewSeriesBackdrop',
  args: z.object({ seriesId: z.string(), tmdbId: z.number().optional() }),
  handler: async (ctx, { seriesId, tmdbId }) => {
    await requireAdmin(ctx);
    const series = await prisma.series.findUnique({ where: { id: seriesId } });
    if (!series) throw new Error('Serie no encontrada');
    const metadata = await fetchTmdbMetadata(series.name, series.releaseYear, tmdbId);
    if (!metadata) {
      return { status: 'not_found', series: { id: series.id, name: series.name } };
    }
    if (!metadata.backdropPath) {
      return {
        status: 'no_backdrop',
        series: { id: series.id, name: series.name },
        tmdb: metadata,
      };
    }
    return {
      status: 'ok',
      series: {
        id: series.id,
        name: series.name,
        image: series.image,
        backdropImage: series.backdropImage,
      },
      tmdb: metadata,
      hasExistingBackdrop: !isMissingBackdrop(series.backdropImage),
    };
  },
});

export const applySeriesBackdrop = register({
  kind: 'action',
  name: 'adminSeriesEnrichment.applySeriesBackdrop',
  writes: ['series'],
  args: z.object({
    seriesId: z.string(),
    tmdbId: z.number(),
    replaceBackdrop: z.boolean().optional(),
  }),
  handler: async (ctx, { seriesId, tmdbId }) => {
    await requireAdmin(ctx);
    const series = await prisma.series.findUnique({ where: { id: seriesId } });
    if (!series) throw new Error('Serie no encontrada');
    const metadata = await fetchTmdbMetadata(series.name, series.releaseYear, tmdbId);
    if (!metadata?.backdropPath) throw new Error('TMDB sin backdrop');
    const blob = await downloadBackdropBlob(metadata.backdropPath);
    if (!blob) throw new Error('No se pudo descargar');
    const uploaded = await uploadFile(blob);
    await prisma.series.update({
      where: { id: seriesId },
      data: {
        backdropImageId: uploaded.id,
        backdropImage: resolveMovieImagePath(`/uploads/${uploaded.id}.webp`),
      },
    });
    await notifyChange('series', 'update', seriesId);
    return { updated: true };
  },
});

export const applyEnrichment = register({
  kind: 'mutation',
  name: 'adminSeriesEnrichment.applySeriesEnrichment',
  writes: ['series'],
  args: z.object({
    seriesId: z.string(),
    metadata: z.object({
      synopsis: z.string(),
      genre: z.string(),
      actors: z.string(),
      classification: z.string(),
      releaseYear: z.string(),
    }),
    imageId: z.string().optional(),
    replaceImage: z.boolean().optional(),
    backdropImageId: z.string().optional(),
    replaceBackdrop: z.boolean().optional(),
  }),
  handler: async (
    ctx,
    { seriesId, metadata, imageId, replaceImage, backdropImageId, replaceBackdrop }
  ) => {
    await requireAdmin(ctx);
    const series = await prisma.series.findUnique({ where: { id: seriesId } });
    if (!series) throw new Error('Serie no encontrada');

    const patch: Record<string, unknown> = {};
    if (!series.synopsis || series.synopsis.trim().length < 10) patch.synopsis = metadata.synopsis;
    if (!series.actors || !series.actors.trim()) patch.actors = metadata.actors;
    if (!series.classification || !series.classification.trim())
      patch.classification = metadata.classification;
    if (!series.genre || !series.genre.trim()) patch.genre = metadata.genre;

    if (imageId && (replaceImage || isMissingImage(series.image))) {
      if (replaceImage && series.imageId) {
        await deleteFile(series.imageId).catch(() => undefined);
      }
      patch.imageId = imageId;
      patch.image = `/uploads/${imageId}.webp`;
    }

    if (Object.keys(patch).length > 0) {
      await prisma.series.update({ where: { id: seriesId }, data: patch });
    }

    if (backdropImageId && (replaceBackdrop || isMissingBackdrop(series.backdropImage))) {
      if (replaceBackdrop && series.backdropImageId) {
        await deleteFile(series.backdropImageId).catch(() => undefined);
      }
      await prisma.series.update({
        where: { id: seriesId },
        data: {
          backdropImageId,
          backdropImage: resolveMovieImagePath(`/uploads/${backdropImageId}.webp`),
        },
      });
    }

    await notifyChange('series', 'update', seriesId);
    return { updated: true };
  },
});
