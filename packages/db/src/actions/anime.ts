/**
 * Anime actions: external provider lookups via consumet API.
 * Ported from packages/convex/src/anime.ts (action context).
 */
import { z } from 'zod';
import { register } from '../registry';

const CONSUMET_API = 'https://api.consumet.org';

const PROVIDERS = [
  { id: 'gogoanime', name: 'GogoAnime', baseUrl: 'https://gogoanime.cl', language: 'sub' as const },
  { id: 'zoro', name: 'Zoro', baseUrl: 'https://zoro.to', language: 'sub' as const },
  { id: 'animepahe', name: 'AnimePahe', baseUrl: 'https://animepahe.ru', language: 'sub' as const },
];

export const searchExternal = register({
  kind: 'action',
  name: 'anime.searchExternal',
  args: z.object({ query: z.string() }),
  handler: async (_ctx, { query }) => {
    const results: unknown[] = [];
    for (const provider of PROVIDERS) {
      try {
        const response = await fetch(
          `${CONSUMET_API}/meta/anilist/${encodeURIComponent(query)}?provider=${provider.id}`,
          { signal: AbortSignal.timeout(5000) },
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
  },
});

export const getEpisodes = register({
  kind: 'action',
  name: 'anime.getEpisodes',
  args: z.object({ animeId: z.string(), provider: z.string(), episodePage: z.number().optional() }),
  handler: async (_ctx, { animeId, provider }) => {
    try {
      const response = await fetch(
        `${CONSUMET_API}/meta/anilist/info/${animeId}?provider=${provider}`,
        { signal: AbortSignal.timeout(10000) },
      );
      if (!response.ok) return [];
      const data = (await response.json()) as { episodes?: Array<{ id: string; number: number; title?: string; image?: string; description?: string }> };
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
  },
});

export const getVideoUrl = register({
  kind: 'action',
  name: 'anime.getVideoUrl',
  args: z.object({ episodeId: z.string(), provider: z.string() }),
  handler: async (_ctx, { episodeId, provider }) => {
    try {
      const response = await fetch(
        `${CONSUMET_API}/meta/anilist/watch/${episodeId}?provider=${provider}`,
        { signal: AbortSignal.timeout(10000) },
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
  },
});