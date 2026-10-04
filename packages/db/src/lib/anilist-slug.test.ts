import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  animeSlugBase,
  animeSlugCandidates,
  isAnimeSlugUniqueConflict,
  pickUniqueAnimeSlug,
  retryUniqueAnimeSlug,
} from './anilist-slug';

const free = () => false;

describe('pickUniqueAnimeSlug', () => {
  it('keeps the generated slug when nothing else has it', () => {
    expect(pickUniqueAnimeSlug('Attack on Titan', 16498, free)).toBe('attack-on-titan');
    expect(animeSlugBase('Attack on Titan', 16498)).toBe('attack-on-titan');
  });

  it('appends the anilist id when the base slug is taken', () => {
    const taken = new Set(['attack-on-titan']);
    expect(pickUniqueAnimeSlug('Attack on Titan', 16498, (slug) => taken.has(slug))).toBe(
      'attack-on-titan-16498'
    );
  });

  it('uses the smallest numeric suffix when the id slug is also taken', () => {
    const taken = new Set(['naruto', 'naruto-20']);
    expect(pickUniqueAnimeSlug('Naruto', 20, (slug) => taken.has(slug))).toBe('naruto-2');
  });

  it('skips numeric suffixes that are already taken', () => {
    const taken = new Set(['naruto', 'naruto-20', 'naruto-2', 'naruto-3']);
    expect(pickUniqueAnimeSlug('Naruto', 20, (slug) => taken.has(slug))).toBe('naruto-4');
  });

  it('does not treat an id that looks like a small suffix as already used', () => {
    const taken = new Set(['naruto', 'naruto-2']);
    expect(pickUniqueAnimeSlug('Naruto', 2, (slug) => taken.has(slug))).toBe('naruto-3');
  });

  it('does not rewrite a slug that already belongs to another row', () => {
    const existing = new Set(['one-piece']);
    const chosen = pickUniqueAnimeSlug('One Piece', 21, (slug) => existing.has(slug));
    expect(existing).toEqual(new Set(['one-piece']));
    expect(chosen).toBe('one-piece-21');
    expect(existing.has(chosen)).toBe(false);
  });

  it('falls back when the title slugifies to nothing', () => {
    expect(pickUniqueAnimeSlug('!!!', 99, free)).toBe('anime-99');
    const taken = new Set(['anime-99']);
    expect(pickUniqueAnimeSlug('!!!', 99, (slug) => taken.has(slug))).toBe('anime-99-99');
  });

  it('only returns a slug the caller said was free', () => {
    const taken = new Set(animeSlugCandidates('Bleach', 269));
    const chosen = pickUniqueAnimeSlug('Bleach', 269, (slug) => taken.has(slug));
    expect(taken.has(chosen)).toBe(false);
    expect(chosen).toBe('bleach-269-269');
  });
});

describe('retryUniqueAnimeSlug', () => {
  it('retries a raced base slug by appending the anilist id', () => {
    expect(retryUniqueAnimeSlug('Naruto', 20, 'naruto')).toBe('naruto-20');
  });

  it('retries a raced id slug with a numeric tail', () => {
    expect(retryUniqueAnimeSlug('Naruto', 20, 'naruto-20')).toBe('naruto-20-2');
  });

  it('does not retry a slug that is already known to be taken', () => {
    const taken = new Set(['naruto-20']);
    expect(retryUniqueAnimeSlug('Naruto', 20, 'naruto', (slug) => taken.has(slug))).toBe(
      'naruto-20-2'
    );
  });

  it('pins the anilist id onto a numeric slug that lost the race', () => {
    const retry = retryUniqueAnimeSlug('Naruto', 20, 'naruto-4');
    expect(retry).toBe('naruto-4-20');
    expect(retry).not.toBe('naruto-4');
  });
});

describe('isAnimeSlugUniqueConflict', () => {
  it('matches a P2002 aimed at slug', () => {
    expect(isAnimeSlugUniqueConflict({ code: 'P2002', meta: { target: ['slug'] } })).toBe(true);
    expect(isAnimeSlugUniqueConflict({ code: 'P2002', meta: { target: 'anime_slug_key' } })).toBe(
      true
    );
    expect(
      isAnimeSlugUniqueConflict({
        code: 'P2002',
        message: 'Unique constraint failed on the fields: (`slug`)',
      })
    ).toBe(true);
  });

  it('does not treat anilistId conflicts or other errors as slug collisions', () => {
    expect(isAnimeSlugUniqueConflict({ code: 'P2002', meta: { target: ['anilistId'] } })).toBe(
      false
    );
    expect(
      isAnimeSlugUniqueConflict({
        code: 'P2002',
        message: 'Unique constraint failed on the fields: (`anilistId`)',
      })
    ).toBe(false);
    expect(isAnimeSlugUniqueConflict({ code: 'P2003', meta: { target: ['slug'] } })).toBe(false);
    expect(isAnimeSlugUniqueConflict(new Error('boom'))).toBe(false);
    expect(isAnimeSlugUniqueConflict({ code: 'P2002' })).toBe(false);
  });
});

describe('anilist slug module', () => {
  it('does not import Prisma', () => {
    const source = readFileSync(new URL('./anilist-slug.ts', import.meta.url), 'utf8');
    expect(source).not.toMatch(/@prisma\/client/);
    expect(source).not.toMatch(/from ['"]\.\/anilist-import/);
  });
});
