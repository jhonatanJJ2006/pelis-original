/**
 * Consumet API client with provider fallback support.
 */
import {
  ANIME_STREAMING_PROVIDERS,
  DEFAULT_ANIME_PROVIDER_ID,
  HEALTH_CHECK_ANILIST_ID,
  getConsumetApiUrl,
  getProviderById,
  getProvidersSortedByPriority,
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
  ok: boolean;
  responseMs: number | null;
  error?: string;
}

let healthCache: { at: number; results: ProviderHealthResult[] } | null = null;
const HEALTH_CACHE_TTL_MS = 15 * 60 * 1000;

async function consumetFetch(path: string, timeoutMs = 10000): Promise<Response> {
  const base = getConsumetApiUrl();
  return fetch(`${base}${path}`, { signal: AbortSignal.timeout(timeoutMs) });
}

export async function fetchEpisodesFromProvider(
  anilistId: string | number,
  providerId: string,
  episodePage?: number,
): Promise<AnimeEpisode[]> {
  const pageParam = episodePage ? `&page=${episodePage}` : '';
  const response = await consumetFetch(
    `/meta/anilist/info/${anilistId}?provider=${providerId}${pageParam}`,
  );
  if (!response.ok) return [];
  const data = (await response.json()) as {
    episodes?: Array<{ id: string; number: number; title?: string; image?: string; description?: string }>;
  };
  return (data.episodes ?? []).map((ep) => ({
    id: ep.id,
    number: ep.number,
    title: ep.title ?? `Episodio ${ep.number}`,
    image: ep.image ?? '',
    description: ep.description ?? '',
  }));
}

export async function fetchVideoFromProvider(
  episodeId: string,
  providerId: string,
): Promise<VideoSourceResult> {
  const response = await consumetFetch(`/meta/anilist/watch/${episodeId}?provider=${providerId}`);
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
}

export async function fetchEpisodesWithFallback(
  anilistId: string | number,
  preferredProviderId?: string,
  episodePage?: number,
): Promise<{ provider: string; episodes: AnimeEpisode[]; triedProviders: string[] }> {
  const order = getProvidersSortedByPriority();
  const preferred = preferredProviderId ? getProviderById(preferredProviderId) : undefined;
  const queue = preferred
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

export async function fetchVideoWithFallback(
  episodeId: string,
  preferredProviderId?: string,
): Promise<{ provider: string; video: VideoSourceResult; triedProviders: string[] }> {
  const order = getProvidersSortedByPriority();
  const preferred = preferredProviderId ? getProviderById(preferredProviderId) : undefined;
  const queue = preferred
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
  for (const provider of getProvidersSortedByPriority().slice(0, 3)) {
    try {
      const response = await consumetFetch(
        `/meta/anilist/${encodeURIComponent(query)}?provider=${provider.id}`,
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

export async function checkProvidersHealth(): Promise<ProviderHealthResult[]> {
  const now = Date.now();
  if (healthCache && now - healthCache.at < HEALTH_CACHE_TTL_MS && healthCache.results.length > 0) {
    return healthCache.results;
  }

  const results: ProviderHealthResult[] = [];
  for (const provider of ANIME_STREAMING_PROVIDERS) {
    const started = Date.now();
    try {
      const response = await consumetFetch(
        `/meta/anilist/info/${HEALTH_CHECK_ANILIST_ID}?provider=${provider.id}`,
        8000,
      );
      const responseMs = Date.now() - started;
      if (!response.ok) {
        results.push({ id: provider.id, name: provider.name, ok: false, responseMs, error: `HTTP ${response.status}` });
        continue;
      }
      const data = (await response.json()) as { episodes?: unknown[] };
      const ok = (data.episodes?.length ?? 0) > 0;
      results.push({
        id: provider.id,
        name: provider.name,
        ok,
        responseMs,
        error: ok ? undefined : 'Sin episodios',
      });
    } catch (err) {
      results.push({
        id: provider.id,
        name: provider.name,
        ok: false,
        responseMs: null,
        error: err instanceof Error ? err.message : 'Error desconocido',
      });
    }
  }

  if (healthCache) {
    healthCache.at = now;
    healthCache.results = results;
  } else {
    healthCache = { at: now, results };
  }
  return results;
}
