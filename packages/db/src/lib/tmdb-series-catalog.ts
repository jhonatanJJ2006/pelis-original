/**
 * Pure TMDB TV → public series catalog mapping.
 *
 * /series reads Movie rows with mediaType = SERIES (movies.listSeries).
 * This module only decides which rows to insert. It never updates or deletes.
 * The Prisma writer lives in tmdb-series-import.ts and may only call
 * movie.findMany + movie.create.
 */

export const TMDB_SERIES_DEFAULT_LIMIT = 40;
export const TMDB_SERIES_MAX_LIMIT = 200;
export const TMDB_SERIES_PAGE_SIZE = 20;
/** TMDB allows a much higher rate; a short pause keeps a --limit run polite. */
export const TMDB_SERIES_PAGE_DELAY_MS = 250;

const TMDB_IMG = 'https://image.tmdb.org/t/p';
const PLACEHOLDER_IMAGE = '/peliculas/placeholder.webp';

/** Official TMDB TV genre ids, labeled in Spanish for the public catalog. */
const TV_GENRE_ES: Record<number, string> = {
  10759: 'Acción y aventura',
  16: 'Animación',
  35: 'Comedia',
  80: 'Crimen',
  99: 'Documental',
  18: 'Drama',
  10751: 'Familia',
  10762: 'Infantil',
  9648: 'Misterio',
  10763: 'Noticias',
  10764: 'Reality',
  10765: 'Ciencia ficción y fantasía',
  10766: 'Telenovela',
  10767: 'Talk show',
  10768: 'Guerra y política',
  37: 'Western',
};

export interface TmdbTvListItem {
  id: number;
  name?: string | null;
  overview?: string | null;
  poster_path?: string | null;
  backdrop_path?: string | null;
  first_air_date?: string | null;
  genre_ids?: number[] | null;
  adult?: boolean | null;
}

/** Row inserted into `movie`. mediaType is always SERIES. */
export interface SeriesMovieInsert {
  name: string;
  image: string;
  backdropImage: string | null;
  synopsis: string;
  genre: string;
  token: string;
  actors: string;
  classification: string;
  releaseYear: string;
  episodes: number | null;
  mediaType: 'SERIES';
  featured: boolean;
}

export interface SeriesMovieStore {
  findExistingTokens(tokens: string[]): Promise<Set<string>>;
  /** Insert one new series movie. Return skipped on a token unique conflict. Never update. */
  insertSeriesMovie(row: SeriesMovieInsert): Promise<'inserted' | 'skipped'>;
}

export interface AddSeriesMoviesResult {
  imported: number;
  skipped: number;
  total: number;
}

export interface AdminSeriesMirrorInput {
  name: string;
  image: string;
  backdropImage?: string | null;
  synopsis?: string | null;
  genre?: string | null;
  token: string;
  actors?: string | null;
  classification?: string | null;
  releaseYear?: string | null;
  episodes?: number | null;
  featured?: boolean | null;
}

export function clampTmdbSeriesLimit(value: number | undefined): number {
  if (value == null || !Number.isFinite(value) || value <= 0) return TMDB_SERIES_DEFAULT_LIMIT;
  return Math.min(TMDB_SERIES_MAX_LIMIT, Math.floor(value));
}

/** Stable public token. Existing movie tokens (films or series) are skipped, never overwritten. */
export function tmdbSeriesToken(tmdbId: number): string {
  if (!Number.isInteger(tmdbId) || tmdbId <= 0) {
    throw new Error('TMDB id de serie inválido');
  }
  return `tmdb-tv-${tmdbId}`;
}

function releaseYearOf(firstAirDate: string | null | undefined): string {
  const year = (firstAirDate ?? '').slice(0, 4);
  if (/^\d{4}$/.test(year)) return year;
  return String(new Date().getFullYear());
}

function synopsisOf(overview: string | null | undefined): string {
  const text = (overview ?? '').trim();
  if (text.length >= 10) return text;
  return 'Serie disponible en el catálogo.';
}

export function mapTmdbTvToSeriesMovie(item: TmdbTvListItem): SeriesMovieInsert | null {
  if (!item || !Number.isInteger(item.id) || item.id <= 0) return null;
  const name = (item.name ?? '').trim();
  if (!name) return null;

  const genres = (item.genre_ids ?? [])
    .map((id) => TV_GENRE_ES[id])
    .filter((name): name is string => Boolean(name));

  return {
    name,
    image: item.poster_path ? `${TMDB_IMG}/w500${item.poster_path}` : PLACEHOLDER_IMAGE,
    backdropImage: item.backdrop_path ? `${TMDB_IMG}/w1280${item.backdrop_path}` : null,
    synopsis: synopsisOf(item.overview),
    genre: genres.length > 0 ? genres.join(', ') : 'Serie',
    token: tmdbSeriesToken(item.id),
    actors: 'Reparto por confirmar',
    classification: item.adult ? 'R' : 'PG-13',
    releaseYear: releaseYearOf(item.first_air_date),
    episodes: null,
    mediaType: 'SERIES',
    featured: false,
  };
}

/**
 * Copy an admin `series` row into the public Movie shape.
 * Does not include season (Movie has no season column) and never sets mediaType to MOVIE.
 */
export function movieInsertFromAdminSeries(
  series: AdminSeriesMirrorInput
): SeriesMovieInsert | null {
  const name = series.name.trim();
  const token = series.token.trim();
  if (!name || !token) return null;
  const year = (series.releaseYear ?? '').trim();
  return {
    name,
    image: series.image?.trim() || PLACEHOLDER_IMAGE,
    backdropImage: series.backdropImage?.trim() || null,
    synopsis: synopsisOf(series.synopsis),
    genre: series.genre?.trim() || 'Serie',
    token,
    actors: series.actors?.trim() || 'Reparto por confirmar',
    classification: series.classification?.trim() || 'PG-13',
    releaseYear: /^\d{4}$/.test(year) ? year : String(new Date().getFullYear()),
    episodes: series.episodes ?? null,
    mediaType: 'SERIES',
    featured: series.featured ?? false,
  };
}

export async function collectTmdbSeries(
  limit: number,
  options: {
    fetchPage: (page: number) => Promise<TmdbTvListItem[]>;
    delayMs?: number;
  }
): Promise<SeriesMovieInsert[]> {
  const capped = clampTmdbSeriesLimit(limit);
  const delayMs = options.delayMs ?? 0;
  const out: SeriesMovieInsert[] = [];
  const seen = new Set<number>();
  const maxPages = Math.ceil(TMDB_SERIES_MAX_LIMIT / TMDB_SERIES_PAGE_SIZE);
  let page = 1;

  while (out.length < capped && page <= maxPages) {
    const items = await options.fetchPage(page);
    if (items.length === 0) break;
    for (const item of items) {
      if (seen.has(item.id)) continue;
      const mapped = mapTmdbTvToSeriesMovie(item);
      if (!mapped) continue;
      seen.add(item.id);
      out.push(mapped);
      if (out.length >= capped) break;
    }
    if (items.length < TMDB_SERIES_PAGE_SIZE) break;
    page += 1;
    if (out.length < capped && delayMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  return out;
}

/**
 * Insert series movies that are not already in the catalog.
 * An existing token — film or series — is skipped. Nothing is updated or deleted.
 */
export async function addSeriesMovies(
  rows: SeriesMovieInsert[],
  store: SeriesMovieStore
): Promise<AddSeriesMoviesResult> {
  const existing = await store.findExistingTokens(rows.map((row) => row.token));
  const seen = new Set(existing);
  let imported = 0;
  let skipped = 0;

  for (const row of rows) {
    if (row.mediaType !== 'SERIES' || seen.has(row.token)) {
      skipped += 1;
      continue;
    }
    const result = await store.insertSeriesMovie(row);
    seen.add(row.token);
    if (result === 'inserted') imported += 1;
    else skipped += 1;
  }

  return { imported, skipped, total: rows.length };
}
