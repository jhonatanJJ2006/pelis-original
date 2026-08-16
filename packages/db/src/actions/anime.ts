/**
 * Anime actions: external provider lookups via Consumet API.
 */
import { z } from 'zod';
import { prisma } from '../client';
import { register } from '../registry';
import {
  getProvidersSortedByPriority,
} from '../lib/anime-providers';
import {
  fetchEpisodesWithFallback,
  fetchVideoWithFallback,
  searchConsumet,
  checkProvidersHealth,
} from '../lib/consumet-client';
import { searchAnilist, getAnilistById } from '../lib/anilist';

export const searchExternal = register({
  kind: 'action',
  name: 'anime.searchExternal',
  args: z.object({ query: z.string() }),
  handler: async (_ctx, { query }) => searchConsumet(query),
});

export const searchAnilistAction = register({
  kind: 'action',
  name: 'anime.searchAnilist',
  args: z.object({ query: z.string(), year: z.number().optional() }),
  handler: async (_ctx, { query, year }) => {
    const results = await searchAnilist(query, year);
    return results.map((m) => ({
      anilistId: m.id,
      malId: m.idMal ?? null,
      title: m.title.english || m.title.romaji || m.title.native,
      alternativeTitle: m.title.native ?? undefined,
      synopsis: m.description?.replace(/<[^>]+>/g, '') ?? '',
      genre: m.genres ?? [],
      episodes: m.episodes ?? 0,
      year: m.seasonYear ?? new Date().getFullYear(),
      rating: m.averageScore ? m.averageScore / 10 : undefined,
      image: m.coverImage?.extraLarge || m.coverImage?.large || '',
      status: m.status === 'RELEASING' ? 'ongoing' : 'completed',
    }));
  },
});

export const resolveAnilistId = register({
  kind: 'action',
  name: 'anime.resolveAnilistId',
  writes: ['anime'],
  args: z.object({ animeId: z.string() }),
  handler: async (_ctx, { animeId }) => {
    const anime = await prisma.anime.findUnique({ where: { id: animeId } });
    if (!anime) throw new Error('Anime no encontrado');
    if (anime.anilistId) return { anilistId: anime.anilistId, malId: anime.malId };

    const results = await searchAnilist(anime.title, anime.year);
    const match = results[0];
    if (!match) return { anilistId: null, malId: null };

    const updated = await prisma.anime.update({
      where: { id: animeId },
      data: {
        anilistId: match.id,
        malId: match.idMal ?? null,
      },
    });
    return { anilistId: updated.anilistId, malId: updated.malId };
  },
});

export const getEpisodes = register({
  kind: 'action',
  name: 'anime.getEpisodes',
  args: z.object({
    animeId: z.string(),
    provider: z.string(),
    episodePage: z.number().optional(),
    dbId: z.string().optional(),
  }),
  handler: async (_ctx, { animeId, provider, episodePage, dbId }) => {
    let anilistId = animeId;
    if (dbId) {
      const anime = await prisma.anime.findUnique({ where: { id: dbId } });
      if (anime?.anilistId) {
        anilistId = String(anime.anilistId);
      } else if (anime) {
        const results = await searchAnilist(anime.title, anime.year);
        if (results[0]) {
          anilistId = String(results[0].id);
          await prisma.anime.update({
            where: { id: dbId },
            data: { anilistId: results[0].id, malId: results[0].idMal ?? null },
          });
        }
      }
    }

    const result = await fetchEpisodesWithFallback(anilistId, provider, episodePage);
    return {
      provider: result.provider,
      episodes: result.episodes,
      triedProviders: result.triedProviders,
    };
  },
});

export const getVideoUrl = register({
  kind: 'action',
  name: 'anime.getVideoUrl',
  args: z.object({ episodeId: z.string(), provider: z.string(), tryFallback: z.boolean().optional() }),
  handler: async (_ctx, { episodeId, provider, tryFallback }) => {
    if (tryFallback === false) {
      const { fetchVideoFromProvider } = await import('../lib/consumet-client');
      const video = await fetchVideoFromProvider(episodeId, provider);
      return { provider, ...video };
    }
    const result = await fetchVideoWithFallback(episodeId, provider);
    return { provider: result.provider, ...result.video, triedProviders: result.triedProviders };
  },
});

export const checkProvidersHealthAction = register({
  kind: 'action',
  name: 'anime.checkProvidersHealth',
  handler: async () => checkProvidersHealth(),
});

export const importFromAnilist = register({
  kind: 'action',
  name: 'anime.importFromAnilist',
  writes: ['anime'],
  args: z.object({ anilistId: z.number() }),
  handler: async (_ctx, { anilistId }) => {
    const existing = await prisma.anime.findUnique({ where: { anilistId } });
    if (existing) return { id: existing.id, created: false };

    const media = await getAnilistById(anilistId);
    if (!media) throw new Error('Anime no encontrado en AniList');

    const title = media.title.english || media.title.romaji || media.title.native || 'Sin título';
    const { slugifyTitle, mapAnilistStatus, stripHtml } = await import('../lib/anilist');
    const providers = getProvidersSortedByPriority().slice(0, 3).map((p) => ({
      name: p.name,
      url: p.baseUrl,
      language: p.language === 'sub/dub' ? 'sub' : p.language,
      isActive: true,
    }));

    const created = await prisma.anime.create({
      data: {
        title,
        alternativeTitle: media.title.native,
        slug: slugifyTitle(title),
        anilistId: media.id,
        malId: media.idMal ?? null,
        image: media.coverImage?.extraLarge || media.coverImage?.large || '/peliculas/placeholder.webp',
        synopsis: stripHtml(media.description),
        genre: media.genres ?? [],
        episodes: media.episodes ?? 0,
        status: mapAnilistStatus(media.status) === 'ongoing' ? 'ONGOING' : 'COMPLETED',
        year: media.seasonYear ?? new Date().getFullYear(),
        rating: media.averageScore ? media.averageScore / 10 : null,
        providers,
      },
    });
    return { id: created.id, created: true };
  },
});

export const importCatalogBulk = register({
  kind: 'action',
  name: 'anime.importCatalogBulk',
  writes: ['anime'],
  args: z.object({ limit: z.number().min(1).max(500).optional() }),
  handler: async (_ctx, { limit = 200 }) => {
    const { runAnilistImport } = await import('../lib/anilist-import');
    return runAnilistImport(limit);
  },
});
