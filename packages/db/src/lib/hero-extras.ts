/**
 * Duración y tráiler de un título para el hero de inicio.
 * La clave de TMDB solo viaja en la petición al servidor de TMDB; no se registra ni se devuelve.
 */

export interface HeroExtras {
  runtimeMinutes: number | null;
  youtubeKey: string | null;
}

export const EMPTY_HERO_EXTRAS: HeroExtras = { runtimeMinutes: null, youtubeKey: null };

const YOUTUBE_KEY = /^[A-Za-z0-9_-]{11}$/;

export function sanitizeYoutubeKey(value: unknown): string | null {
  return typeof value === 'string' && YOUTUBE_KEY.test(value) ? value : null;
}

interface TmdbVideo {
  site?: string;
  type?: string;
  key?: string;
  official?: boolean;
  iso_639_1?: string;
}

/** Elige un tráiler de YouTube. Prefiere tráiler oficial en español. */
export function pickYoutubeKey(videos: readonly TmdbVideo[] | null | undefined): string | null {
  let best = 0;
  let key: string | null = null;
  for (const video of videos ?? []) {
    if (video.site !== 'YouTube') continue;
    const candidate = sanitizeYoutubeKey(video.key);
    if (!candidate) continue;
    let score = 0;
    if (video.type === 'Trailer') score = 8;
    else if (video.type === 'Teaser') score = 4;
    else if (video.type === 'Clip') score = 2;
    else continue;
    if (video.official) score += 2;
    if (video.iso_639_1 === 'es') score += 3;
    else if (video.iso_639_1 === 'en') score += 1;
    if (score > best) {
      best = score;
      key = candidate;
    }
  }
  return key;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : null;
}

function videosOf(payload: unknown): TmdbVideo[] {
  const root = asRecord(payload);
  if (!root) return [];
  const nested = asRecord(root.videos);
  const list = (nested?.results ?? root.results) as unknown;
  return Array.isArray(list) ? (list as TmdbVideo[]) : [];
}

function firstId(payload: unknown): number | null {
  const root = asRecord(payload);
  const results = root?.results;
  if (!Array.isArray(results) || results.length === 0) return null;
  const id = asRecord(results[0])?.id;
  return typeof id === 'number' && Number.isFinite(id) ? id : null;
}

function runtimeOf(payload: unknown, kind: 'movie' | 'tv'): number | null {
  const root = asRecord(payload);
  if (!root) return null;
  if (kind === 'movie') {
    const runtime = root.runtime;
    return typeof runtime === 'number' && runtime > 0 ? Math.round(runtime) : null;
  }
  const list = root.episode_run_time;
  const first = Array.isArray(list) ? list.find((n) => typeof n === 'number' && n > 0) : null;
  return typeof first === 'number' ? Math.round(first) : null;
}

export type HeroFetch = (path: string) => Promise<unknown | null>;

/**
 * Busca en TMDB por nombre y año. `fetchJson` recibe una ruta sin clave
 * (`search/movie?...`); quien llama añade la clave.
 */
export async function lookupHeroExtras(
  input: { name: string; year?: string | null; mediaType: 'movie' | 'series' },
  fetchJson: HeroFetch
): Promise<HeroExtras> {
  const name = input.name.trim();
  if (!name) return EMPTY_HERO_EXTRAS;
  try {
    const kind = input.mediaType === 'series' ? 'tv' : 'movie';
    const params = new URLSearchParams({
      query: name,
      include_adult: 'false',
      language: 'es-ES',
    });
    const year = input.year?.trim();
    if (year) params.set(kind === 'movie' ? 'year' : 'first_air_date_year', year);
    const search = await fetchJson(`search/${kind}?${params.toString()}`);
    const id = firstId(search);
    if (!id) return EMPTY_HERO_EXTRAS;
    const details = await fetchJson(`${kind}/${id}?language=es-ES&append_to_response=videos`);
    let youtubeKey = pickYoutubeKey(videosOf(details));
    if (!youtubeKey) {
      const english = await fetchJson(`${kind}/${id}/videos?language=en-US`);
      youtubeKey = pickYoutubeKey(videosOf(english));
    }
    return { runtimeMinutes: runtimeOf(details, kind), youtubeKey };
  } catch {
    return EMPTY_HERO_EXTRAS;
  }
}

/** Cliente TMDB. La clave queda en la URL de salida y no se escribe en ningún log. */
export function createTmdbFetcher(apiKey: string, fetchImpl: typeof fetch = fetch): HeroFetch {
  return async (path) => {
    const join = path.includes('?') ? '&' : '?';
    const response = await fetchImpl(
      `https://api.themoviedb.org/3/${path}${join}api_key=${encodeURIComponent(apiKey)}`
    );
    if (!response.ok) return null;
    return response.json() as Promise<unknown>;
  };
}
