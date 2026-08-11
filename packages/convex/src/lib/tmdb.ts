const GENRE_MAP: Record<number, string> = {
  28: 'Acción',
  12: 'Aventura',
  16: 'Animación',
  35: 'Comedia',
  80: 'Crimen',
  99: 'Documental',
  18: 'Drama',
  10751: 'Familia',
  14: 'Fantasía',
  36: 'Historia',
  27: 'Terror',
  10402: 'Música',
  9648: 'Misterio',
  10749: 'Romance',
  878: 'Ciencia',
  10770: 'TV',
  53: 'Suspenso',
  10752: 'Bélica',
  37: 'Western',
};

const VALID_CLASSIFICATIONS = new Set(['G', 'PG', 'PG-13', 'R', 'NC-17']);

export const TMDB_POSTER_BASE = 'https://image.tmdb.org/t/p/w342';
export const TMDB_BACKDROP_BASE = 'https://image.tmdb.org/t/p/w1280';

export interface TmdbSearchResult {
  id: number;
  title: string;
  originalTitle: string;
  releaseYear: string;
  posterPath: string | null;
  overview: string;
}

export interface TmdbMetadata {
  tmdbId: number;
  title: string;
  originalTitle: string;
  synopsis: string;
  genre: string;
  actors: string;
  classification: string;
  releaseYear: string;
  posterPath: string | null;
  posterUrl: string | null;
  backdropPath: string | null;
  backdropUrl: string | null;
}

function getApiKey(): string {
  const key = process.env.TMDB_API_KEY;
  if (!key) {
    throw new Error('TMDB_API_KEY no está configurada en Convex');
  }
  return key;
}

export function pickClassification(genre: string): string {
  if (['Terror', 'Suspenso'].includes(genre)) return 'R';
  if (genre === 'Animación') return 'PG';
  if (genre === 'Familia') return 'G';
  return 'PG-13';
}

export function mapGenreFromIds(genreIds: number[]): string {
  const names = genreIds.map((id) => GENRE_MAP[id]).filter(Boolean);
  return names[0] ?? 'Drama';
}

function normalizeClassification(raw: string | undefined): string | null {
  if (!raw) return null;
  const upper = raw.toUpperCase();
  if (upper === 'PG13') return 'PG-13';
  if (VALID_CLASSIFICATIONS.has(upper)) return upper;
  return null;
}

async function tmdbFetch(url: string, timeoutMs = 15000): Promise<Response> {
  return fetch(url, {
    headers: { accept: 'application/json' },
    signal: AbortSignal.timeout(timeoutMs),
  });
}

export async function searchMovie(
  title: string,
  year?: string
): Promise<TmdbSearchResult | null> {
  const apiKey = getApiKey();
  const params = new URLSearchParams({
    query: title,
    language: 'es-MX',
    page: '1',
    api_key: apiKey,
    ...(year && /^\d{4}$/.test(year) ? { year } : {}),
  });

  let resp = await tmdbFetch(
    `https://api.themoviedb.org/3/search/movie?${params}`
  );
  if (!resp.ok) return null;

  let data = await resp.json();
  let movie = data.results?.[0];

  if (!movie) {
    const enParams = new URLSearchParams({
      query: title,
      language: 'en-US',
      page: '1',
      api_key: apiKey,
      ...(year && /^\d{4}$/.test(year) ? { year } : {}),
    });
    resp = await tmdbFetch(
      `https://api.themoviedb.org/3/search/movie?${enParams}`
    );
    if (!resp.ok) return null;
    data = await resp.json();
    movie = data.results?.[0];
  }

  if (!movie) return null;

  return {
    id: movie.id,
    title: movie.title ?? movie.original_title ?? title,
    originalTitle: movie.original_title ?? movie.title ?? title,
    releaseYear: movie.release_date?.split('-')[0] ?? '',
    posterPath: movie.poster_path ?? null,
    overview: movie.overview?.trim() ?? '',
  };
}

export async function getMovieById(tmdbId: number) {
  const apiKey = getApiKey();
  const resp = await tmdbFetch(
    `https://api.themoviedb.org/3/movie/${tmdbId}?api_key=${apiKey}&language=es-MX`
  );
  if (!resp.ok) return null;
  return resp.json();
}

export async function getCredits(tmdbId: number): Promise<string[]> {
  const apiKey = getApiKey();
  const resp = await tmdbFetch(
    `https://api.themoviedb.org/3/movie/${tmdbId}/credits?api_key=${apiKey}&language=es-MX`,
    10000
  );
  if (!resp.ok) return [];
  const data = await resp.json();
  return (data.cast ?? []).slice(0, 6).map((c: { name: string }) => c.name);
}

export async function getClassification(
  tmdbId: number,
  genre: string
): Promise<string> {
  const apiKey = getApiKey();
  try {
    const resp = await tmdbFetch(
      `https://api.themoviedb.org/3/movie/${tmdbId}/release_dates?api_key=${apiKey}`,
      10000
    );
    if (resp.ok) {
      const data = await resp.json();
      const us = (data.results ?? []).find(
        (r: { iso_3166_1: string }) => r.iso_3166_1 === 'US'
      );
      const theatrical = us?.release_dates?.find(
        (d: { type: number; certification?: string }) => d.type === 3 && d.certification
      );
      const cert = normalizeClassification(theatrical?.certification);
      if (cert) return cert;
    }
  } catch {
    // fallback below
  }
  return pickClassification(genre);
}

async function resolveSynopsis(tmdbId: number, initial: string): Promise<string> {
  let synopsis = initial.trim();
  if (synopsis.length >= 10) return synopsis;

  const apiKey = getApiKey();
  const resp = await tmdbFetch(
    `https://api.themoviedb.org/3/movie/${tmdbId}?api_key=${apiKey}&language=en-US`,
    10000
  );
  if (resp.ok) {
    const enMovie = await resp.json();
    synopsis = enMovie.overview?.trim() ?? '';
  }
  return synopsis;
}

export async function fetchTmdbMetadata(
  title: string,
  year?: string,
  tmdbId?: number
): Promise<TmdbMetadata | null> {
  let movie = tmdbId ? await getMovieById(tmdbId) : null;
  if (!movie) {
    const searchResult = await searchMovie(title, year);
    if (!searchResult) return null;
    movie = await getMovieById(searchResult.id);
    if (!movie) return null;
  }

  const id = movie.id as number;
  const genreIds: number[] =
    movie.genre_ids ?? movie.genres?.map((g: { id: number }) => g.id) ?? [];
  const genre = mapGenreFromIds(genreIds);
  const [credits, classification, synopsis] = await Promise.all([
    getCredits(id),
    getClassification(id, genre),
    resolveSynopsis(id, movie.overview?.trim() ?? ''),
  ]);

  const posterPath = movie.poster_path ?? null;
  const backdropPath = movie.backdrop_path ?? null;

  return {
    tmdbId: id,
    title: movie.title ?? movie.original_title ?? title,
    originalTitle: movie.original_title ?? movie.title ?? title,
    synopsis,
    genre,
    actors: credits.join(', '),
    classification,
    releaseYear: movie.release_date?.split('-')[0] ?? year ?? '',
    posterPath,
    posterUrl: posterPath ? `${TMDB_POSTER_BASE}${posterPath}` : null,
    backdropPath,
    backdropUrl: backdropPath ? `${TMDB_BACKDROP_BASE}${backdropPath}` : null,
  };
}

export async function downloadPosterBlob(posterPath: string): Promise<Blob | null> {
  const resp = await tmdbFetch(`${TMDB_POSTER_BASE}${posterPath}`, 15000);
  if (!resp.ok) return null;
  return resp.blob();
}

export async function downloadBackdropBlob(backdropPath: string): Promise<Blob | null> {
  const resp = await tmdbFetch(`${TMDB_BACKDROP_BASE}${backdropPath}`, 15000);
  if (!resp.ok) return null;
  return resp.blob();
}
