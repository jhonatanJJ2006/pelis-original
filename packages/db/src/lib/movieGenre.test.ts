import { describe, expect, it } from 'vitest';
import { movieMatchesGenre, splitMovieGenres } from './movieGenre';

describe('splitMovieGenres', () => {
  it('splits comma-separated TMDB genres', () => {
    expect(splitMovieGenres('Acción, Crimen, Suspense')).toEqual(['Acción', 'Crimen', 'Suspense']);
  });

  it('keeps a single primary genre', () => {
    expect(splitMovieGenres('Terror')).toEqual(['Terror']);
  });

  it('returns empty for blank values', () => {
    expect(splitMovieGenres('')).toEqual([]);
    expect(splitMovieGenres(null)).toEqual([]);
    expect(splitMovieGenres('  ,  ')).toEqual([]);
  });
});

describe('movieMatchesGenre', () => {
  it('matches a token inside a compound genre string', () => {
    expect(movieMatchesGenre('Acción, Crimen, Suspense', 'Acción')).toBe(true);
    expect(movieMatchesGenre('Acción, Crimen, Suspense', 'Crimen')).toBe(true);
    expect(movieMatchesGenre('Acción, Crimen, Suspense', 'Drama')).toBe(false);
  });

  it('matches when wanted lists several genres (any overlap)', () => {
    expect(movieMatchesGenre('Terror, Suspense', 'Acción, Terror')).toBe(true);
    expect(movieMatchesGenre('Comedia', 'Acción, Terror')).toBe(false);
  });

  it('is case-insensitive and trims', () => {
    expect(movieMatchesGenre('Acción, Crimen', 'acción')).toBe(true);
    expect(movieMatchesGenre('Acción, Crimen', ' Crimen ')).toBe(true);
  });

  it('does not treat substrings of a token as a match', () => {
    expect(movieMatchesGenre('Melodrama', 'Drama')).toBe(false);
    expect(movieMatchesGenre('Drama', 'Melodrama')).toBe(false);
  });
});
