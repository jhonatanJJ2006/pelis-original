/**
 * Single source of truth for anime streaming providers.
 *
 * Two kinds of provider exist, and the difference matters:
 *
 * - `embed`: an iframe player addressed by AniList id + episode number. The
 *   request happens in the user's browser, so it keeps working even when our
 *   server cannot reach the underlying streaming sites.
 * - `hls`: a raw `.m3u8` obtained by server-side scraping (Consumet). Higher
 *   quality integration — native player, subtitle tracks — but it breaks
 *   whenever the scraped site changes its markup or blocks the server's IP.
 *
 * Embeds are ranked first because they are the ones that reliably play.
 */

export type AnimeProviderLanguage = 'sub' | 'dub' | 'sub/dub';
export type AnimeProviderKind = 'embed' | 'hls';

export interface EmbedContext {
  anilistId: number;
  malId?: number | null;
  episodeNumber: number;
  dub?: boolean;
}

export interface AnimeStreamingProvider {
  id: string;
  name: string;
  kind: AnimeProviderKind;
  baseUrl: string;
  language: AnimeProviderLanguage;
  priority: number;
  /** Short note surfaced in the UI so the user knows what to expect. */
  note?: string;
  /** `embed` providers: builds the iframe URL. */
  buildEmbedUrl?: (ctx: EmbedContext) => string;
  /** `hls` providers: the Consumet provider slug used for scraping. */
  consumetId?: string;
}

export const ANIME_STREAMING_PROVIDERS: AnimeStreamingProvider[] = [
  {
    id: 'vidlink',
    name: 'VidLink',
    kind: 'embed',
    baseUrl: 'https://vidlink.pro',
    language: 'sub/dub',
    priority: 1,
    note: 'Reproductor integrado, sub y dub',
    buildEmbedUrl: ({ anilistId, episodeNumber, dub }) =>
      `https://vidlink.pro/anime/${anilistId}/${episodeNumber}/${dub ? 'dub' : 'sub'}` +
      '?primaryColor=8b5cf6&secondaryColor=a78bfa&icons=default&title=false&poster=true',
  },
  {
    id: 'vidnest',
    name: 'VidNest',
    kind: 'embed',
    baseUrl: 'https://vidnest.fun',
    language: 'sub/dub',
    priority: 2,
    note: 'Reproductor integrado, alternativa principal',
    buildEmbedUrl: ({ anilistId, episodeNumber, dub }) =>
      `https://vidnest.fun/anime/${anilistId}/${episodeNumber}/${dub ? 'dub' : 'sub'}`,
  },
  {
    id: 'videasy',
    name: 'Videasy',
    kind: 'embed',
    baseUrl: 'https://player.videasy.net',
    language: 'sub/dub',
    priority: 3,
    note: 'Reproductor integrado, puede estar bloqueado por algunos DNS',
    buildEmbedUrl: ({ anilistId, episodeNumber, dub }) =>
      `https://player.videasy.net/anime/${anilistId}/${episodeNumber}` +
      `?color=8b5cf6${dub ? '&dub=true' : ''}`,
  },
  {
    id: 'gogoanime',
    name: 'GogoAnime',
    kind: 'hls',
    baseUrl: 'https://gogoanime.by',
    language: 'sub',
    priority: 10,
    consumetId: 'gogoanime',
  },
  {
    id: 'zoro',
    name: 'HiAnime',
    kind: 'hls',
    baseUrl: 'https://hianime.to',
    language: 'sub/dub',
    priority: 11,
    consumetId: 'zoro',
  },
  {
    id: 'animepahe',
    name: 'AnimePahe',
    kind: 'hls',
    baseUrl: 'https://animepahe.si',
    language: 'sub',
    priority: 12,
    consumetId: 'animepahe',
  },
  {
    id: '9anime',
    name: '9anime',
    kind: 'hls',
    baseUrl: 'https://9animetv.to',
    language: 'sub/dub',
    priority: 13,
    consumetId: '9anime',
  },
  {
    id: 'animekai',
    name: 'AnimeKai',
    kind: 'hls',
    baseUrl: 'https://anikai.to',
    language: 'sub',
    priority: 14,
    consumetId: 'animekai',
  },
  {
    id: 'marin',
    name: 'Marin',
    kind: 'hls',
    baseUrl: 'https://marin.moe',
    language: 'sub',
    priority: 15,
    consumetId: 'marin',
  },
  {
    id: 'animefox',
    name: 'AnimeFox',
    kind: 'hls',
    baseUrl: 'https://animefox.live',
    language: 'sub',
    priority: 16,
    consumetId: 'animefox',
  },
];

export const DEFAULT_ANIME_PROVIDER_ID = 'vidlink';

/** AniList ID used for provider health checks (One Piece). */
export const HEALTH_CHECK_ANILIST_ID = '21';

export function getConsumetApiUrl(): string {
  return process.env.CONSUMET_API_URL?.replace(/\/$/, '') ?? 'https://api.consumet.org';
}

export function getProviderById(id: string): AnimeStreamingProvider | undefined {
  return ANIME_STREAMING_PROVIDERS.find((p) => p.id === id);
}

export function getProvidersSortedByPriority(): AnimeStreamingProvider[] {
  return [...ANIME_STREAMING_PROVIDERS].sort((a, b) => a.priority - b.priority);
}

export function getEmbedProviders(): AnimeStreamingProvider[] {
  return getProvidersSortedByPriority().filter((p) => p.kind === 'embed');
}

export function getHlsProviders(): AnimeStreamingProvider[] {
  return getProvidersSortedByPriority().filter((p) => p.kind === 'hls');
}

export function toProviderListItem(p: AnimeStreamingProvider) {
  return {
    id: p.id,
    name: p.name,
    kind: p.kind,
    baseUrl: p.baseUrl,
    language: p.language,
    note: p.note ?? null,
  };
}

/** Resolve the iframe URL for an embed provider, or null if it does not apply. */
export function buildProviderEmbedUrl(
  providerId: string,
  ctx: EmbedContext,
): string | null {
  const provider = getProviderById(providerId);
  if (!provider || provider.kind !== 'embed' || !provider.buildEmbedUrl) return null;
  if (!ctx.anilistId) return null;
  return provider.buildEmbedUrl(ctx);
}
