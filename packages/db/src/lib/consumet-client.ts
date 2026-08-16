/**
 * Consumet API client for `hls` providers, with fallback between them.
 *
 * Consumet scrapes third-party sites, so every call here is best-effort: a
 * provider can be perfectly configured and still return nothing because the
 * site changed or blocks the server. Callers must treat empty results as normal
 * and fall back to an `embed` provider.
 */
import {
  getConsumetApiUrl,
  getHlsProviders,
  getProviderById,
  getProvidersSortedByPriority,
  ANIME_STREAMING_PROVIDERS,
  HEALTH_CHECK_ANILIST_ID,
  DEFAULT_ANIME_PROVIDER_ID,
} from './anime-providers';

export interface AnimeEpisode {
  id: string;
  number: number;
  title: string;
  image: string;
  description: string;
}

export interface VideoSourceResult {
  sources: Array<{ url: string; quality: string; isM3U8?: boolean }>;
  subtitles: Array<{ url: string; lang: string }>;
}

export interface ProviderHealthResult {
  id: string;
  name: string;
  kind: 'embed' | 'hls';
  ok: boolean;
  responseMs: number | null;
  error?: string;
}

let healthCache: { at: number; results: ProviderHealthResult[] } | null = null;
const HEALTH_CACHE_TTL_MS = 15 * 60 * 1000;

/** Embed hosts reject requests without a browser User-Agent (403). */
const BROWSER_USER_AGENT =
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36';

async function consumetFetch(path: string, timeoutMs = 10000): Promise<Response> {
  const base = getConsumetApiUrl();
  return fetch(`${base}${path}`, { signal: AbortSignal.timeout(timeoutMs) });
}

/** Map a provider id to the slug Consumet expects (HiAnime is `zoro` there). */
function consumetSlug(providerId: string): string {
  return getProviderById(providerId)?.consumetId ?? providerId;
}

export async function fetchEpisodesFromProvider(
  anilistId: string | number,
  providerId: string,
  episodePage?: number,
): Promise<AnimeEpisode[]> {
  const pageParam = episodePage ? `&page=${episodePage}` : '';
  try {
    const response = await consumetFetch(
      `/meta/anilist/info/${anilistId}?provider=${consumetSlug(providerId)}${pageParam}`,
    );
    if (!response.ok) return [];
    const data = (await response.json()) as {
      episodes?: Array<{
        id: string;
        number: number;
        title?: string;
        image?: string;
        description?: string;
      }>;
    };
    return (data.episodes ?? []).map((ep) => ({
      id: ep.id,
      number: ep.number,
      title: ep.title ?? `Episodio ${ep.number}`,
      image: ep.image ?? '',
      description: ep.description ?? '',
    }));
  } catch {
    return [];
  }
}

export async function fetchVideoFromProvider(
  episodeId: string,
  providerId: string,
): Promise<VideoSourceResult> {
  try {
    const response = await consumetFetch(
      `/meta/anilist/watch/${episodeId}?provider=${consumetSlug(providerId)}`,
    );
    if (!response.ok) return { sources: [], subtitles: [] };
    const data = (await response.json()) as {
      sources?: Array<{ url: string; quality?: string; isM3U8?: boolean }>;
      subtitles?: Array<{ url: string; lang?: string }>;
    };
    return {
      sources: (data.sources ?? []).map((s) => ({
        url: s.url,
        quality: s.quality ?? 'default',
        isM3U8: s.isM3U8 ?? s.url?.includes('.m3u8'),
      })),
      subtitles: (data.subtitles ?? []).map((s) => ({ url: s.url, lang: s.lang ?? 'English' })),
    };
  } catch {
    return { sources: [], subtitles: [] };
  }
}

export async function fetchEpisodesWithFallback(
  anilistId: string | number,
  preferredProviderId?: string,
  episodePage?: number,
): Promise<{ provider: string; episodes: AnimeEpisode[]; triedProviders: string[] }> {
  const order = getHlsProviders();
  const preferred = preferredProviderId ? getProviderById(preferredProviderId) : undefined;
  const queue =
    preferred && preferred.kind === 'hls'
      ? [preferred, ...order.filter((p) => p.id !== preferred.id)]
      : order;

  const triedProviders: string[] = [];
  for (const provider of queue) {
    triedProviders.push(provider.id);
    const episodes = await fetchEpisodesFromProvider(anilistId, provider.id, episodePage);
    if (episodes.length > 0) {
      return { provider: provider.id, episodes, triedProviders };
    }
  }
  return { provider: preferredProviderId ?? DEFAULT_ANIME_PROVIDER_ID, episodes: [], triedProviders };
}

/**
 * Resolve a provider-specific episode id from a plain episode number.
 *
 * The UI addresses episodes by number (stable, shareable URLs) while Consumet
 * needs its own opaque slug, so we look up the provider's episode list first.
 */
export async function resolveEpisodeId(
  anilistId: string | number,
  providerId: string,
  episodeNumber: number,
): Promise<string | null> {
  const episodes = await fetchEpisodesFromProvider(anilistId, providerId);
  if (episodes.length === 0) return null;
  const match = episodes.find((ep) => ep.number === episodeNumber);
  return match?.id ?? null;
}

/**
 * Get playable sources for an episode number, trying each `hls` provider.
 * Returns an empty source list when no provider works, which is the signal for
 * the caller to use an embed provider instead.
 */
export async function fetchVideoByEpisodeNumber(
  anilistId: string | number,
  episodeNumber: number,
  preferredProviderId?: string,
): Promise<{ provider: string | null; video: VideoSourceResult; triedProviders: string[] }> {
  const order = getHlsProviders();
  const preferred = preferredProviderId ? getProviderById(preferredProviderId) : undefined;
  const queue =
    preferred && preferred.kind === 'hls'
      ? [preferred, ...order.filter((p) => p.id !== preferred.id)]
      : order;

  const triedProviders: string[] = [];
  for (const provider of queue) {
    triedProviders.push(provider.id);
    const episodeId = await resolveEpisodeId(anilistId, provider.id, episodeNumber);
    if (!episodeId) continue;
    const video = await fetchVideoFromProvider(episodeId, provider.id);
    if (video.sources.length > 0) {
      return { provider: provider.id, video, triedProviders };
    }
  }
  return { provider: null, video: { sources: [], subtitles: [] }, triedProviders };
}

export async function fetchVideoWithFallback(
  episodeId: string,
  preferredProviderId?: string,
): Promise<{ provider: string; video: VideoSourceResult; triedProviders: string[] }> {
  const order = getHlsProviders();
  const preferred = preferredProviderId ? getProviderById(preferredProviderId) : undefined;
  const queue =
    preferred && preferred.kind === 'hls'
      ? [preferred, ...order.filter((p) => p.id !== preferred.id)]
      : order;

  const triedProviders: string[] = [];
  for (const provider of queue) {
    triedProviders.push(provider.id);
    const video = await fetchVideoFromProvider(episodeId, provider.id);
    if (video.sources.length > 0) {
      return { provider: provider.id, video, triedProviders };
    }
  }
  return {
    provider: preferredProviderId ?? DEFAULT_ANIME_PROVIDER_ID,
    video: { sources: [], subtitles: [] },
    triedProviders,
  };
}

export async function searchConsumet(query: string): Promise<unknown[]> {
  const results: unknown[] = [];
  for (const provider of getHlsProviders().slice(0, 3)) {
    try {
      const response = await consumetFetch(
        `/meta/anilist/${encodeURIComponent(query)}?provider=${consumetSlug(provider.id)}`,
        5000,
      );
      if (response.ok) {
        const data = await response.json();
        results.push(...((data as { results?: unknown[] }).results ?? []).slice(0, 5));
      }
    } catch {
      // ignore provider failures
    }
  }
  return results;
}

/**
 * Check every provider. Embeds are checked by reachability of the player host;
 * scrapers by whether they actually return episodes for a known anime.
 */
export async function checkProvidersHealth(): Promise<ProviderHealthResult[]> {
  const now = Date.now();
  if (healthCache && now - healthCache.at < HEALTH_CACHE_TTL_MS && healthCache.results.length > 0) {
    return healthCache.results;
  }

  const results: ProviderHealthResult[] = [];

  for (const provider of getProvidersSortedByPriority()) {
    const started = Date.now();

    if (provider.kind === 'embed') {
      const url = provider.buildEmbedUrl?.({
        anilistId: Number(HEALTH_CHECK_ANILIST_ID),
        episodeNumber: 1,
      });
      try {
        const response = await fetch(url ?? provider.baseUrl, {
          signal: AbortSignal.timeout(8000),
          redirect: 'follow',
          headers: { 'User-Agent': BROWSER_USER_AGENT, Accept: 'text/html' },
        });
        results.push({
          id: provider.id,
          name: provider.name,
          kind: 'embed',
          ok: response.ok,
          responseMs: Date.now() - started,
          error: response.ok ? undefined : `HTTP ${response.status}`,
        });
      } catch (err) {
        results.push({
          id: provider.id,
          name: provider.name,
          kind: 'embed',
          ok: false,
          responseMs: null,
          // The iframe loads in the browser, so a server-side failure usually
          // means DNS/network blocking on the server, not a broken player.
          error: `No alcanzable desde el servidor (${err instanceof Error ? err.message : 'error'})`,
        });
      }
      continue;
    }

    try {
      const response = await consumetFetch(
        `/meta/anilist/info/${HEALTH_CHECK_ANILIST_ID}?provider=${consumetSlug(provider.id)}`,
        8000,
      );
      const responseMs = Date.now() - started;
      if (!response.ok) {
        results.push({
          id: provider.id,
          name: provider.name,
          kind: 'hls',
          ok: false,
          responseMs,
          error: `HTTP ${response.status}`,
        });
        continue;
      }
      const data = (await response.json()) as { episodes?: unknown[]; message?: string };
      const ok = (data.episodes?.length ?? 0) > 0;
      results.push({
        id: provider.id,
        name: provider.name,
        kind: 'hls',
        ok,
        responseMs,
        error: ok ? undefined : (data.message ?? 'Sin episodios'),
      });
    } catch (err) {
      results.push({
        id: provider.id,
        name: provider.name,
        kind: 'hls',
        ok: false,
        responseMs: null,
        error: err instanceof Error ? err.message : 'Error desconocido',
      });
    }
  }

  healthCache = { at: now, results };
  return results;
}

/** Exposed for diagnostics: which providers exist, regardless of health. */
export function listAllProviderIds(): string[] {
  return ANIME_STREAMING_PROVIDERS.map((p) => p.id);
}
