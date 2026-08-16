/**
 * Single source of truth for anime streaming providers (Consumet).
 */

export type AnimeProviderLanguage = 'sub' | 'dub' | 'sub/dub';

export interface AnimeStreamingProvider {
  id: string;
  name: string;
  baseUrl: string;
  language: AnimeProviderLanguage;
  priority: number;
}

export const ANIME_STREAMING_PROVIDERS: AnimeStreamingProvider[] = [
  { id: 'gogoanime', name: 'GogoAnime', baseUrl: 'https://gogoanime.by', language: 'sub', priority: 1 },
  { id: 'zoro', name: 'HiAnime', baseUrl: 'https://hianime.to', language: 'sub/dub', priority: 2 },
  { id: 'animepahe', name: 'AnimePahe', baseUrl: 'https://animepahe.si', language: 'sub', priority: 3 },
  { id: '9anime', name: '9anime', baseUrl: 'https://9animetv.to', language: 'sub/dub', priority: 4 },
  { id: 'animekai', name: 'AnimeKai', baseUrl: 'https://anikai.to', language: 'sub', priority: 5 },
  { id: 'marin', name: 'Marin', baseUrl: 'https://marin.moe', language: 'sub', priority: 6 },
  { id: 'animefox', name: 'AnimeFox', baseUrl: 'https://animefox.live', language: 'sub', priority: 7 },
];

export const DEFAULT_ANIME_PROVIDER_ID = 'gogoanime';

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

export function toProviderListItem(p: AnimeStreamingProvider) {
  return { id: p.id, name: p.name, baseUrl: p.baseUrl, language: p.language };
}
