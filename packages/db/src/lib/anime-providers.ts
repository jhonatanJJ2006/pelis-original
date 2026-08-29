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
  /**
   * `embed` providers whose URL needs server-side resolution (e.g. a catalog
   * search on the target site). Takes precedence over `buildEmbedUrl`.
   */
  resolveEmbedUrl?: (ctx: EmbedContext, opts: { title: string }) => Promise<string | null>;
  /** `hls` providers: the Consumet provider slug used for scraping. */
  consumetId?: string;
}

/**
 * Provider ranking notes (verificado en navegador el 2026-08 con
 * `pnpm --filter @pelis/db playground:providers`):
 *
 * - `vidnest` es la fuente activa. El action `getEpisodeStream` resuelve sus
 *   fuentes HLS reales del lado servidor (ver `vidnest-client.ts`: base64 con
 *   alfabeto propio, sin AES) y las sirve a través de `/api/anime/stream`,
 *   así que TODOS los proveedores comparten el mismo reproductor
 *   `<AnimeHlsPlayer>` — sin iframes, sin popups, sin ads.
 * - `yourupload`, `mega` y `voe` resuelven su iframe por episodio scrapeando
 *   latanime.org (`latanime-client.ts`). Disponibilidad varía según el título
 *   (los viejos traen YourUpload/Mega; los nuevos Mega/VOE). Audio latino o
 *   castellano.
 * - `vidlink`, `videasy` y `animeflv` siguen rotos upstream ("We Couldn't
 *   Find This Episode", backend 404, "no hay vídeos"). Se mantienen como
 *   fallback iframe por si upstream se recupera.
 * - Los `hls` vía Consumet devuelven HTTP 500: el scraper está muerto.
 *
 * El cambio entre servidores es MANUAL: la UI muestra los botones y el
 * usuario elige; el servidor nunca sustituye el proveedor pedido.
 */
export const ANIME_STREAMING_PROVIDERS: AnimeStreamingProvider[] = [
  {
    id: 'vidnest',
    name: 'VidNest',
    kind: 'embed',
    baseUrl: 'https://vidnest.fun',
    language: 'sub/dub',
    priority: 1,
    note: 'Reproduce en el reproductor de Pelis (fuente HLS vía proxy propio)',
    buildEmbedUrl: ({ anilistId, episodeNumber, dub }) =>
      `https://vidnest.fun/anime/${anilistId}/${episodeNumber}/${dub ? 'dub' : 'sub'}`,
  },
  {
    id: 'yourupload',
    name: 'YourUpload',
    kind: 'embed',
    baseUrl: 'https://www.yourupload.com',
    language: 'sub/dub',
    priority: 2,
    note: 'Español latino/castellano · fuente latanime.org',
    resolveEmbedUrl: async (ctx, { title }) => {
      const { resolveLatAnimeEmbedUrl } = await import('./latanime-client');
      return resolveLatAnimeEmbedUrl('yourupload', ctx, { title });
    },
  },
  {
    id: 'mega',
    name: 'Mega',
    kind: 'embed',
    baseUrl: 'https://mega.nz',
    language: 'sub/dub',
    priority: 3,
    note: 'Español latino/castellano · fuente latanime.org',
    resolveEmbedUrl: async (ctx, { title }) => {
      const { resolveLatAnimeEmbedUrl } = await import('./latanime-client');
      return resolveLatAnimeEmbedUrl('mega', ctx, { title });
    },
  },
  {
    id: 'voe',
    name: 'VOE',
    kind: 'embed',
    baseUrl: 'https://voe.sx',
    language: 'sub/dub',
    priority: 4,
    note: 'Español latino/castellano · fuente latanime.org (suele tener muchos anuncios)',
    resolveEmbedUrl: async (ctx, { title }) => {
      const { resolveLatAnimeEmbedUrl } = await import('./latanime-client');
      return resolveLatAnimeEmbedUrl('voe', ctx, { title });
    },
  },
  {
    id: 'vidlink',
    name: 'VidLink',
    kind: 'embed',
    baseUrl: 'https://vidlink.pro',
    language: 'sub/dub',
    priority: 5,
    note: 'Roto upstream ("We Couldn\'t Find This Episode")',
    buildEmbedUrl: ({ anilistId, episodeNumber, dub }) =>
      `https://vidlink.pro/anime/${anilistId}/${episodeNumber}/${dub ? 'dub' : 'sub'}` +
      '?primaryColor=8b5cf6&secondaryColor=a78bfa&icons=default&title=false&poster=true',
  },
  {
    id: 'videasy',
    name: 'Videasy',
    kind: 'embed',
    baseUrl: 'https://player.videasy.to',
    language: 'sub/dub',
    priority: 6,
    note: 'Roto upstream (su backend responde 404)',
    buildEmbedUrl: ({ anilistId, episodeNumber, dub }) =>
      `https://player.videasy.to/anime/${anilistId}/${episodeNumber}` +
      `?color=8b5cf6${dub ? '&dub=true' : ''}`,
  },
  {
    id: 'animeflv',
    name: 'AnimeFLV',
    kind: 'embed',
    baseUrl: 'https://www4.animeflv.net',
    language: 'sub/dub',
    priority: 7,
    note: 'Roto upstream (no inyecta servidores en /ver/)',
    buildEmbedUrl: () => 'https://www4.animeflv.net',
    resolveEmbedUrl: async (ctx, { title }) => {
      const { resolveAnimeflvEmbedUrl } = await import('./animeflv-client');
      return resolveAnimeflvEmbedUrl(ctx, { title });
    },
  },
  {
    id: 'gogoanime',
    name: 'GogoAnime',
    kind: 'hls',
    baseUrl: 'https://gogoanime.by',
    language: 'sub',
    priority: 10,
    note: 'Scraping via Consumet. Suele estar caído',
    consumetId: 'gogoanime',
  },
  {
    id: 'zoro',
    name: 'HiAnime',
    kind: 'hls',
    baseUrl: 'https://hianime.to',
    language: 'sub/dub',
    priority: 11,
    note: 'Scraping via Consumet (HiAnime). Suele estar caído',
    consumetId: 'zoro',
  },
  {
    id: 'animepahe',
    name: 'AnimePahe',
    kind: 'hls',
    baseUrl: 'https://animepahe.si',
    language: 'sub',
    priority: 12,
    note: 'Scraping via Consumet. Suele estar caído',
    consumetId: 'animepahe',
  },
  {
    id: '9anime',
    name: '9anime',
    kind: 'hls',
    baseUrl: 'https://9animetv.to',
    language: 'sub/dub',
    priority: 13,
    note: 'Scraping via Consumet. Suele estar caído',
    consumetId: '9anime',
  },
  {
    id: 'animekai',
    name: 'AnimeKai',
    kind: 'hls',
    baseUrl: 'https://anikai.to',
    language: 'sub',
    priority: 14,
    note: 'Scraping via Consumet. Suele estar caído',
    consumetId: 'animekai',
  },
  {
    id: 'marin',
    name: 'Marin',
    kind: 'hls',
    baseUrl: 'https://marin.moe',
    language: 'sub',
    priority: 15,
    note: 'Scraping via Consumet. Suele estar caído',
    consumetId: 'marin',
  },
  {
    id: 'animefox',
    name: 'AnimeFox',
    kind: 'hls',
    baseUrl: 'https://animefox.live',
    language: 'sub',
    priority: 16,
    note: 'Scraping via Consumet. Suele estar caído',
    consumetId: 'animefox',
  },
];

export const DEFAULT_ANIME_PROVIDER_ID = 'vidnest';

/** AniList ID used for provider health checks (One Piece). */
export const HEALTH_CHECK_ANILIST_ID = '21';

export function getConsumetApiUrl(): string | null {
  const url = process.env.CONSUMET_API_URL?.replace(/\/$/, '');
  return url ? url : null;
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
