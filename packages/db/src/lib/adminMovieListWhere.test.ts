import { describe, expect, it } from 'vitest';
import { genreTokenWhere } from './movieGenre';
import { adminMovieListWhere } from './adminMovieListWhere';

describe('adminMovieListWhere', () => {
  it('does not filter when search and genre are blank', () => {
    expect(adminMovieListWhere({})).toEqual({});
    expect(adminMovieListWhere({ search: '  ', genre: ' , ' })).toEqual({});
  });

  it('keeps admin search on name, token, and actors', () => {
    expect(adminMovieListWhere({ search: ' Inception ' })).toEqual({
      OR: [
        { name: { contains: 'inception', mode: 'insensitive' } },
        { token: { contains: 'inception', mode: 'insensitive' } },
        { actors: { contains: 'inception', mode: 'insensitive' } },
      ],
    });
  });

  it('uses the same genre token predicate as the public catalog', () => {
    expect(adminMovieListWhere({ genre: 'Acción' })).toEqual(genreTokenWhere('Acción'));
  });

  it('ANDs genre tokens with search so neither filter replaces the other', () => {
    const where = adminMovieListWhere({ search: 'Nolan', genre: 'Drama' });
    expect(where).toEqual({
      AND: [
        genreTokenWhere('Drama'),
        {
          OR: [
            { name: { contains: 'nolan', mode: 'insensitive' } },
            { token: { contains: 'nolan', mode: 'insensitive' } },
            { actors: { contains: 'nolan', mode: 'insensitive' } },
          ],
        },
      ],
    });
  });
});
