import { describe, expect, it } from 'vitest';
import { normalizeTmdbMovie, type TmdbGenreMap } from './tmdb';

const genreMap: TmdbGenreMap = {
  28: 'Action',
  35: 'Comedy',
  18: 'Drama',
};

describe('normalizeTmdbMovie', () => {
  it('uses title and falls back to original_title', () => {
    expect(normalizeTmdbMovie({ id: 1, title: 'Hola' }, genreMap).name).toBe('Hola');
    expect(normalizeTmdbMovie({ id: 1, original_title: 'Hola' }, genreMap).name).toBe('Hola');
  });

  it('uses the first genre id and looks it up in the genre map', () => {
    const result = normalizeTmdbMovie({ id: 1, title: 'Foo', genre_ids: [35, 18] }, genreMap);
    expect(result.genre).toBe('Comedy');
  });

  it('falls back to a stable token when the title is missing', () => {
    expect(normalizeTmdbMovie({ id: 999 }, genreMap).token).toBe('tmdb-999-999');
    expect(normalizeTmdbMovie({ id: 7, title: '   ' }, genreMap).name).toBe('tmdb-7');
  });

  it('extracts the year from release_date and defaults to 1970', () => {
    expect(
      normalizeTmdbMovie({ id: 1, title: 'Foo', release_date: '2024-08-01' }, genreMap).releaseYear
    ).toBe('2024');
    expect(normalizeTmdbMovie({ id: 2, title: 'Bar' }, genreMap).releaseYear).toBe('1970');
  });

  it('defaults an empty release_date (common in TMDB) to 1970', () => {
    expect(
      normalizeTmdbMovie({ id: 3, title: 'Baz', release_date: '' }, genreMap).releaseYear
    ).toBe('1970');
  });

  it('builds the poster URL using the w500 base', () => {
    const result = normalizeTmdbMovie({ id: 1, title: 'Foo', poster_path: '/abc.jpg' }, genreMap);
    expect(result.image).toBe('https://image.tmdb.org/t/p/w500/abc.jpg');
    expect(normalizeTmdbMovie({ id: 1, title: 'Foo', poster_path: null }, genreMap).image).toBe('');
  });

  it('produces slug tokens without diacritics', () => {
    expect(normalizeTmdbMovie({ id: 42, title: 'Pélîs Ñoña' }, genreMap).token).toBe(
      'pelis-nona-42'
    );
  });

  it('defaults missing genre to "Sin clasificar"', () => {
    expect(normalizeTmdbMovie({ id: 1, title: 'Foo', genre_ids: [9999] }, genreMap).genre).toBe(
      'Sin clasificar'
    );
  });

  it('uses a placeholder synopsis for empty or missing overviews', () => {
    expect(normalizeTmdbMovie({ id: 1, title: 'Foo', overview: '' }, genreMap).synopsis).toBe(
      'Sin sinopsis disponible.'
    );
    expect(normalizeTmdbMovie({ id: 1, title: 'Foo', overview: null }, genreMap).synopsis).toBe(
      'Sin sinopsis disponible.'
    );
  });
});
