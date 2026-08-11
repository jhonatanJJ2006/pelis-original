import { v } from 'convex/values';
import type { ActionCtx } from './_generated/server';
import { action, internalMutation, internalQuery } from './_generated/server';
import { internal } from './_generated/api';
import type { Id } from './_generated/dataModel';
import { requireAdmin } from './lib/requireAdmin';
import { hasValidMovieTitle, isMissingBackdrop, isMissingImage } from './lib/movieQuality';
import {
  downloadBackdropBlob,
  downloadPosterBlob,
  fetchTmdbMetadata,
} from './lib/tmdb';

export const assertAdmin = internalQuery({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    return true;
  },
});

export const getSeriesForEnrichment = internalQuery({
  args: { seriesId: v.id('series') },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.seriesId);
  },
});

export const applySeriesPatch = internalMutation({
  args: {
    seriesId: v.id('series'),
    patch: v.record(v.string(), v.any()),
  },
  handler: async (ctx, args) => {
    const series = await ctx.db.get(args.seriesId);
    if (!series) throw new Error('Serie no encontrada');

    if (Object.keys(args.patch).length === 0) {
      return { updated: false, fields: [] as string[] };
    }
    await ctx.db.patch(args.seriesId, args.patch as any);
    return { updated: true, fields: Object.keys(args.patch) };
  },
});

export const applySeriesBackdropPatch = internalMutation({
  args: {
    seriesId: v.id('series'),
    backdropImageId: v.id('_storage'),
    replaceBackdrop: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const series = await ctx.db.get(args.seriesId);
    if (!series) throw new Error('Serie no encontrada');

    const hasExisting = !isMissingBackdrop(series.backdropImage);
    if (hasExisting && !args.replaceBackdrop) {
      return { updated: false };
    }

    if (
      args.replaceBackdrop &&
      series.backdropImageId &&
      series.backdropImageId !== args.backdropImageId
    ) {
      await ctx.storage.delete(series.backdropImageId);
    }

    await ctx.db.patch(args.seriesId, {
      backdropImageId: args.backdropImageId,
      backdropImage: `/series/${series._id}-backdrop.webp`,
    });

    return { updated: true };
  },
});

async function ensureAdmin(ctx: ActionCtx) {
  await ctx.runQuery(internal.adminSeriesEnrichment.assertAdmin, {});
}

async function loadEligibleSeries(ctx: ActionCtx, seriesId: Id<'series'>) {
  const series = await ctx.runQuery(internal.adminSeriesEnrichment.getSeriesForEnrichment, {
    seriesId,
  });
  if (!series) throw new Error('Serie no encontrada');
  if (!hasValidMovieTitle(series.name, series.token)) {
    throw new Error('La serie no tiene un título válido para buscar en TMDB');
  }
  return series;
}

async function performSeriesEnrichment(
  ctx: ActionCtx,
  seriesId: Id<'series'>,
  tmdbId: number,
  replaceImage = false,
  replaceBackdrop = false
) {
  const series = await ctx.runQuery(internal.adminSeriesEnrichment.getSeriesForEnrichment, {
    seriesId,
  });
  if (!series) throw new Error('Serie no encontrada');

  const metadata = await fetchTmdbMetadata(series.name, series.releaseYear, tmdbId);
  if (!metadata) throw new Error(`TMDB sin resultados para "${series.name}"`);

  const patch: Record<string, unknown> = {};

  if ((isMissingImage(series.image) || replaceImage) && metadata.posterPath) {
    const blob = await downloadPosterBlob(metadata.posterPath);
    if (blob) {
      const imageId = await ctx.storage.store(blob);
      if (replaceImage && series.imageId) {
        await ctx.storage.delete(series.imageId);
      }
      patch.imageId = imageId;
      patch.image = `/series/${series._id}.webp`;
    }
  }

  if (metadata.synopsis?.trim() && series.synopsis.trim().length < 10) {
    patch.synopsis = metadata.synopsis.trim();
  }
  if (metadata.genre?.trim() && !series.genre?.trim()) {
    patch.genre = metadata.genre.trim();
  }
  if (metadata.actors?.trim() && !series.actors?.trim()) {
    patch.actors = metadata.actors.trim();
  }
  if (metadata.classification?.trim() && !series.classification?.trim()) {
    patch.classification = metadata.classification.trim();
  }
  if (metadata.releaseYear?.trim() && !/^\d{4}$/.test(series.releaseYear ?? '')) {
    patch.releaseYear = metadata.releaseYear.trim();
  }

  const patchResult = await ctx.runMutation(internal.adminSeriesEnrichment.applySeriesPatch, {
    seriesId,
    patch,
  });

  let backdropUpdated = false;
  const shouldDownloadBackdrop =
    metadata.backdropPath &&
    (replaceBackdrop || isMissingBackdrop(series.backdropImage));

  if (shouldDownloadBackdrop) {
    const blob = await downloadBackdropBlob(metadata.backdropPath!);
    if (blob) {
      const backdropImageId = await ctx.storage.store(blob);
      const backdropResult = await ctx.runMutation(
        internal.adminSeriesEnrichment.applySeriesBackdropPatch,
        {
          seriesId,
          backdropImageId,
          replaceBackdrop: replaceBackdrop || undefined,
        }
      );
      backdropUpdated = backdropResult.updated;
    }
  }

  return {
    updated: patchResult.updated,
    fields: patchResult.fields,
    backdropUpdated,
  };
}

export const previewSeriesMetadata = action({
  args: {
    seriesId: v.id('series'),
    tmdbId: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await ensureAdmin(ctx);

    const series = await loadEligibleSeries(ctx, args.seriesId);

    const metadata = await fetchTmdbMetadata(series.name, series.releaseYear, args.tmdbId);

    if (!metadata) {
      return {
        status: 'not_found' as const,
        series: { id: series._id, name: series.name },
        searchQuery: series.name,
      };
    }

    const canReplaceImage = !!metadata.posterPath;
    const hasExistingImage = !isMissingImage(series.image);
    const canReplaceBackdrop = !!metadata.backdropPath;
    const hasExistingBackdrop = !isMissingBackdrop(series.backdropImage);

    const patch: Record<string, unknown> = {};
    if (isMissingImage(series.image) && metadata.posterPath) {
      patch.imageId = '__pending__';
      patch.image = `/series/${series._id}.webp`;
    }
    if (metadata.synopsis?.trim() && series.synopsis.trim().length < 10) {
      patch.synopsis = metadata.synopsis.trim();
    }
    if (metadata.genre?.trim() && !series.genre?.trim()) {
      patch.genre = metadata.genre.trim();
    }
    if (metadata.actors?.trim() && !series.actors?.trim()) {
      patch.actors = metadata.actors.trim();
    }
    if (metadata.classification?.trim() && !series.classification?.trim()) {
      patch.classification = metadata.classification.trim();
    }

    if (Object.keys(patch).length === 0 && !canReplaceImage && !canReplaceBackdrop) {
      return {
        status: 'nothing_to_fill' as const,
        series: { id: series._id, name: series.name },
      };
    }

    return {
      status: 'ok' as const,
      series: {
        id: series._id,
        name: series.name,
        token: series.token,
        image: series.image,
        backdropImage: series.backdropImage,
      },
      tmdb: {
        tmdbId: metadata.tmdbId,
        title: metadata.title,
        originalTitle: metadata.originalTitle,
        synopsis: metadata.synopsis,
        genre: metadata.genre,
        actors: metadata.actors,
        classification: metadata.classification,
        releaseYear: metadata.releaseYear,
        posterUrl: metadata.posterUrl,
        backdropUrl: metadata.backdropUrl,
      },
      fieldsToApply: Object.keys(patch).filter((f) => f !== 'imageId'),
      canReplaceImage,
      hasExistingImage,
      replaceImageDefault: isMissingImage(series.image),
      canReplaceBackdrop,
      hasExistingBackdrop,
      replaceBackdropDefault: isMissingBackdrop(series.backdropImage),
    };
  },
});

export const enrichSeries = action({
  args: {
    seriesId: v.id('series'),
    tmdbId: v.number(),
    replaceImage: v.optional(v.boolean()),
    replaceBackdrop: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    await ensureAdmin(ctx);
    await loadEligibleSeries(ctx, args.seriesId);
    return performSeriesEnrichment(
      ctx,
      args.seriesId,
      args.tmdbId,
      args.replaceImage ?? false,
      args.replaceBackdrop ?? false
    );
  },
});

async function performSeriesBackdropApply(
  ctx: ActionCtx,
  seriesId: Id<'series'>,
  tmdbId: number,
  replaceBackdrop = false
) {
  const series = await ctx.runQuery(internal.adminSeriesEnrichment.getSeriesForEnrichment, {
    seriesId,
  });
  if (!series) throw new Error('Serie no encontrada');

  const metadata = await fetchTmdbMetadata(series.name, series.releaseYear, tmdbId);
  if (!metadata?.backdropPath) {
    throw new Error(`TMDB sin backdrop para "${series.name}"`);
  }

  const blob = await downloadBackdropBlob(metadata.backdropPath);
  if (!blob) throw new Error('No se pudo descargar el backdrop');

  const backdropImageId = await ctx.storage.store(blob);

  return ctx.runMutation(internal.adminSeriesEnrichment.applySeriesBackdropPatch, {
    seriesId,
    backdropImageId,
    replaceBackdrop: replaceBackdrop || undefined,
  });
}

export const previewSeriesBackdrop = action({
  args: {
    seriesId: v.id('series'),
    tmdbId: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await ensureAdmin(ctx);

    const series = await loadEligibleSeries(ctx, args.seriesId);

    const metadata = await fetchTmdbMetadata(series.name, series.releaseYear, args.tmdbId);

    if (!metadata) {
      return {
        status: 'not_found' as const,
        series: { id: series._id, name: series.name },
        searchQuery: series.name,
      };
    }

    if (!metadata.backdropPath) {
      return {
        status: 'no_backdrop' as const,
        series: { id: series._id, name: series.name },
        tmdb: {
          tmdbId: metadata.tmdbId,
          title: metadata.title,
          originalTitle: metadata.originalTitle,
        },
      };
    }

    return {
      status: 'ok' as const,
      series: {
        id: series._id,
        name: series.name,
        token: series.token,
        image: series.image,
        backdropImage: series.backdropImage,
      },
      tmdb: {
        tmdbId: metadata.tmdbId,
        title: metadata.title,
        originalTitle: metadata.originalTitle,
        backdropUrl: metadata.backdropUrl,
      },
      hasExistingBackdrop: !isMissingBackdrop(series.backdropImage),
    };
  },
});

export const applySeriesBackdrop = action({
  args: {
    seriesId: v.id('series'),
    tmdbId: v.number(),
    replaceBackdrop: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    await ensureAdmin(ctx);
    await loadEligibleSeries(ctx, args.seriesId);
    return performSeriesBackdropApply(
      ctx,
      args.seriesId,
      args.tmdbId,
      args.replaceBackdrop ?? false
    );
  },
});
