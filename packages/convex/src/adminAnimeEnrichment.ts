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
  searchMovie,
} from './lib/tmdb';

export const assertAdmin = internalQuery({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    return true;
  },
});

export const getAnimeForEnrichment = internalQuery({
  args: { animeId: v.id('anime') },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.animeId);
  },
});

function animeHasTitle(title: string): boolean {
  return Boolean(title?.trim());
}

export const applyAnimePatch = internalMutation({
  args: {
    animeId: v.id('anime'),
    patch: v.record(v.string(), v.any()),
  },
  handler: async (ctx, args) => {
    const anime = await ctx.db.get(args.animeId);
    if (!anime) throw new Error('Anime no encontrado');

    if (Object.keys(args.patch).length === 0) {
      return { updated: false, fields: [] as string[] };
    }
    await ctx.db.patch(args.animeId, args.patch as any);
    return { updated: true, fields: Object.keys(args.patch) };
  },
});

export const applyAnimeBackdropPatch = internalMutation({
  args: {
    animeId: v.id('anime'),
    backdropImageId: v.id('_storage'),
    replaceBackdrop: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const anime = await ctx.db.get(args.animeId);
    if (!anime) throw new Error('Anime no encontrado');

    const hasExisting = !isMissingBackdrop(anime.backdropImage);
    if (hasExisting && !args.replaceBackdrop) {
      return { updated: false };
    }

    if (
      args.replaceBackdrop &&
      anime.backdropImageId &&
      anime.backdropImageId !== args.backdropImageId
    ) {
      await ctx.storage.delete(anime.backdropImageId);
    }

    await ctx.db.patch(args.animeId, {
      backdropImageId: args.backdropImageId,
      backdropImage: `/anime/${anime._id}-backdrop.webp`,
    });

    return { updated: true };
  },
});

async function ensureAdmin(ctx: ActionCtx) {
  await ctx.runQuery(internal.adminAnimeEnrichment.assertAdmin, {});
}

async function loadEligibleAnime(ctx: ActionCtx, animeId: Id<'anime'>) {
  const anime = await ctx.runQuery(internal.adminAnimeEnrichment.getAnimeForEnrichment, {
    animeId,
  });
  if (!anime) throw new Error('Anime no encontrado');
  if (!animeHasTitle(anime.title)) {
    throw new Error('El anime no tiene un título válido para buscar en TMDB');
  }
  return anime;
}

async function performAnimeEnrichment(
  ctx: ActionCtx,
  animeId: Id<'anime'>,
  tmdbId: number,
  replaceImage = false,
  replaceBackdrop = false
) {
  const anime = await ctx.runQuery(internal.adminAnimeEnrichment.getAnimeForEnrichment, {
    animeId,
  });
  if (!anime) throw new Error('Anime no encontrado');

  const metadata = await fetchTmdbMetadata(
    anime.title,
    anime.year ? String(anime.year) : undefined,
    tmdbId
  );
  if (!metadata) throw new Error(`TMDB sin resultados para "${anime.title}"`);

  const patch: Record<string, unknown> = {};

  if ((isMissingImage(anime.image) || replaceImage) && metadata.posterPath) {
    const blob = await downloadPosterBlob(metadata.posterPath);
    if (blob) {
      const imageId = await ctx.storage.store(blob);
      if (replaceImage && anime.imageId) {
        await ctx.storage.delete(anime.imageId);
      }
      patch.imageId = imageId;
      patch.image = `/anime/${anime._id}.webp`;
    }
  }

  if (metadata.synopsis?.trim() && anime.synopsis.trim().length < 10) {
    patch.synopsis = metadata.synopsis.trim();
  }

  const patchResult = await ctx.runMutation(internal.adminAnimeEnrichment.applyAnimePatch, {
    animeId,
    patch,
  });

  let backdropUpdated = false;
  const shouldDownloadBackdrop =
    metadata.backdropPath &&
    (replaceBackdrop || isMissingBackdrop(anime.backdropImage));

  if (shouldDownloadBackdrop) {
    const blob = await downloadBackdropBlob(metadata.backdropPath!);
    if (blob) {
      const backdropImageId = await ctx.storage.store(blob);
      const backdropResult = await ctx.runMutation(
        internal.adminAnimeEnrichment.applyAnimeBackdropPatch,
        {
          animeId,
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

export const previewAnimeMetadata = action({
  args: {
    animeId: v.id('anime'),
    tmdbId: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await ensureAdmin(ctx);

    const anime = await loadEligibleAnime(ctx, args.animeId);

    const metadata = await fetchTmdbMetadata(
      anime.title,
      anime.year ? String(anime.year) : undefined,
      args.tmdbId
    );

    if (!metadata) {
      return {
        status: 'not_found' as const,
        anime: { id: anime._id, title: anime.title },
        searchQuery: anime.title,
      };
    }

    const canReplaceImage = !!metadata.posterPath;
    const hasExistingImage = !isMissingImage(anime.image);
    const canReplaceBackdrop = !!metadata.backdropPath;
    const hasExistingBackdrop = !isMissingBackdrop(anime.backdropImage);

    const patch: Record<string, unknown> = {};
    if (isMissingImage(anime.image) && metadata.posterPath) {
      patch.imageId = '__pending__';
      patch.image = `/anime/${anime._id}.webp`;
    }
    if (metadata.synopsis?.trim() && anime.synopsis.trim().length < 10) {
      patch.synopsis = metadata.synopsis.trim();
    }

    if (Object.keys(patch).length === 0 && !canReplaceImage && !canReplaceBackdrop) {
      return {
        status: 'nothing_to_fill' as const,
        anime: { id: anime._id, title: anime.title },
      };
    }

    return {
      status: 'ok' as const,
      anime: {
        id: anime._id,
        title: anime.title,
        image: anime.image,
        backdropImage: anime.backdropImage,
      },
      tmdb: {
        tmdbId: metadata.tmdbId,
        title: metadata.title,
        originalTitle: metadata.originalTitle,
        synopsis: metadata.synopsis,
        posterUrl: metadata.posterUrl,
        backdropUrl: metadata.backdropUrl,
      },
      fieldsToApply: Object.keys(patch).filter((f) => f !== 'imageId'),
      canReplaceImage,
      hasExistingImage,
      replaceImageDefault: isMissingImage(anime.image),
      canReplaceBackdrop,
      hasExistingBackdrop,
      replaceBackdropDefault: isMissingBackdrop(anime.backdropImage),
    };
  },
});

export const enrichAnime = action({
  args: {
    animeId: v.id('anime'),
    tmdbId: v.number(),
    replaceImage: v.optional(v.boolean()),
    replaceBackdrop: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    await ensureAdmin(ctx);
    await loadEligibleAnime(ctx, args.animeId);
    return performAnimeEnrichment(
      ctx,
      args.animeId,
      args.tmdbId,
      args.replaceImage ?? false,
      args.replaceBackdrop ?? false
    );
  },
});

async function performAnimeBackdropApply(
  ctx: ActionCtx,
  animeId: Id<'anime'>,
  tmdbId: number,
  replaceBackdrop = false
) {
  const anime = await ctx.runQuery(internal.adminAnimeEnrichment.getAnimeForEnrichment, {
    animeId,
  });
  if (!anime) throw new Error('Anime no encontrado');

  const metadata = await fetchTmdbMetadata(
    anime.title,
    anime.year ? String(anime.year) : undefined,
    tmdbId
  );
  if (!metadata?.backdropPath) {
    throw new Error(`TMDB sin backdrop para "${anime.title}"`);
  }

  const blob = await downloadBackdropBlob(metadata.backdropPath);
  if (!blob) throw new Error('No se pudo descargar el backdrop');

  const backdropImageId = await ctx.storage.store(blob);

  return ctx.runMutation(internal.adminAnimeEnrichment.applyAnimeBackdropPatch, {
    animeId,
    backdropImageId,
    replaceBackdrop: replaceBackdrop || undefined,
  });
}

export const previewAnimeBackdrop = action({
  args: {
    animeId: v.id('anime'),
    tmdbId: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await ensureAdmin(ctx);

    const anime = await loadEligibleAnime(ctx, args.animeId);

    const metadata = await fetchTmdbMetadata(
      anime.title,
      anime.year ? String(anime.year) : undefined,
      args.tmdbId
    );

    if (!metadata) {
      return {
        status: 'not_found' as const,
        anime: { id: anime._id, title: anime.title },
        searchQuery: anime.title,
      };
    }

    if (!metadata.backdropPath) {
      return {
        status: 'no_backdrop' as const,
        anime: { id: anime._id, title: anime.title },
        tmdb: {
          tmdbId: metadata.tmdbId,
          title: metadata.title,
          originalTitle: metadata.originalTitle,
        },
      };
    }

    return {
      status: 'ok' as const,
      anime: {
        id: anime._id,
        title: anime.title,
        image: anime.image,
        backdropImage: anime.backdropImage,
      },
      tmdb: {
        tmdbId: metadata.tmdbId,
        title: metadata.title,
        originalTitle: metadata.originalTitle,
        backdropUrl: metadata.backdropUrl,
      },
      hasExistingBackdrop: !isMissingBackdrop(anime.backdropImage),
    };
  },
});

export const applyAnimeBackdrop = action({
  args: {
    animeId: v.id('anime'),
    tmdbId: v.number(),
    replaceBackdrop: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    await ensureAdmin(ctx);
    await loadEligibleAnime(ctx, args.animeId);
    return performAnimeBackdropApply(
      ctx,
      args.animeId,
      args.tmdbId,
      args.replaceBackdrop ?? false
    );
  },
});
