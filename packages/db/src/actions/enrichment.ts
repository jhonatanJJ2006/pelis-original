/**
 * TMDB + enrichment actions, ported from packages/convex/src/adminEnrichment.ts.
 * Each action is callable via the function registry /api/_fn/<name>.
 */
import { z } from 'zod';
import { prisma } from '../client.js';
import { notifyChange } from '../realtime.js';
import { requireAdmin } from '../lib/requireAdmin.js';
import { hasValidMovieTitle, isMissingBackdrop, isMissingImage } from '../lib/movieQuality.js';
import { uploadFile, deleteFile } from '../storage.js';
import { resolveMovieImagePath } from '../lib/resolveMovieImage.js';
import { register } from '../registry.js';

const TMDB_API_KEY = process.env.TMDB_API_KEY;
const TMDB_BASE = 'https://api.themoviedb.org/3';
const TMDB_IMG = 'https://image.tmdb.org/t/p';

export interface TmdbMetadata {
  tmdbId: number;
  title: string;
  originalTitle: string;
  synopsis: string;
  genre: string;
  actors: string;
  classification: string;
  releaseYear: string;
  posterPath: string | null;
  backdropPath: string | null;
  posterUrl: string;
  backdropUrl: string;
}

export async function fetchTmdbMetadata(
  name: string,
  releaseYear: string | null | undefined,
  tmdbId?: number,
): Promise<TmdbMetadata | null> {
  if (!TMDB_API_KEY) return null;
  let movie: any = null;

  if (tmdbId) {
    const url = `${TMDB_BASE}/movie/${tmdbId}?api_key=${TMDB_API_KEY}&language=es-ES`;
    try {
      const res = await fetch(url);
      if (res.ok) movie = await res.json();
    } catch {
      return null;
    }
  } else {
    const params = new URLSearchParams({
      api_key: TMDB_API_KEY,
      language: 'es-ES',
      query: name,
      include_adult: 'false',
    });
    if (releaseYear) params.set('year', releaseYear);
    try {
      const res = await fetch(`${TMDB_BASE}/search/movie?${params.toString()}`);
      if (res.ok) {
        const data = (await res.json()) as { results?: any[] };
        movie = (data.results ?? [])[0] ?? null;
      }
    } catch {
      return null;
    }
  }

  if (!movie) return null;

  let actors = '';
  try {
    const credits = await fetch(
      `${TMDB_BASE}/movie/${movie.id}/credits?api_key=${TMDB_API_KEY}`,
    );
    if (credits.ok) {
      const data = (await credits.json()) as { cast?: Array<{ name: string }> };
      actors = (data.cast ?? [])
        .slice(0, 6)
        .map((c) => c.name)
        .join(', ');
    }
  } catch {
    // ignore
  }

  return {
    tmdbId: movie.id,
    title: movie.title,
    originalTitle: movie.original_title,
    synopsis: movie.overview,
    genre: ((movie.genres ?? []) as Array<{ name: string }>).map((g) => g.name).join(', '),
    actors,
    classification: movie.adult ? 'R' : 'PG-13',
    releaseYear: (movie.release_date ?? '').slice(0, 4),
    posterPath: movie.poster_path,
    backdropPath: movie.backdrop_path,
    posterUrl: movie.poster_path ? `${TMDB_IMG}/w500${movie.poster_path}` : '',
    backdropUrl: movie.backdrop_path ? `${TMDB_IMG}/w1280${movie.backdrop_path}` : '',
  };
}

export async function searchMovie(
  name: string,
  releaseYear?: string | null,
): Promise<{ id: number; title: string; releaseYear: string } | null> {
  if (!TMDB_API_KEY) return null;
  const params = new URLSearchParams({
    api_key: TMDB_API_KEY,
    language: 'es-ES',
    query: name,
    include_adult: 'false',
  });
  if (releaseYear) params.set('year', releaseYear);
  try {
    const res = await fetch(`${TMDB_BASE}/search/movie?${params.toString()}`);
    if (!res.ok) return null;
    const data = (await res.json()) as {
      results?: Array<{ id: number; title: string; release_date: string }>;
    };
    const m = (data.results ?? [])[0];
    if (!m) return null;
    return { id: m.id, title: m.title, releaseYear: (m.release_date ?? '').slice(0, 4) };
  } catch {
    return null;
  }
}

export async function downloadPosterBlob(posterPath: string): Promise<Buffer | null> {
  try {
    const res = await fetch(`${TMDB_IMG}/original${posterPath}`);
    if (!res.ok) return null;
    const ab = await res.arrayBuffer();
    return Buffer.from(ab);
  } catch {
    return null;
  }
}

export async function downloadBackdropBlob(backdropPath: string): Promise<Buffer | null> {
  try {
    const res = await fetch(`${TMDB_IMG}/original${backdropPath}`);
    if (!res.ok) return null;
    const ab = await res.arrayBuffer();
    return Buffer.from(ab);
  } catch {
    return null;
  }
}

function gapFillPreview(movie: {
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

function buildGapFillPatch(
  movie: { synopsis: string; actors: string; classification: string; genre: string; image: string },
  metadata: TmdbMetadata,
  options?: { imageId?: string; replaceImage?: boolean },
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

// ─── Actions exposed to the function registry ──────────────────────────────

export const previewMetadata = register({
  kind: 'action',
  name: 'adminEnrichment.previewMetadata',
  args: z.object({ movieId: z.string(), tmdbId: z.number().optional() }),
  handler: async (ctx, { movieId, tmdbId }) => {
    await requireAdmin(ctx);
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
    const gapPreview = gapFillPreview({
      synopsis: movie.synopsis,
      actors: movie.actors,
      classification: movie.classification,
      genre: movie.genre,
      image: movie.image,
      backdropImage: movie.backdropImage,
    });
    const canReplaceImage = !!metadata.posterPath;
    const hasExistingImage = !isMissingImage(movie.image);
    const canReplaceBackdrop = !!metadata.backdropPath;
    const hasExistingBackdrop = !isMissingBackdrop(movie.backdropImage);
    if (
      !Object.values(gapPreview).some(Boolean) &&
      !canReplaceImage &&
      !canReplaceBackdrop
    ) {
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
  },
});

async function performEnrichment(
  movieId: string,
  tmdbId: number,
  replaceImage: boolean,
  replaceBackdrop: boolean,
) {
  const movie = await prisma.movie.findUnique({ where: { id: movieId } });
  if (!movie) throw new Error('Película no encontrada');
  const metadata = await fetchTmdbMetadata(movie.name, movie.releaseYear, tmdbId);
  if (!metadata) throw new Error(`TMDB sin resultados para "${movie.name}"`);

  let imageId: string | undefined;
  const gapPreview = gapFillPreview({
    synopsis: movie.synopsis,
    actors: movie.actors,
    classification: movie.classification,
    genre: movie.genre,
    image: movie.image,
    backdropImage: movie.backdropImage,
  });
  const shouldDownloadPoster = metadata.posterPath && (gapPreview.image || replaceImage);
  if (shouldDownloadPoster && metadata.posterPath) {
    const blob = await downloadPosterBlob(metadata.posterPath);
    if (blob) {
      const uploaded = await uploadFile(blob);
      imageId = uploaded.id;
    }
  }

  const patch = buildGapFillPatch(movie, metadata, { imageId, replaceImage });
  let fieldsToApply = Object.keys(patch);
  let updated = fieldsToApply.length > 0;
  if (updated) {
    await prisma.movie.update({ where: { id: movieId }, data: patch });
  }

  let backdropResult = { updated: false };
  const shouldDownloadBackdrop =
    metadata.backdropPath && (replaceBackdrop || isMissingBackdrop(movie.backdropImage));
  if (shouldDownloadBackdrop && metadata.backdropPath) {
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
        backdropResult = { updated: true };
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
    backdropUpdated: backdropResult.updated,
  };
}

export const enrichMovie = register({
  kind: 'action',
  name: 'adminEnrichment.enrichMovie',
  writes: ['movie'],
  args: z.object({
    movieId: z.string(),
    tmdbId: z.number(),
    replaceImage: z.boolean().optional(),
    replaceBackdrop: z.boolean().optional(),
  }),
  handler: async (ctx, { movieId, tmdbId, replaceImage, replaceBackdrop }) => {
    await requireAdmin(ctx);
    const movie = await prisma.movie.findUnique({ where: { id: movieId } });
    if (!movie) throw new Error('Película no encontrada');
    if (!hasValidMovieTitle(movie.name, movie.token)) {
      throw new Error('La película no tiene un título válido para buscar en TMDB');
    }
    return performEnrichment(
      movieId,
      tmdbId,
      replaceImage ?? false,
      replaceBackdrop ?? false,
    );
  },
});

export const enrichMoviesBulk = register({
  kind: 'action',
  name: 'adminEnrichment.enrichMoviesBulk',
  writes: ['movie'],
  args: z.object({ movieIds: z.array(z.string()) }),
  handler: async (ctx, { movieIds }) => {
    await requireAdmin(ctx);
    const results: Array<{ movieId: string; name: string; status: 'ok' | 'failed' | 'skipped'; message?: string; fields?: string[] }> = [];
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
      const gapPreview = gapFillPreview({
        synopsis: movie.synopsis,
        actors: movie.actors,
        classification: movie.classification,
        genre: movie.genre,
        image: movie.image,
      });
      if (!Object.values(gapPreview).some(Boolean)) {
        results.push({ movieId, name: movie.name, status: 'skipped', message: 'Sin campos por rellenar' });
        continue;
      }
      try {
        const search = await searchMovie(movie.name, movie.releaseYear);
        if (!search) {
          results.push({ movieId, name: movie.name, status: 'failed', message: 'TMDB sin resultados' });
          await new Promise((r) => setTimeout(r, 300));
          continue;
        }
        const result = await performEnrichment(movieId, search.id, false, false);
        results.push({ movieId, name: movie.name, status: 'ok', fields: result.fields });
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

async function performBackdropApply(movieId: string, tmdbId: number, replaceBackdrop: boolean) {
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

export const previewBackdrop = register({
  kind: 'action',
  name: 'adminEnrichment.previewBackdrop',
  args: z.object({ movieId: z.string(), tmdbId: z.number().optional() }),
  handler: async (ctx, { movieId, tmdbId }) => {
    await requireAdmin(ctx);
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
  },
});

export const applyBackdrop = register({
  kind: 'action',
  name: 'adminEnrichment.applyBackdrop',
  writes: ['movie'],
  args: z.object({
    movieId: z.string(),
    tmdbId: z.number(),
    replaceBackdrop: z.boolean().optional(),
  }),
  handler: async (ctx, { movieId, tmdbId, replaceBackdrop }) => {
    await requireAdmin(ctx);
    const movie = await prisma.movie.findUnique({ where: { id: movieId } });
    if (!movie) throw new Error('Película no encontrada');
    if (!hasValidMovieTitle(movie.name, movie.token)) {
      throw new Error('La película no tiene un título válido para buscar en TMDB');
    }
    return performBackdropApply(movieId, tmdbId, replaceBackdrop ?? false);
  },
});

export const applyBackdropsBulk = register({
  kind: 'action',
  name: 'adminEnrichment.applyBackdropsBulk',
  writes: ['movie'],
  args: z.object({ movieIds: z.array(z.string()) }),
  handler: async (ctx, { movieIds }) => {
    await requireAdmin(ctx);
    const results: Array<{ movieId: string; name: string; status: 'ok' | 'failed' | 'skipped'; message?: string }> = [];
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
          results.push({ movieId, name: movie.name, status: 'failed', message: 'TMDB sin resultados' });
          await new Promise((r) => setTimeout(r, 300));
          continue;
        }
        const applyResult = await performBackdropApply(movieId, search.id, false);
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

export const assertAdmin = register({
  kind: 'query',
  name: 'adminEnrichment.assertAdmin',
  reads: [],
  handler: async (ctx) => {
    await requireAdmin(ctx);
    return true;
  },
});

export const getMovieForEnrichment = register({
  kind: 'query',
  name: 'adminEnrichment.getMovieForEnrichment',
  reads: ['movie'],
  args: z.object({ movieId: z.string() }),
  handler: async (_ctx, { movieId }) => {
    return prisma.movie.findUnique({ where: { id: movieId } });
  },
});

export const applyMetadataPatch = register({
  kind: 'mutation',
  name: 'adminEnrichment.applyMetadataPatch',
  writes: ['movie'],
  args: z.object({
    movieId: z.string(),
    metadata: z.object({
      synopsis: z.string(),
      genre: z.string(),
      actors: z.string(),
      classification: z.string(),
      releaseYear: z.string(),
    }),
    imageId: z.string().optional(),
    replaceImage: z.boolean().optional(),
  }),
  handler: async (ctx, { movieId, metadata, imageId, replaceImage }) => {
    await requireAdmin(ctx);
    const movie = await prisma.movie.findUnique({ where: { id: movieId } });
    if (!movie) throw new Error('Película no encontrada');
    const patch = buildGapFillPatch(movie, metadata as unknown as TmdbMetadata, { imageId, replaceImage });
    if (Object.keys(patch).length === 0) return { updated: false, fields: [] };
    if (imageId && replaceImage && movie.imageId && movie.imageId !== imageId) {
      await deleteFile(movie.imageId).catch(() => undefined);
    }
    await prisma.movie.update({ where: { id: movieId }, data: patch });
    await notifyChange('movie', 'update', movieId);
    return { updated: true, fields: Object.keys(patch) };
  },
});

export const applyBackdropPatch = register({
  kind: 'mutation',
  name: 'adminEnrichment.applyBackdropPatch',
  writes: ['movie'],
  args: z.object({
    movieId: z.string(),
    backdropImageId: z.string(),
    token: z.string(),
    replaceBackdrop: z.boolean().optional(),
  }),
  handler: async (ctx, { movieId, backdropImageId, token, replaceBackdrop }) => {
    await requireAdmin(ctx);
    const movie = await prisma.movie.findUnique({ where: { id: movieId } });
    if (!movie) throw new Error('Película no encontrada');
    const hasExisting = !isMissingBackdrop(movie.backdropImage);
    if (hasExisting && !replaceBackdrop) return { updated: false };
    if (replaceBackdrop && movie.backdropImageId && movie.backdropImageId !== backdropImageId) {
      await deleteFile(movie.backdropImageId).catch(() => undefined);
    }
    await prisma.movie.update({
      where: { id: movieId },
      data: {
        backdropImageId,
        backdropImage: resolveMovieImagePath(`/uploads/${backdropImageId}.webp`),
      },
    });
    await notifyChange('movie', 'update', movieId);
    return { updated: true };
  },
});