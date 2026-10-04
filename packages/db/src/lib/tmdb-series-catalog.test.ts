import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  TMDB_SERIES_DEFAULT_LIMIT,
  TMDB_SERIES_MAX_LIMIT,
  addSeriesMovies,
  clampTmdbSeriesLimit,
  collectTmdbSeries,
  mapTmdbTvToSeriesMovie,
  movieInsertFromAdminSeries,
  tmdbSeriesToken,
  type SeriesMovieInsert,
  type SeriesMovieStore,
  type TmdbTvListItem,
} from './tmdb-series-catalog';

function show(id: number, extra: Partial<TmdbTvListItem> = {}): TmdbTvListItem {
  return {
    id,
    name: `Serie ${id}`,
    overview: 'Una serie de prueba con sinopsis larga.',
    poster_path: `/p${id}.jpg`,
    backdrop_path: `/b${id}.jpg`,
    first_air_date: '2019-03-01',
    genre_ids: [18, 80],
    ...extra,
  };
}

function memoryStore(seed: string[] = []): SeriesMovieStore & { rows: SeriesMovieInsert[] } {
  const rows: SeriesMovieInsert[] = [];
  const tokens = new Set(seed);
  return {
    rows,
    async findExistingTokens(wanted) {
      return new Set(wanted.filter((token) => tokens.has(token)));
    },
    async insertSeriesMovie(row) {
      if (tokens.has(row.token)) return 'skipped';
      tokens.add(row.token);
      rows.push(row);
      return 'inserted';
    },
  };
}

describe('tmdb series catalog mapping', () => {
  it('clamps the limit so a run stays small', () => {
    expect(clampTmdbSeriesLimit(undefined)).toBe(TMDB_SERIES_DEFAULT_LIMIT);
    expect(clampTmdbSeriesLimit(0)).toBe(40);
    expect(clampTmdbSeriesLimit(Number.NaN)).toBe(40);
    expect(clampTmdbSeriesLimit(12.9)).toBe(12);
    expect(clampTmdbSeriesLimit(9_000)).toBe(TMDB_SERIES_MAX_LIMIT);
  });

  it('maps a TMDB tv item onto Movie.mediaType SERIES and a stable token', () => {
    const row = mapTmdbTvToSeriesMovie(show(1396));
    expect(row).toMatchObject({
      name: 'Serie 1396',
      token: 'tmdb-tv-1396',
      mediaType: 'SERIES',
      genre: 'Drama, Crimen',
      releaseYear: '2019',
      classification: 'PG-13',
      image: 'https://image.tmdb.org/t/p/w500/p1396.jpg',
      featured: false,
    });
    expect(tmdbSeriesToken(1396)).toBe('tmdb-tv-1396');
  });

  it('drops rows without a title and marks adult titles R', () => {
    expect(mapTmdbTvToSeriesMovie({ id: 1, name: '  ' })).toBeNull();
    expect(mapTmdbTvToSeriesMovie(show(2, { adult: true }))?.classification).toBe('R');
  });

  it('stops at the requested limit and drops duplicate ids', async () => {
    const pages: number[] = [];
    const collected = await collectTmdbSeries(3, {
      fetchPage: async (page) => {
        pages.push(page);
        if (page > 1) return [];
        return [show(1), show(1), show(2), show(3), show(4)];
      },
    });
    expect(collected.map((row) => row.token)).toEqual(['tmdb-tv-1', 'tmdb-tv-2', 'tmdb-tv-3']);
    expect(pages).toEqual([1]);
  });
});

describe('addSeriesMovies', () => {
  it('inserts only new SERIES tokens and skips movies that already exist', async () => {
    const store = memoryStore(['tmdb-tv-1']);
    const rows = [show(1), show(2)].map((item) => mapTmdbTvToSeriesMovie(item)!);
    const first = await addSeriesMovies(rows, store);
    expect(first).toEqual({ imported: 1, skipped: 1, total: 2 });
    expect(store.rows.map((row) => row.token)).toEqual(['tmdb-tv-2']);
    expect(store.rows.every((row) => row.mediaType === 'SERIES')).toBe(true);

    const second = await addSeriesMovies(rows, store);
    expect(second).toEqual({ imported: 0, skipped: 2, total: 2 });
    expect(store.rows).toHaveLength(1);
  });

  it('mirrors an admin series row without turning it into a film', () => {
    const row = movieInsertFromAdminSeries({
      name: 'Dark',
      image: '/uploads/dark.webp',
      synopsis: 'Desapariciones en un pueblo alemán.',
      genre: 'Misterio',
      token: 'dark',
      actors: 'Louis Hofmann',
      classification: 'R',
      releaseYear: '2017',
      episodes: 26,
      featured: true,
    });
    expect(row).toMatchObject({
      token: 'dark',
      mediaType: 'SERIES',
      episodes: 26,
      featured: true,
    });
  });

  it('does not overwrite a film that already uses the admin token', async () => {
    const store = memoryStore(['dark']);
    const row = movieInsertFromAdminSeries({
      name: 'Dark',
      image: '/uploads/dark.webp',
      token: 'dark',
      synopsis: 'Desapariciones en un pueblo alemán.',
    });
    const result = await addSeriesMovies([row!], store);
    expect(result).toEqual({ imported: 0, skipped: 1, total: 1 });
    expect(store.rows).toHaveLength(0);
  });
});

describe('series importer safety', () => {
  it('source never truncates or writes users, subscriptions, or deletes', () => {
    const dir = dirname(fileURLToPath(import.meta.url));
    const source = [
      readFileSync(join(dir, 'tmdb-series-import.ts'), 'utf8'),
      readFileSync(join(dir, '../../scripts/import-tmdb-series.ts'), 'utf8'),
    ].join('\n');
    expect(source).not.toMatch(/TRUNCATE\s+TABLE/i);
    expect(source).not.toMatch(/\$executeRaw/);
    expect(source).not.toMatch(/prisma\.(user|subscription|favorite|history|session|account)\b/);
    expect(source).not.toMatch(/\.(delete|deleteMany|update|updateMany|upsert)\s*\(/);
    expect(source).toMatch(/mediaType:\s*'SERIES'/);
    expect(source).toMatch(/prisma\.movie\.create/);
    expect(source).toMatch(/prisma\.series\.findMany/);
  });
});
