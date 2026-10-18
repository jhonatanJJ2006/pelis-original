import { describe, expect, it } from 'vitest';
import { dedupeSeeds, mergeSeeds, seedSchema, type Seed, type SeedMovie } from './seed';

const movie = (token: string, overrides: Partial<SeedMovie> = {}): SeedMovie => ({
  token,
  name: token.toUpperCase(),
  synopsis: 'Sinopsis',
  genre: 'Drama',
  actors: '',
  classification: 'PG',
  releaseYear: '2024',
  image: `/peliculas/${token}.webp`,
  mediaType: 'movie',
  ...overrides,
});

const baseSeed = (): Seed => [movie('a'), movie('b', { genre: 'Comedia' })];

describe('seedSchema', () => {
  it('accepts a well-formed seed array (shape of movies-processed.json)', () => {
    expect(seedSchema.safeParse(baseSeed()).success).toBe(true);
  });

  it('accepts an empty synopsis, as written when TMDB has no overview', () => {
    expect(seedSchema.safeParse([movie('a', { synopsis: '' })]).success).toBe(true);
  });

  it('rejects releaseYear with fewer than 4 digits', () => {
    expect(seedSchema.safeParse([movie('a', { releaseYear: '24' })]).success).toBe(false);
  });
});

describe('mergeSeeds', () => {
  it('keeps the extra entry on token collision', () => {
    const merged = mergeSeeds(baseSeed(), [movie('a', { name: 'A (extra)' })]);
    expect(merged.find((m) => m.token === 'a')?.name).toBe('A (extra)');
    expect(merged).toHaveLength(2);
  });

  it('appends new tokens without removing existing ones', () => {
    const merged = mergeSeeds(baseSeed(), [movie('c')]);
    expect(merged.map((m) => m.token)).toEqual(['a', 'b', 'c']);
  });
});

describe('dedupeSeeds', () => {
  it('removes duplicates preserving first occurrence', () => {
    const result = dedupeSeeds([movie('a'), movie('a', { name: 'dup' }), movie('b')]);
    expect(result).toHaveLength(2);
    expect(result[0]?.name).toBe('A');
  });
});
