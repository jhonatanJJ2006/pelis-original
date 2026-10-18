import { describe, expect, it } from 'vitest';
import { isPosterHash, legacyPosterPath, posterPath } from './posters';

describe('posters', () => {
  it('builds the seed poster path used by generate-seed / download-*-posters', () => {
    expect(posterPath('avatar-fuego-y-ceniza')).toBe('/peliculas/avatar-fuego-y-ceniza.webp');
  });

  it('rejects tokens that would escape the posters folder', () => {
    expect(() => posterPath('../etc/passwd')).toThrow();
    expect(() => posterPath('')).toThrow();
  });

  it('detects legacy 32-hex poster hashes', () => {
    expect(isPosterHash('0123456789abcdef0123456789ABCDEF')).toBe(true);
    expect(isPosterHash('ultimo-horizonte')).toBe(false);
  });

  it('builds the legacy hash path like resolveMovieImagePath', () => {
    expect(legacyPosterPath('0123456789ABCDEF0123456789abcdef')).toBe(
      '/peliculas/peliculas/0123456789abcdef0123456789abcdef.webp'
    );
    expect(() => legacyPosterPath('nope')).toThrow();
  });
});
