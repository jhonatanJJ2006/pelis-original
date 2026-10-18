/**
 * Anime actions: external provider lookups via Consumet API.
 */
import { z } from 'zod';
import type { Anime } from '@prisma/client';
import { prisma } from '../client';
import { register } from '../registry';
import {
  DEFAULT_ANIME_PROVIDER_ID,
  buildProviderEmbedUrl,
  getEmbedProviders,
  getProviderById,
  getProvidersSortedByPriority,
} from '../lib/anime-providers';
import {
  fetchEpisodesWithFallback,
  fetchVideoByEpisodeNumber,
  fetchVideoWithFallback,
  searchConsumet,
  checkProvidersHealth,
  isEmbedProviderHealthy,
} from '../lib/consumet-client';
import { fetchVidnestEpisode } from '../lib/vidnest-client';
import { fetchEpisodeList } from '../lib/anizip-client';
import { ANIME_STEP_TIMEOUTS_MS, ANIME_STREAM_BUDGET_MS, TimeBudget } from '../lib/time-budget';

/**
 * Id reported for VidNest's server-side HLS. It differs from the `vidnest`
 * iframe embed on purpose: when the HLS fails in the player the client
 * excludes `vidnest-hls`, and the (stable) VidNest iframe stays available.
 */
export const VIDNEST_HLS_PROVIDER_ID = 'vidnest-hls';
import { searchAnilist, getAnilistById } from '../lib/anilist';
import {
  ANILIST_CATALOG_DEFAULT_LIMIT,
  ANILIST_CATALOG_MAX_LIMIT,
  runAnilistImport,
} from '../lib/anilist-import';

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

/**
 * Ensure a catalog row has an AniList id, resolving and persisting it on first
 * use. Everything downstream (episode lists, embed players) is keyed by it.
 */
async function ensureAnilistId(anime: Anime): Promise<number | null> {
  if (anime.anilistId) return anime.anilistId;
  try {
    const results = await searchAnilist(anime.title, anime.year);
    const match = results[0];
    if (!match) return null;
    await prisma.anime.update({
      where: { id: anime.id },
      data: { anilistId: match.id, malId: match.idMal ?? null, format: match.format ?? null },
    });
    return match.id;
  } catch {
    return null;
  }
}

/**
 * Episode list for one season, independent of any streaming provider.
 *
 * Uses ani.zip metadata (Spanish titles, thumbnails, air dates) and falls back
 * to numbered placeholders, so the user can always choose an episode and only
 * then worry about which provider plays it.
 */
export const getSeasonEpisodes = register({
  kind: 'action',
  name: 'anime.getSeasonEpisodes',
  writes: ['anime'],
  args: z.object({ animeId: z.string() }),
  handler: async (_ctx, { animeId }) => {
    const anime = await prisma.anime.findUnique({ where: { id: animeId } });
    if (!anime) throw new Error('Anime no encontrado');

    const anilistId = await ensureAnilistId(anime);
    const { episodes, source } = await fetchEpisodeList(anilistId, anime.episodes);

    return {
      animeId: anime.id,
      anilistId,
      source,
      episodes: episodes.map((ep) => ({
        number: ep.number,
        title: ep.title,
        overview: ep.overview,
        image: ep.image,
        airDate: ep.airDate,
        runtime: ep.runtime,
      })),
    };
  },
});

/**
 * Resolve how to play one episode.
 *
 * `embed` providers only need the AniList id and episode number, so they answer
 * instantly and work even when the server cannot reach streaming sites.
 * `hls` providers are scraped and may return nothing; when that happens and
 * `tryFallback` is set, the best working source is returned instead.
 *
 * When the requested embed is down (probed server-side), we fall back to the
 * `hls` chain first and then to the remaining embeds, **excluding** the
 * provider we already tried and any other embed whose own backend is
 * unhealthy. `fellBackFrom` is reported so the UI can explain the switch.
 */
export const getEpisodeStream = register({
  kind: 'action',
  name: 'anime.getEpisodeStream',
  writes: ['anime'],
  args: z.object({
    animeId: z.string(),
    episodeNumber: z.number().min(1),
    provider: z.string().optional(),
    dub: z.boolean().optional(),
    tryFallback: z.boolean().optional(),
    excludeProviders: z.array(z.string()).optional(),
  }),
  handler: async (
    _ctx,
    { animeId, episodeNumber, provider, dub, tryFallback = true, excludeProviders }
  ) => {
    const budget = new TimeBudget(ANIME_STREAM_BUDGET_MS);
    const anime = await prisma.anime.findUnique({ where: { id: animeId } });
    if (!anime) throw new Error('Anime no encontrado');

    const anilistId = await budget.run(
      () => ensureAnilistId(anime),
      ANIME_STEP_TIMEOUTS_MS.anilist,
      null
    );
    const excluded = new Set(excludeProviders ?? []);
    const timedOut = () => ({
      kind: 'none' as const,
      provider: requested?.id ?? null,
      error:
        'La búsqueda de fuentes tardó demasiado. Prueba otro servidor o vuelve a intentarlo en un momento.',
    });
    const requestedId = provider ?? DEFAULT_ANIME_PROVIDER_ID;
    const requested = excluded.has(requestedId) ? undefined : getProviderById(requestedId);

    if (!anilistId) {
      return {
        kind: 'none' as const,
        provider: null,
        error: 'No pudimos identificar este anime en AniList, así que no hay fuentes disponibles.',
      };
    }

    const embedCtx = { anilistId, malId: anime.malId, episodeNumber, dub };
    let hlsTried = false;
    const failedEmbeds = new Set<string>();

    // VidNest resolves real HLS sources server-side (custom-base64 "cipher",
    // see vidnest-client). Serving them through our own proxy gives every
    // provider the same clean <video> player — no iframes, no popups.
    const tryVidnestHls = async (fellBackFrom?: string | null) => {
      if (excluded.has(VIDNEST_HLS_PROVIDER_ID)) return null;
      try {
        const data = await budget.run(
          () => fetchVidnestEpisode(anilistId, episodeNumber, dub ? 'dub' : 'sub'),
          ANIME_STEP_TIMEOUTS_MS.vidnest,
          null
        );
        if (!data) return null;
        const master =
          data.sources.find((s) => s.type === 'hls' || s.file.includes('.m3u8')) ?? data.sources[0];
        if (!master?.file) return null;
        const proxyParams = new URLSearchParams({ u: master.file });
        if (master.referer) proxyParams.set('r', master.referer);
        return {
          kind: 'hls' as const,
          provider: VIDNEST_HLS_PROVIDER_ID,
          sources: [
            {
              url: `/api/anime/stream?${proxyParams.toString()}`,
              quality: 'auto',
              isM3U8: true,
            },
          ],
          subtitles: (data.tracks ?? [])
            .filter((t) => (t.kind === 'captions' || t.kind === 'subtitles') && t.file)
            .map((t) => ({
              url: `/api/anime/stream?u=${encodeURIComponent(t.file)}`,
              lang: t.label ?? 'Subtítulos',
            })),
          intro: data.intro ?? null,
          outro: data.outro ?? null,
          triedProviders: [VIDNEST_HLS_PROVIDER_ID],
          fellBackFrom: fellBackFrom ?? null,
        };
      } catch {
        return null;
      }
    };

    if (!requested || requested.id === 'vidnest') {
      const vidnest = await tryVidnestHls();
      if (vidnest) return vidnest;
    }

    if (requested?.kind === 'embed') {
      if (requested.resolveEmbedUrl) {
        const resolve = requested.resolveEmbedUrl;
        const url = await budget.run(
          () => resolve(embedCtx, { title: anime.title }),
          ANIME_STEP_TIMEOUTS_MS.resolveEmbed,
          null
        );
        if (url) {
          return { kind: 'embed' as const, provider: requested.id, url, dub: Boolean(dub) };
        }
        failedEmbeds.add(requested.id);
      } else {
        const url = buildProviderEmbedUrl(requested.id, embedCtx);
        // Manual mode (`tryFallback: false`): hand back the requested player
        // as-is — the user decides when to switch, not the server.
        if (url && tryFallback === false) {
          return { kind: 'embed' as const, provider: requested.id, url, dub: Boolean(dub) };
        }
        const healthy = url
          ? await budget.run(
              () => isEmbedProviderHealthy(requested.id),
              ANIME_STEP_TIMEOUTS_MS.embedHealth,
              false
            )
          : false;
        if (url && healthy) {
          return { kind: 'embed' as const, provider: requested.id, url, dub: Boolean(dub) };
        }
        failedEmbeds.add(requested.id);
      }
    }

    if (requested?.kind === 'hls') {
      hlsTried = true;
      const result = await budget.run(
        () => fetchVideoByEpisodeNumber(anilistId, episodeNumber, requested.id, anime.title),
        ANIME_STEP_TIMEOUTS_MS.consumet,
        { provider: null, video: { sources: [], subtitles: [] }, triedProviders: [] } as Awaited<
          ReturnType<typeof fetchVideoByEpisodeNumber>
        >
      );
      if (result.provider && result.video.sources.length > 0) {
        return {
          kind: 'hls' as const,
          provider: result.provider,
          sources: result.video.sources,
          subtitles: result.video.subtitles,
          triedProviders: result.triedProviders,
        };
      }
      if (!tryFallback) {
        return {
          kind: 'none' as const,
          provider: requested.id,
          triedProviders: result.triedProviders,
          error: `${requested.name} no devolvió fuentes para este episodio. Prueba otro servidor.`,
        };
      }
    }

    // Manual mode: the user picked a server and it did not pan out — report
    // it instead of silently playing a different one.
    if (!tryFallback) {
      return {
        kind: 'none' as const,
        provider: requested?.id ?? null,
        error: `${requested?.name ?? 'El servidor'} no tiene este episodio ahora mismo. Elige otro servidor arriba del reproductor.`,
      };
    }

    // The requested source is unavailable. VidNest HLS is the only source we
    // have verified live — try it before the (usually dead) Consumet scrapers.
    if (requested?.id !== 'vidnest') {
      const vidnest = await tryVidnestHls(requested?.id ?? null);
      if (vidnest) return vidnest;
    }
    if (budget.expired()) return timedOut();

    // Try the Consumet hls chain before giving up on native playback.
    if (!hlsTried) {
      const hls = await budget.run(
        () => fetchVideoByEpisodeNumber(anilistId, episodeNumber, undefined, anime.title),
        ANIME_STEP_TIMEOUTS_MS.consumet,
        { provider: null, video: { sources: [], subtitles: [] }, triedProviders: [] } as Awaited<
          ReturnType<typeof fetchVideoByEpisodeNumber>
        >
      );
      if (hls.provider && hls.video.sources.length > 0) {
        return {
          kind: 'hls' as const,
          provider: hls.provider,
          sources: hls.video.sources,
          subtitles: hls.video.subtitles,
          triedProviders: hls.triedProviders,
          fellBackFrom: requested?.id ?? null,
        };
      }
    }

    // Last resort: any embed player, which needs no scraping to work.
    //
    // We skip the requested provider (already failed above) and any other
    // embed whose `buildEmbedUrl` already produced something but whose own
    // backend is known unhealthy — otherwise we'd return the same broken
    // player the user just rejected.
    for (const embed of getEmbedProviders()) {
      if (embed.id === requested?.id || failedEmbeds.has(embed.id) || excluded.has(embed.id))
        continue;
      if (budget.expired()) return timedOut();

      let url: string | null = null;
      if (embed.resolveEmbedUrl) {
        const resolve = embed.resolveEmbedUrl;
        url = await budget.run(
          () => resolve(embedCtx, { title: anime.title }),
          ANIME_STEP_TIMEOUTS_MS.resolveEmbed,
          null
        );
        if (!url) {
          failedEmbeds.add(embed.id);
          continue;
        }
      } else {
        url = buildProviderEmbedUrl(embed.id, embedCtx);
        if (!url) continue;
      }

      const healthy = await budget.run(
        () => isEmbedProviderHealthy(embed.id),
        ANIME_STEP_TIMEOUTS_MS.embedHealth,
        false
      );
      if (!healthy) {
        failedEmbeds.add(embed.id);
        continue;
      }

      return {
        kind: 'embed' as const,
        provider: embed.id,
        url,
        dub: Boolean(dub),
        fellBackFrom: requested?.id ?? null,
      };
    }

    if (budget.expired()) return timedOut();
    return {
      kind: 'none' as const,
      provider: requested?.id ?? null,
      error: 'Ningún proveedor pudo entregar este episodio.',
    };
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
    let title: string | undefined;
    if (dbId) {
      const anime = await prisma.anime.findUnique({ where: { id: dbId } });
      if (anime?.anilistId) {
        anilistId = String(anime.anilistId);
        title = anime.title;
      } else if (anime) {
        title = anime.title;
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

    const result = await fetchEpisodesWithFallback(anilistId, provider, episodePage, title);
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
  args: z.object({
    episodeId: z.string(),
    provider: z.string(),
    tryFallback: z.boolean().optional(),
  }),
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
    const { deriveSeriesFields } = await import('../lib/anime-series');
    const providers = getProvidersSortedByPriority()
      .slice(0, 3)
      .map((p) => ({
        name: p.name,
        url: p.baseUrl,
        language: p.language === 'sub/dub' ? 'sub' : p.language,
        isActive: true,
      }));

    const series = deriveSeriesFields(title, media.format);
    const seriesMainExists = await prisma.anime.count({
      where: { seriesKey: series.seriesKey, isSeriesMain: true },
    });

    const created = await prisma.anime.create({
      data: {
        title,
        alternativeTitle: media.title.native,
        slug: slugifyTitle(title),
        anilistId: media.id,
        malId: media.idMal ?? null,
        image:
          media.coverImage?.extraLarge || media.coverImage?.large || '/peliculas/placeholder.webp',
        synopsis: stripHtml(media.description),
        genre: media.genres ?? [],
        episodes: media.episodes ?? 0,
        status: mapAnilistStatus(media.status) === 'ongoing' ? 'ONGOING' : 'COMPLETED',
        year: media.seasonYear ?? new Date().getFullYear(),
        rating: media.averageScore ? media.averageScore / 10 : null,
        providers,
        ...series,
        isSeriesMain: seriesMainExists === 0,
      },
    });
    return { id: created.id, created: true };
  },
});

export const importCatalogBulk = register({
  kind: 'action',
  name: 'anime.importCatalogBulk',
  writes: ['anime'],
  args: z.object({ limit: z.number().min(1).max(ANILIST_CATALOG_MAX_LIMIT).optional() }),
  handler: async (_ctx, { limit = ANILIST_CATALOG_DEFAULT_LIMIT }) => {
    return runAnilistImport(limit);
  },
});
