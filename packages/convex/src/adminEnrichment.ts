import { v } from 'convex/values';
import type { ActionCtx } from './_generated/server';
import { action, internalMutation, internalQuery } from './_generated/server';
import { internal } from './_generated/api';
import type { Doc, Id } from './_generated/dataModel';
import { requireAdmin } from './lib/requireAdmin';
import {
  buildGapFillPatch,
  getGapFillPreview,
  hasAnyGapToFill,
} from './lib/gapFillPatch';
import { hasValidMovieTitle, isMissingBackdrop, isMissingImage } from './lib/movieQuality';
import {
  downloadBackdropBlob,
  downloadPosterBlob,
  fetchTmdbMetadata,
  searchMovie,
} from './lib/tmdb';

const metadataValidator = v.object({
  synopsis: v.string(),
  genre: v.string(),
  actors: v.string(),
  classification: v.string(),
  releaseYear: v.string(),
});

export const assertAdmin = internalQuery({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    return true;
  },
});

export const getMovieForEnrichment = internalQuery({
  args: { movieId: v.id('movies') },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.movieId);
  },
});

export const applyMetadataPatch = internalMutation({
  args: {
    movieId: v.id('movies'),
    metadata: metadataValidator,
    imageId: v.optional(v.id('_storage')),
    replaceImage: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const movie = await ctx.db.get(args.movieId);
    if (!movie) {
      throw new Error('Película no encontrada');
    }

    const patch = buildGapFillPatch(movie, args.metadata, {
      imageId: args.imageId,
      replaceImage: args.replaceImage,
    });
    if (Object.keys(patch).length === 0) {
      return { updated: false, fields: [] as string[] };
    }

    if (args.replaceImage && args.imageId && movie.imageId && movie.imageId !== args.imageId) {
      await ctx.storage.delete(movie.imageId);
    }

    await ctx.db.patch(args.movieId, patch);
    return { updated: true, fields: Object.keys(patch) };
  },
});

export const applyBackdropPatch = internalMutation({
  args: {
    movieId: v.id('movies'),
    backdropImageId: v.id('_storage'),
    token: v.string(),
    replaceBackdrop: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const movie = await ctx.db.get(args.movieId);
    if (!movie) {
      throw new Error('Película no encontrada');
    }

    const hasExisting = !isMissingBackdrop(movie.backdropImage);
    if (hasExisting && !args.replaceBackdrop) {
      return { updated: false };
    }

    if (
      args.replaceBackdrop &&
      movie.backdropImageId &&
      movie.backdropImageId !== args.backdropImageId
    ) {
      await ctx.storage.delete(movie.backdropImageId);
    }

    await ctx.db.patch(args.movieId, {
      backdropImageId: args.backdropImageId,
      backdropImage: `/peliculas/${args.token}-backdrop.webp`,
    });

    return { updated: true };
  },
});

async function ensureAdmin(ctx: ActionCtx) {
  await ctx.runQuery(internal.adminEnrichment.assertAdmin, {});
}

async function loadEligibleMovie(
  ctx: ActionCtx,
  movieId: Id<'movies'>
): Promise<Doc<'movies'>> {
  const movie = await ctx.runQuery(internal.adminEnrichment.getMovieForEnrichment, {
    movieId,
  });
  if (!movie) {
    throw new Error('Película no encontrada');
  }
  if (!hasValidMovieTitle(movie.name, movie.token)) {
    throw new Error('La película no tiene un título válido para buscar en TMDB');
  }
  return movie;
}

async function performEnrichment(
  ctx: ActionCtx,
  movieId: Id<'movies'>,
  tmdbId: number,
  replaceImage = false,
  replaceBackdrop = false
) {
  const movie = await ctx.runQuery(internal.adminEnrichment.getMovieForEnrichment, {
    movieId,
  });
  if (!movie) {
    throw new Error('Película no encontrada');
  }

  const metadata = await fetchTmdbMetadata(
    movie.name,
    movie.releaseYear,
    tmdbId
  );
  if (!metadata) {
    throw new Error(`TMDB sin resultados para "${movie.name}"`);
  }

  let imageId: Id<'_storage'> | undefined;
  const gapPreview = getGapFillPreview(movie);
  const shouldDownloadPoster =
    metadata.posterPath && (gapPreview.image || replaceImage);

  if (shouldDownloadPoster) {
    const blob = await downloadPosterBlob(metadata.posterPath!);
    if (blob) {
      imageId = await ctx.storage.store(blob);
    }
  }

  const result = await ctx.runMutation(internal.adminEnrichment.applyMetadataPatch, {
    movieId,
    metadata: {
      synopsis: metadata.synopsis,
      genre: metadata.genre,
      actors: metadata.actors,
      classification: metadata.classification,
      releaseYear: metadata.releaseYear,
    },
    imageId,
    replaceImage: replaceImage || undefined,
  });

  let backdropResult: { updated: boolean } = { updated: false };
  const shouldDownloadBackdrop =
    metadata.backdropPath &&
    (replaceBackdrop || isMissingBackdrop(movie.backdropImage));

  if (shouldDownloadBackdrop) {
    const blob = await downloadBackdropBlob(metadata.backdropPath!);
    if (blob) {
      const backdropImageId = await ctx.storage.store(blob);
      backdropResult = await ctx.runMutation(
        internal.adminEnrichment.applyBackdropPatch,
        {
          movieId,
          backdropImageId,
          token: movie.token,
          replaceBackdrop: replaceBackdrop || undefined,
        }
      );
    }
  }

  return {
    movieId,
    tmdbId: metadata.tmdbId,
    title: metadata.title,
    ...result,
    backdropUpdated: backdropResult.updated,
  };
}

export const previewMetadata = action({
  args: {
    movieId: v.id('movies'),
    tmdbId: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await ensureAdmin(ctx);

    const movie = await loadEligibleMovie(ctx, args.movieId);
    const gapPreview = getGapFillPreview(movie);

    const metadata = await fetchTmdbMetadata(
      movie.name,
      movie.releaseYear,
      args.tmdbId
    );

    if (!metadata) {
      return {
        status: 'not_found' as const,
        movie: { id: movie._id, name: movie.name },
        searchQuery: movie.name,
      };
    }

    const canReplaceImage = !!metadata.posterPath;
    const hasExistingImage = !isMissingImage(movie.image);
    const canReplaceBackdrop = !!metadata.backdropPath;
    const hasExistingBackdrop = !isMissingBackdrop(movie.backdropImage);

    if (
      !hasAnyGapToFill(gapPreview) &&
      !canReplaceImage &&
      !canReplaceBackdrop
    ) {
      return {
        status: 'nothing_to_fill' as const,
        movie: { id: movie._id, name: movie.name },
      };
    }

    const patch = buildGapFillPatch(movie, metadata);

    return {
      status: 'ok' as const,
      movie: {
        id: movie._id,
        name: movie.name,
        token: movie.token,
        image: movie.image,
        backdropImage: movie.backdropImage,
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
      willFill: gapPreview,
      fieldsToApply: Object.keys(patch),
      canReplaceImage,
      hasExistingImage,
      replaceImageDefault: gapPreview.image,
      canReplaceBackdrop,
      hasExistingBackdrop,
      replaceBackdropDefault: isMissingBackdrop(movie.backdropImage),
    };
  },
});

export const enrichMovie = action({
  args: {
    movieId: v.id('movies'),
    tmdbId: v.number(),
    replaceImage: v.optional(v.boolean()),
    replaceBackdrop: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    await ensureAdmin(ctx);
    await loadEligibleMovie(ctx, args.movieId);
    return performEnrichment(
      ctx,
      args.movieId,
      args.tmdbId,
      args.replaceImage ?? false,
      args.replaceBackdrop ?? false
    );
  },
});

export const enrichMoviesBulk = action({
  args: {
    movieIds: v.array(v.id('movies')),
  },
  handler: async (ctx, args) => {
    await ensureAdmin(ctx);

    const results: Array<{
      movieId: string;
      name: string;
      status: 'ok' | 'failed' | 'skipped';
      message?: string;
      fields?: string[];
    }> = [];

    for (const movieId of args.movieIds) {
      const movie = await ctx.runQuery(
        internal.adminEnrichment.getMovieForEnrichment,
        { movieId }
      );

      if (!movie) {
        results.push({
          movieId,
          name: movieId,
          status: 'failed',
          message: 'Película no encontrada',
        });
        continue;
      }

      if (!hasValidMovieTitle(movie.name, movie.token)) {
        results.push({
          movieId,
          name: movie.name,
          status: 'skipped',
          message: 'Sin título válido',
        });
        continue;
      }

      const gapPreview = getGapFillPreview(movie);
      if (!hasAnyGapToFill(gapPreview)) {
        results.push({
          movieId,
          name: movie.name,
          status: 'skipped',
          message: 'Sin campos por rellenar',
        });
        continue;
      }

      try {
        const searchResult = await searchMovie(movie.name, movie.releaseYear);
        if (!searchResult) {
          results.push({
            movieId,
            name: movie.name,
            status: 'failed',
            message: 'TMDB sin resultados',
          });
          await new Promise((r) => setTimeout(r, 300));
          continue;
        }

        const enrichResult = await performEnrichment(
          ctx,
          movieId,
          searchResult.id
        );

        results.push({
          movieId,
          name: movie.name,
          status: 'ok',
          fields: enrichResult.fields,
        });
      } catch (error) {
        results.push({
          movieId,
          name: movie.name,
          status: 'failed',
          message: error instanceof Error ? error.message : 'Error desconocido',
        });
      }

      await new Promise((r) => setTimeout(r, 300));
    }

    const ok = results.filter((r) => r.status === 'ok').length;
    const failed = results.filter((r) => r.status === 'failed').length;
    const skipped = results.filter((r) => r.status === 'skipped').length;

    return { ok, failed, skipped, results };
  },
});

async function performBackdropApply(
  ctx: ActionCtx,
  movieId: Id<'movies'>,
  tmdbId: number,
  replaceBackdrop = false
) {
  const movie = await ctx.runQuery(internal.adminEnrichment.getMovieForEnrichment, {
    movieId,
  });
  if (!movie) {
    throw new Error('Película no encontrada');
  }

  const metadata = await fetchTmdbMetadata(
    movie.name,
    movie.releaseYear,
    tmdbId
  );
  if (!metadata?.backdropPath) {
    throw new Error(`TMDB sin backdrop para "${movie.name}"`);
  }

  const blob = await downloadBackdropBlob(metadata.backdropPath);
  if (!blob) {
    throw new Error('No se pudo descargar el backdrop');
  }

  const backdropImageId = await ctx.storage.store(blob);

  return ctx.runMutation(internal.adminEnrichment.applyBackdropPatch, {
    movieId,
    backdropImageId,
    token: movie.token,
    replaceBackdrop: replaceBackdrop || undefined,
  });
}

export const previewBackdrop = action({
  args: {
    movieId: v.id('movies'),
    tmdbId: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await ensureAdmin(ctx);

    const movie = await loadEligibleMovie(ctx, args.movieId);

    const metadata = await fetchTmdbMetadata(
      movie.name,
      movie.releaseYear,
      args.tmdbId
    );

    if (!metadata) {
      return {
        status: 'not_found' as const,
        movie: { id: movie._id, name: movie.name },
        searchQuery: movie.name,
      };
    }

    if (!metadata.backdropPath) {
      return {
        status: 'no_backdrop' as const,
        movie: { id: movie._id, name: movie.name },
        tmdb: {
          tmdbId: metadata.tmdbId,
          title: metadata.title,
          originalTitle: metadata.originalTitle,
          releaseYear: metadata.releaseYear,
        },
      };
    }

    const hasExistingBackdrop = !isMissingBackdrop(movie.backdropImage);

    return {
      status: 'ok' as const,
      movie: {
        id: movie._id,
        name: movie.name,
        token: movie.token,
        image: movie.image,
        backdropImage: movie.backdropImage,
      },
      tmdb: {
        tmdbId: metadata.tmdbId,
        title: metadata.title,
        originalTitle: metadata.originalTitle,
        releaseYear: metadata.releaseYear,
        backdropUrl: metadata.backdropUrl,
      },
      hasExistingBackdrop,
    };
  },
});

export const applyBackdrop = action({
  args: {
    movieId: v.id('movies'),
    tmdbId: v.number(),
    replaceBackdrop: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    await ensureAdmin(ctx);
    await loadEligibleMovie(ctx, args.movieId);
    return performBackdropApply(
      ctx,
      args.movieId,
      args.tmdbId,
      args.replaceBackdrop ?? false
    );
  },
});

export const applyBackdropsBulk = action({
  args: {
    movieIds: v.array(v.id('movies')),
  },
  handler: async (ctx, args) => {
    await ensureAdmin(ctx);

    const results: Array<{
      movieId: string;
      name: string;
      status: 'ok' | 'failed' | 'skipped';
      message?: string;
    }> = [];

    for (const movieId of args.movieIds) {
      const movie = await ctx.runQuery(
        internal.adminEnrichment.getMovieForEnrichment,
        { movieId }
      );

      if (!movie) {
        results.push({
          movieId,
          name: movieId,
          status: 'failed',
          message: 'Película no encontrada',
        });
        continue;
      }

      if (!hasValidMovieTitle(movie.name, movie.token)) {
        results.push({
          movieId,
          name: movie.name,
          status: 'skipped',
          message: 'Sin título válido',
        });
        continue;
      }

      if (!isMissingBackdrop(movie.backdropImage)) {
        results.push({
          movieId,
          name: movie.name,
          status: 'skipped',
          message: 'Ya tiene backdrop',
        });
        continue;
      }

      try {
        const searchResult = await searchMovie(movie.name, movie.releaseYear);
        if (!searchResult) {
          results.push({
            movieId,
            name: movie.name,
            status: 'failed',
            message: 'TMDB sin resultados',
          });
          await new Promise((r) => setTimeout(r, 300));
          continue;
        }

        const applyResult = await performBackdropApply(
          ctx,
          movieId,
          searchResult.id
        );

        results.push({
          movieId,
          name: movie.name,
          status: applyResult.updated ? 'ok' : 'skipped',
          message: applyResult.updated ? undefined : 'Sin cambios',
        });
      } catch (error) {
        results.push({
          movieId,
          name: movie.name,
          status: 'failed',
          message: error instanceof Error ? error.message : 'Error desconocido',
        });
      }

      await new Promise((r) => setTimeout(r, 300));
    }

    const ok = results.filter((r) => r.status === 'ok').length;
    const failed = results.filter((r) => r.status === 'failed').length;
    const skipped = results.filter((r) => r.status === 'skipped').length;

    return { ok, failed, skipped, results };
  },
});
