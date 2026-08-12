/**
 * Anime-specific enrichment actions (TMDB + provider search).
 * These are exposed to the client through the function registry.
 */
import { z } from 'zod';
import { register } from '../registry';
import {
  fetchTmdbMetadata,
  downloadPosterBlob,
  downloadBackdropBlob,
  type TmdbMetadata,
} from './enrichment';

const CONSUMET_API = 'https://api.consumet.org';

export const fetchTmdbMetadataAction = register({
  kind: 'action',
  name: 'adminAnimeEnrichment.fetchTmdbMetadata',
  args: z.object({
    name: z.string(),
    releaseYear: z.string().optional(),
    tmdbId: z.number().optional(),
  }),
  handler: async (_ctx, args): Promise<TmdbMetadata | null> => {
    return fetchTmdbMetadata(args.name, args.releaseYear, args.tmdbId);
  },
});

export const previewAnimeMetadata = register({
  kind: 'action',
  name: 'adminAnimeEnrichment.previewAnimeMetadata',
  args: z.object({ animeId: z.string(), tmdbId: z.number().optional() }),
  handler: async (_ctx, { animeId, tmdbId }) => {
    const { prisma } = await import('../client');
    const anime = await prisma.anime.findUnique({ where: { id: animeId } });
    if (!anime) throw new Error('Anime no encontrado');
    const metadata = await fetchTmdbMetadata(anime.title, String(anime.year), tmdbId);
    if (!metadata) {
      return { status: 'not_found', anime: { id: anime.id, title: anime.title } };
    }
    return {
      status: 'ok',
      anime: { id: anime.id, title: anime.title, image: anime.image },
      tmdb: metadata,
    };
  },
});

export const enrichAnime = register({
  kind: 'action',
  name: 'adminAnimeEnrichment.enrichAnime',
  writes: ['anime'],
  args: z.object({
    animeId: z.string(),
    tmdbId: z.number(),
    replaceImage: z.boolean().optional(),
    replaceBackdrop: z.boolean().optional(),
  }),
  handler: async (_ctx, { animeId, tmdbId }) => {
    const { prisma } = await import('../client');
    const anime = await prisma.anime.findUnique({ where: { id: animeId } });
    if (!anime) throw new Error('Anime no encontrado');
    const metadata = await fetchTmdbMetadata(anime.title, String(anime.year), tmdbId);
    if (!metadata) throw new Error(`TMDB sin resultados para "${anime.title}"`);
    let imageId: string | undefined;
    if (metadata.posterPath) {
      const blob = await downloadPosterBlob(metadata.posterPath);
      if (blob) {
        const uploaded = await uploadFileLocal(blob);
        imageId = uploaded.id;
      }
    }
    const patch: Record<string, unknown> = {};
    if (imageId) {
      patch.imageId = imageId;
      patch.image = `/uploads/${imageId}.webp`;
    }
    if (!anime.synopsis || anime.synopsis.length < 10) patch.synopsis = metadata.synopsis;
    if (!anime.genre || anime.genre.length === 0) patch.genre = metadata.genre.split(', ');
    if (Object.keys(patch).length > 0) {
      await prisma.anime.update({ where: { id: animeId }, data: patch });
    }
    await notifyChangeAnime(animeId);
    return { updated: true };
  },
});

export const previewAnimeBackdrop = register({
  kind: 'action',
  name: 'adminAnimeEnrichment.previewAnimeBackdrop',
  args: z.object({ animeId: z.string(), tmdbId: z.number().optional() }),
  handler: async (_ctx, { animeId, tmdbId }) => {
    const { prisma } = await import('../client');
    const anime = await prisma.anime.findUnique({ where: { id: animeId } });
    if (!anime) throw new Error('Anime no encontrado');
    const metadata = await fetchTmdbMetadata(anime.title, String(anime.year), tmdbId);
    if (!metadata) {
      return { status: 'not_found', anime: { id: anime.id, title: anime.title } };
    }
    if (!metadata.backdropPath) {
      return { status: 'no_backdrop', anime: { id: anime.id, title: anime.title } };
    }
    return {
      status: 'ok',
      anime: { id: anime.id, title: anime.title, image: anime.image, backdropImage: anime.backdropImage },
      tmdb: metadata,
    };
  },
});

export const applyAnimeBackdrop = register({
  kind: 'action',
  name: 'adminAnimeEnrichment.applyAnimeBackdrop',
  writes: ['anime'],
  args: z.object({
    animeId: z.string(),
    tmdbId: z.number(),
    replaceBackdrop: z.boolean().optional(),
  }),
  handler: async (_ctx, { animeId, tmdbId }) => {
    const { prisma } = await import('../client');
    const anime = await prisma.anime.findUnique({ where: { id: animeId } });
    if (!anime) throw new Error('Anime no encontrado');
    const metadata = await fetchTmdbMetadata(anime.title, String(anime.year), tmdbId);
    if (!metadata?.backdropPath) throw new Error('TMDB sin backdrop');
    const blob = await downloadBackdropBlob(metadata.backdropPath);
    if (!blob) throw new Error('No se pudo descargar');
    const uploaded = await uploadFileLocal(blob);
    await prisma.anime.update({
      where: { id: animeId },
      data: {
        backdropImageId: uploaded.id,
        backdropImage: `/uploads/${uploaded.id}.webp`,
      },
    });
    await notifyChangeAnime(animeId);
    return { updated: true };
  },
});

// Local helpers so we don't need to duplicate storage imports.
async function uploadFileLocal(blob: Buffer) {
  const { uploadFile } = await import('../storage');
  return uploadFile(blob);
}
async function notifyChangeAnime(id: string) {
  const { notifyChange } = await import('../realtime');
  await notifyChange('anime', 'update', id);
}

export const downloadPosterAction = register({
  kind: 'action',
  name: 'adminAnimeEnrichment.downloadPoster',
  args: z.object({ posterPath: z.string() }),
  handler: async (_ctx, { posterPath }) => {
    const blob = await downloadPosterBlob(posterPath);
    if (!blob) return null;
    // Return as base64 so it can be uploaded by the client.
    return blob.toString('base64');
  },
});

export const downloadBackdropAction = register({
  kind: 'action',
  name: 'adminAnimeEnrichment.downloadBackdrop',
  args: z.object({ backdropPath: z.string() }),
  handler: async (_ctx, { backdropPath }) => {
    const blob = await downloadBackdropBlob(backdropPath);
    if (!blob) return null;
    return blob.toString('base64');
  },
});

export const searchExternalAction = register({
  kind: 'action',
  name: 'adminAnimeEnrichment.searchExternal',
  args: z.object({ query: z.string() }),
  handler: async (_ctx, { query }) => {
    const results: unknown[] = [];
    const providers = ['gogoanime', 'zoro', 'animepahe'];
    for (const provider of providers) {
      try {
        const response = await fetch(
          `${CONSUMET_API}/meta/anilist/${encodeURIComponent(query)}?provider=${provider}`,
          { signal: AbortSignal.timeout(5000) },
        );
        if (response.ok) {
          const data = await response.json();
          results.push(...((data as { results?: unknown[] }).results ?? []).slice(0, 5));
        }
      } catch {
        // ignore
      }
    }
    return results;
  },
});