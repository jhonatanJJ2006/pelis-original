/**
 * Consumet API client for `hls` providers, with fallback between them.
 *
 * Consumet scrapes third-party sites, so every call here is best-effort: a
 * provider can be perfectly configured and still return nothing because the
 * site changed or blocks the server. Callers must treat empty results as normal
 * and fall back to an `embed` provider.
 *
 * As of this writing the bundled `riimuru/consumet-api` image and the public
 * `api.consumet.org` (now an unrelated GitHub page) both fail. Without a
 * working `CONSUMET_API_URL` we skip every `hls` provider and let the caller
 * try the `embed` chain instead.
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
  /** Cabeceras que pide el CDN (normalmente `Referer`), tal como las da Consumet. */
  headers?: Record<string, string>;
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

/**
 * Returns null when no Consumet is configured so callers can skip `hls`
 * providers entirely instead of throwing. The previous fallback to the public
 * `api.consumet.org` is gone — it now resolves to an unrelated GitHub page.
 */
async function consumetFetch(path: string, timeoutMs = 10000): Promise<Response | null> {
  const base = getConsumetApiUrl();
  if (!base) return null;
  return fetch(`${base}${path}`, { signal: AbortSignal.timeout(timeoutMs) });
}

/** Map a provider id to the slug Consumet expects (HiAnime is `zoro` there). */
function consumetSlug(providerId: string): string {
  return getProviderById(providerId)?.consumetId ?? providerId;
}

const embedHealthCache = new Map<string, { at: number; ok: boolean }>();
const EMBED_HEALTH_TTL_MS = 10 * 60 * 1000;

/**
 * Whether an embed provider's *anime* player currently resolves anything.
 *
 * A plain HTTP check is useless: the player hosts return 200 even when their
 * anime backend is down (the failure happens client-side). For Next.js-based
 * players we follow the page into the anime chunk and look for `localhost`
 * references — a reliable signal that a production build still calls a dev
 * backend. For other embeds we just confirm the page itself loads.
 */
export async function isEmbedProviderHealthy(providerId: string): Promise<boolean> {
  const provider = getProviderById(providerId);
  if (!provider || provider.kind !== 'embed') return true;

  const hit = embedHealthCache.get(providerId);
  if (hit && Date.now() - hit.at < EMBED_HEALTH_TTL_MS) return hit.ok;

  let ok = false;
  try {
    if (providerId === 'vidnest') {
      const { fetchVidnestEpisode } = await import('./vidnest-client');
      const data = await fetchVidnestEpisode(Number(HEALTH_CHECK_ANILIST_ID), 1, 'sub');
      ok = Boolean(data.sources?.some((s) => s.file));
    } else {
      ok = await probeEmbedPlayer(provider.baseUrl, providerId);
    }
  } catch {
    ok = false;
  }

  embedHealthCache.set(providerId, { at: Date.now(), ok });
  return ok;
}

/**
 * Two-step probe for Next.js-style embed players:
 *
 * 1. GET the player page and look for `/_next/static/chunks/app/anime/...`
 *    (the route the page is bundled under).
 * 2. GET that chunk and confirm it does not contain `localhost:8080` or
 *    `http://localhost/` — a clear sign the production bundle still calls
 *    a developer's local backend (e.g. vidlink.pro today).
 */
async function probeEmbedPlayer(baseUrl: string, _providerId: string): Promise<boolean> {
  const page = await fetch(`${baseUrl}/anime/${HEALTH_CHECK_ANILIST_ID}/1/sub`, {
    signal: AbortSignal.timeout(8000),
    redirect: 'follow',
    headers: { 'User-Agent': BROWSER_USER_AGENT },
  });
  if (!page.ok) return false;
  const html = await page.text();
  const chunkMatch = html.match(/\/_next\/static\/chunks\/app\/anime\/[^"]+page-[^"]+\.js/);
  if (!chunkMatch) {
    // Not a Next.js player (or the route moved). Fall back to "page loads".
    return true;
  }
  const chunk = await fetch(`${baseUrl}${chunkMatch[0]}`, {
    signal: AbortSignal.timeout(8000),
    headers: { 'User-Agent': BROWSER_USER_AGENT },
  });
  if (!chunk.ok) return false;
  const code = await chunk.text();
  return !code.includes('localhost:8080') && !code.includes('http://localhost:');
}

export async function fetchEpisodesFromProvider(
  anilistId: string | number,
  providerId: string,
  episodePage?: number,
  _title?: string
): Promise<AnimeEpisode[]> {
  const pageParam = episodePage ? `&page=${episodePage}` : '';
  try {
    const response = await consumetFetch(
      `/meta/anilist/info/${anilistId}?provider=${consumetSlug(providerId)}${pageParam}`
    );
    if (!response || !response.ok) return [];
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
  providerId: string
): Promise<VideoSourceResult> {
  const path = `/meta/anilist/watch/${encodeURIComponent(episodeId)}?provider=${consumetSlug(providerId)}`;
  try {
    const response = await consumetFetch(path, 10000);
    if (!response || !response.ok) return { sources: [], subtitles: [] };
    const data = (await response.json()) as {
      sources?: Array<{ url: string; quality?: string; isM3U8?: boolean }>;
      subtitles?: Array<{ url: string; lang?: string }>;
      headers?: Record<string, unknown>;
    };
    const headers = Object.fromEntries(
      Object.entries(data.headers ?? {}).filter(
        (entry): entry is [string, string] => typeof entry[1] === 'string' && entry[1].length > 0
      )
    );
    return {
      headers: Object.keys(headers).length > 0 ? headers : undefined,
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
  title?: string
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
    const episodes = await fetchEpisodesFromProvider(anilistId, provider.id, episodePage, title);
    if (episodes.length > 0) {
      return { provider: provider.id, episodes, triedProviders };
    }
  }
  return {
    provider: preferredProviderId ?? DEFAULT_ANIME_PROVIDER_ID,
    episodes: [],
    triedProviders,
  };
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
  title?: string
): Promise<string | null> {
  const episodes = await fetchEpisodesFromProvider(anilistId, providerId, undefined, title);
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
  title?: string,
  exclude?: ReadonlySet<string>
): Promise<{ provider: string | null; video: VideoSourceResult; triedProviders: string[] }> {
  // Sin Consumet configurado no hay nada que probar (y no se gasta presupuesto).
  if (!getConsumetApiUrl())
    return { provider: null, video: { sources: [], subtitles: [] }, triedProviders: [] };
  const order = getHlsProviders().filter((p) => !exclude?.has(p.id));
  const preferred = preferredProviderId ? getProviderById(preferredProviderId) : undefined;
  const queue =
    preferred && preferred.kind === 'hls'
      ? [preferred, ...order.filter((p) => p.id !== preferred.id)]
      : order;

  const triedProviders: string[] = [];
  for (const provider of queue) {
    triedProviders.push(provider.id);
    const episodeId = await resolveEpisodeId(anilistId, provider.id, episodeNumber, title);
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
  preferredProviderId?: string
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
        5000
      );
      if (response && response.ok) {
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

  const consumetConfigured = Boolean(getConsumetApiUrl());
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

    if (!consumetConfigured) {
      results.push({
        id: provider.id,
        name: provider.name,
        kind: 'hls',
        ok: false,
        responseMs: null,
        error: 'No hay CONSUMET_API_URL configurado',
      });
      continue;
    }

    try {
      const response = await consumetFetch(
        `/meta/anilist/info/${HEALTH_CHECK_ANILIST_ID}?provider=${consumetSlug(provider.id)}`,
        8000
      );
      const responseMs = Date.now() - started;
      if (!response) {
        results.push({
          id: provider.id,
          name: provider.name,
          kind: 'hls',
          ok: false,
          responseMs: null,
          error: 'Sin respuesta de Consumet',
        });
        continue;
      }
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
