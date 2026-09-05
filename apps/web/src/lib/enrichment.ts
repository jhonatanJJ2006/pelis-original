/**
 * Shared enrichment helpers used by both movie and series backdrops.
 * Implements the same logic as the original Convex adminEnrichment.ts
 * but invoked from Next.js API routes instead of Convex actions.
 */

import { prisma } from '@pelis/db';
import {
  hasValidMovieTitle,
  isMissingBackdrop,
  isMissingImage,
  resolveMovieImagePath,
  uploadFile,
  deleteFile,
  fetchTmdbMetadata,
  downloadPosterBlob,
  downloadBackdropBlob,
  searchMovie,
  type TmdbMetadata,
} from '@pelis/db';
import { notifyChange } from '@pelis/db/realtime';

export interface PreviewResult {
  status: 'ok' | 'not_found' | 'nothing_to_fill' | 'no_backdrop';
  movie?: {
    id: string;
    name: string;
    token?: string;
    image?: string;
    backdropImage?: string | null;
  };
  tmdb?: {
    tmdbId: number;
    title: string;
    originalTitle: string;
    synopsis?: string;
    genre?: string;
    actors?: string;
    classification?: string;
    releaseYear?: string;
    posterUrl?: string;
    backdropUrl?: string;
  };
  willFill?: Record<string, boolean>;
  fieldsToApply?: string[];
  canReplaceImage?: boolean;
  hasExistingImage?: boolean;
  replaceImageDefault?: boolean;
  canReplaceBackdrop?: boolean;
  hasExistingBackdrop?: boolean;
  replaceBackdropDefault?: boolean;
  searchQuery?: string;
}

export function gapFillPreview(movie: {
  synopsis: string;
  actors: string;
  classification: string;
  genre: string;
  image: string;
  backdropImage?: string | null;
}): Record<string, boolean> {
  return {
    synopsis: !movie.synopsis || movie.synopsis.trim().length < 10,
    actors: !movie.actors || !movie.actors.trim(),
    classification: !movie.classification || !movie.classification.trim(),
    genre: !movie.genre || !movie.genre.trim(),
    image: isMissingImage(movie.image),
    backdropImage: isMissingBackdrop(movie.backdropImage),
  };
}

export function buildGapFillPatch(
  movie: {
    synopsis: string;
    actors: string;
    classification: string;
    genre: string;
    image: string;
    imageId?: string | null;
  },
  metadata: TmdbMetadata,
  options?: { imageId?: string; replaceImage?: boolean }
): Record<string, unknown> {
  const patch: Record<string, unknown> = {};
  const gap = gapFillPreview({
    synopsis: movie.synopsis,
    actors: movie.actors,
    classification: movie.classification,
    genre: movie.genre,
    image: movie.image,
  });
  if (gap.synopsis && metadata.synopsis) patch.synopsis = metadata.synopsis;
  if (gap.actors && metadata.actors) patch.actors = metadata.actors;
  if (gap.classification && metadata.classification) patch.classification = metadata.classification;
  if (gap.genre && metadata.genre) patch.genre = metadata.genre;
  if (options?.imageId) {
    const shouldReplace = options.replaceImage ?? gap.image;
    if (shouldReplace || gap.image) {
      patch.imageId = options.imageId;
      patch.image = `/uploads/${options.imageId}.webp`;
    }
  }
  return patch;
}

export async function previewMovieMetadata(
  movieId: string,
  tmdbId?: number
): Promise<PreviewResult> {
  const movie = await prisma.movie.findUnique({ where: { id: movieId } });
  if (!movie) throw new Error('Película no encontrada');
  if (!hasValidMovieTitle(movie.name, movie.token)) {
    throw new Error('La película no tiene un título válido para buscar en TMDB');
  }

  const metadata = await fetchTmdbMetadata(movie.name, movie.releaseYear, tmdbId);
  if (!metadata) {
    return {
      status: 'not_found',
      movie: { id: movie.id, name: movie.name, token: movie.token, image: movie.image },
      searchQuery: movie.name,
    };
  }

  const gapPreview = {
    ...gapFillPreview({
      synopsis: movie.synopsis,
      actors: movie.actors,
      classification: movie.classification,
      genre: movie.genre,
      image: movie.image,
      backdropImage: movie.backdropImage,
    }),
  };
  const canReplaceImage = !!metadata.posterPath;
  const hasExistingImage = !isMissingImage(movie.image);
  const canReplaceBackdrop = !!metadata.backdropPath;
  const hasExistingBackdrop = !isMissingBackdrop(movie.backdropImage);
  if (!Object.values(gapPreview).some(Boolean) && !canReplaceImage && !canReplaceBackdrop) {
    return {
      status: 'nothing_to_fill',
      movie: { id: movie.id, name: movie.name },
    };
  }

  const patch = buildGapFillPatch(movie, metadata);
  return {
    status: 'ok',
    movie: {
      id: movie.id,
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
}

export async function previewMovieBackdrop(
  movieId: string,
  tmdbId?: number
): Promise<PreviewResult> {
  const movie = await prisma.movie.findUnique({ where: { id: movieId } });
  if (!movie) throw new Error('Película no encontrada');
  if (!hasValidMovieTitle(movie.name, movie.token)) {
    throw new Error('La película no tiene un título válido para buscar en TMDB');
  }

  const metadata = await fetchTmdbMetadata(movie.name, movie.releaseYear, tmdbId);
  if (!metadata) {
    return {
      status: 'not_found',
      movie: { id: movie.id, name: movie.name },
      searchQuery: movie.name,
    };
  }
  if (!metadata.backdropPath) {
    return {
      status: 'no_backdrop',
      movie: { id: movie.id, name: movie.name },
      tmdb: {
        tmdbId: metadata.tmdbId,
        title: metadata.title,
        originalTitle: metadata.originalTitle,
        releaseYear: metadata.releaseYear,
      },
    };
  }
  return {
    status: 'ok',
    movie: {
      id: movie.id,
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
    hasExistingBackdrop: !isMissingBackdrop(movie.backdropImage),
  };
}

export async function performMovieEnrichment(
  movieId: string,
  tmdbId: number,
  replaceImage = false,
  replaceBackdrop = false
) {
  const movie = await prisma.movie.findUnique({ where: { id: movieId } });
  if (!movie) throw new Error('Película no encontrada');
  const metadata = await fetchTmdbMetadata(movie.name, movie.releaseYear, tmdbId);
  if (!metadata) throw new Error(`TMDB sin resultados para "${movie.name}"`);

  let imageId: string | undefined;
  if (metadata.posterPath) {
    const blob = await downloadPosterBlob(metadata.posterPath);
    if (blob) {
      const uploaded = await uploadFile(blob);
      imageId = uploaded.id;
      // Best-effort cleanup of the previous image.
      if (movie.imageId && replaceImage) {
        await deleteFile(movie.imageId).catch(() => undefined);
      }
    }
  }

  const patch = buildGapFillPatch(movie, metadata, { imageId, replaceImage });
  let fieldsToApply = Object.keys(patch);
  let updated = fieldsToApply.length > 0;
  if (updated) {
    await prisma.movie.update({ where: { id: movieId }, data: patch });
  }

  let backdropUpdated = false;
  if (metadata.backdropPath && (replaceBackdrop || isMissingBackdrop(movie.backdropImage))) {
    const blob = await downloadBackdropBlob(metadata.backdropPath);
    if (blob) {
      const uploaded = await uploadFile(blob);
      const hasExisting = !isMissingBackdrop(movie.backdropImage);
      if (!hasExisting || replaceBackdrop) {
        if (movie.backdropImageId && replaceBackdrop) {
          await deleteFile(movie.backdropImageId).catch(() => undefined);
        }
        await prisma.movie.update({
          where: { id: movieId },
          data: {
            backdropImageId: uploaded.id,
            backdropImage: resolveMovieImagePath(`/uploads/${uploaded.id}.webp`),
          },
        });
        backdropUpdated = true;
      }
    }
  }

  await notifyChange('movie', 'update', movieId);

  return {
    movieId,
    tmdbId: metadata.tmdbId,
    title: metadata.title,
    updated,
    fields: fieldsToApply,
    backdropUpdated,
  };
}

export async function performMovieBackdrop(
  movieId: string,
  tmdbId: number,
  replaceBackdrop = false
) {
  const movie = await prisma.movie.findUnique({ where: { id: movieId } });
  if (!movie) throw new Error('Película no encontrada');
  const metadata = await fetchTmdbMetadata(movie.name, movie.releaseYear, tmdbId);
  if (!metadata?.backdropPath) throw new Error(`TMDB sin backdrop para "${movie.name}"`);
  const blob = await downloadBackdropBlob(metadata.backdropPath);
  if (!blob) throw new Error('No se pudo descargar el backdrop');
  const uploaded = await uploadFile(blob);
  const hasExisting = !isMissingBackdrop(movie.backdropImage);
  if (!hasExisting || replaceBackdrop) {
    if (movie.backdropImageId && replaceBackdrop) {
      await deleteFile(movie.backdropImageId).catch(() => undefined);
    }
    await prisma.movie.update({
      where: { id: movieId },
      data: {
        backdropImageId: uploaded.id,
        backdropImage: resolveMovieImagePath(`/uploads/${uploaded.id}.webp`),
      },
    });
  }
  await notifyChange('movie', 'update', movieId);
  return { updated: true };
}

export async function bulkEnrichMovies(movieIds: string[]): Promise<{
  ok: number;
  failed: number;
  skipped: number;
  results: Array<{
    movieId: string;
    name: string;
    status: 'ok' | 'failed' | 'skipped';
    message?: string;
    fields?: string[];
  }>;
}> {
  const results: Array<{
    movieId: string;
    name: string;
    status: 'ok' | 'failed' | 'skipped';
    message?: string;
    fields?: string[];
  }> = [];

  for (const movieId of movieIds) {
    const movie = await prisma.movie.findUnique({ where: { id: movieId } });
    if (!movie) {
      results.push({ movieId, name: movieId, status: 'failed', message: 'Película no encontrada' });
      continue;
    }
    if (!hasValidMovieTitle(movie.name, movie.token)) {
      results.push({ movieId, name: movie.name, status: 'skipped', message: 'Sin título válido' });
      continue;
    }
    const gap = gapFillPreview({
      synopsis: movie.synopsis,
      actors: movie.actors,
      classification: movie.classification,
      genre: movie.genre,
      image: movie.image,
    });
    if (!Object.values(gap).some(Boolean)) {
      results.push({
        movieId,
        name: movie.name,
        status: 'skipped',
        message: 'Sin campos por rellenar',
      });
      continue;
    }
    try {
      const search = await searchMovie(movie.name, movie.releaseYear);
      if (!search) {
        results.push({
          movieId,
          name: movie.name,
          status: 'failed',
          message: 'TMDB sin resultados',
        });
        await new Promise((r) => setTimeout(r, 300));
        continue;
      }
      const enrichResult = await performMovieEnrichment(movieId, search.id);
      results.push({ movieId, name: movie.name, status: 'ok', fields: enrichResult.fields });
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
}

export async function bulkApplyBackdrops(movieIds: string[]): Promise<{
  ok: number;
  failed: number;
  skipped: number;
  results: Array<{
    movieId: string;
    name: string;
    status: 'ok' | 'failed' | 'skipped';
    message?: string;
  }>;
}> {
  const results: Array<{
    movieId: string;
    name: string;
    status: 'ok' | 'failed' | 'skipped';
    message?: string;
  }> = [];
  for (const movieId of movieIds) {
    const movie = await prisma.movie.findUnique({ where: { id: movieId } });
    if (!movie) {
      results.push({ movieId, name: movieId, status: 'failed', message: 'Película no encontrada' });
      continue;
    }
    if (!hasValidMovieTitle(movie.name, movie.token)) {
      results.push({ movieId, name: movie.name, status: 'skipped', message: 'Sin título válido' });
      continue;
    }
    if (!isMissingBackdrop(movie.backdropImage)) {
      results.push({ movieId, name: movie.name, status: 'skipped', message: 'Ya tiene backdrop' });
      continue;
    }
    try {
      const search = await searchMovie(movie.name, movie.releaseYear);
      if (!search) {
        results.push({
          movieId,
          name: movie.name,
          status: 'failed',
          message: 'TMDB sin resultados',
        });
        await new Promise((r) => setTimeout(r, 300));
        continue;
      }
      const result = await performMovieBackdrop(movieId, search.id);
      results.push({
        movieId,
        name: movie.name,
        status: result.updated ? 'ok' : 'skipped',
        message: result.updated ? undefined : 'Sin cambios',
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
}
