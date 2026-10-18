/**
 * Episode metadata from ani.zip (AniList/TVDB/TMDB mapping service).
 *
 * Streaming scrapers are unreliable and go down often. Episode *listings* do not
 * need them: ani.zip returns numbered episodes with Spanish titles, synopses,
 * thumbnails and air dates for an AniList id. The catalog can therefore always
 * show a real episode list, and providers are only consulted when the user
 * actually presses play.
 */

const ANIZIP_API = 'https://api.ani.zip';
const CACHE_TTL_MS = 6 * 60 * 60 * 1000;

export interface AnimeEpisodeMeta {
  /**
   * Episode number within THIS AniList entry (1..n). It is what every
   * provider keyed by AniList id expects (`/anime/{anilistId}/{number}`).
   */
  number: number;
  /**
   * TVDB episode number inside its season. For split cours ("Part 2") it keeps
   * counting from Part 1 (e.g. 17..28), so it must never be sent to providers.
   */
  seasonEpisodeNumber: number | null;
  /** Number across the whole franchise, used by providers that ignore seasons. */
  absoluteNumber: number | null;
  seasonNumber: number | null;
  title: string;
  overview: string;
  image: string;
  airDate: string | null;
  runtime: number | null;
}

interface AnizipEpisode {
  episodeNumber?: number;
  absoluteEpisodeNumber?: number;
  seasonNumber?: number;
  title?: Record<string, string> | null;
  overview?: string | null;
  image?: string | null;
  airDate?: string | null;
  airDateUtc?: string | null;
  runtime?: number | null;
  length?: number | null;
}

export interface AnizipResponse {
  episodes?: Record<string, AnizipEpisode>;
  episodeCount?: number;
  images?: Array<{ coverType?: string; url?: string }>;
  mappings?: Record<string, unknown>;
}

const cache = new Map<number, { at: number; episodes: AnimeEpisodeMeta[] }>();

/** Prefer Spanish, then English, then the romanized Japanese title. */
function pickTitle(title: Record<string, string> | null | undefined, number: number): string {
  if (!title) return `Episodio ${number}`;
  return (
    title.es ??
    title['es-419'] ??
    title.en ??
    title['x-jat'] ??
    title.ja ??
    Object.values(title)[0] ??
    `Episodio ${number}`
  );
}

export async function fetchAnizipEpisodes(anilistId: number): Promise<AnimeEpisodeMeta[]> {
  const cached = cache.get(anilistId);
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) return cached.episodes;

  let data: AnizipResponse;
  try {
    const response = await fetch(`${ANIZIP_API}/mappings?anilist_id=${anilistId}`, {
      signal: AbortSignal.timeout(12000),
    });
    if (!response.ok) return cached?.episodes ?? [];
    data = (await response.json()) as AnizipResponse;
  } catch {
    return cached?.episodes ?? [];
  }

  const episodes = mapAnizipEpisodes(data);
  cache.set(anilistId, { at: Date.now(), episodes });
  return episodes;
}

/**
 * ani.zip keys `episodes` by the episode number relative to the AniList entry
 * ("1".."12" for "Attack on Titan Final Season Part 2") while `episodeNumber`
 * is the TVDB season number (17..28 for that same Part 2). The key is the one
 * that matches the AniList id used by the players.
 */
export function mapAnizipEpisodes(data: AnizipResponse): AnimeEpisodeMeta[] {
  return Object.entries(data.episodes ?? {})
    // Keys are episode numbers; "S1"-style keys are specials we skip.
    .filter(([key]) => /^\d+$/.test(key))
    .map(([key, ep]) => {
      const number = Number(key);
      return {
        number,
        seasonEpisodeNumber: ep.episodeNumber ?? null,
        absoluteNumber: ep.absoluteEpisodeNumber ?? null,
        seasonNumber: ep.seasonNumber ?? null,
        title: pickTitle(ep.title, number),
        overview: ep.overview ?? '',
        image: ep.image ?? '',
        airDate: ep.airDate ?? ep.airDateUtc ?? null,
        runtime: ep.runtime ?? ep.length ?? null,
      };
    })
    .sort((a, b) => a.number - b.number);
}

/**
 * Episode list with a guaranteed result: when ani.zip has no data we still
 * produce numbered placeholders so the user can pick an episode and play it.
 */
export async function fetchEpisodeList(
  anilistId: number | null,
  knownEpisodeCount: number
): Promise<{ episodes: AnimeEpisodeMeta[]; source: 'anizip' | 'placeholder' }> {
  if (anilistId) {
    const episodes = await fetchAnizipEpisodes(anilistId);
    if (episodes.length > 0) return { episodes, source: 'anizip' };
  }

  const count = knownEpisodeCount > 0 ? knownEpisodeCount : 0;
  return {
    episodes: Array.from({ length: count }, (_, i) => ({
      number: i + 1,
      seasonEpisodeNumber: null,
      absoluteNumber: i + 1,
      seasonNumber: null,
      title: `Episodio ${i + 1}`,
      overview: '',
      image: '',
      airDate: null,
      runtime: null,
    })),
    source: 'placeholder',
  };
}
