import { describe, expect, it } from 'vitest';
import type { AnilistMedia } from './anilist';
import {
  ANILIST_CATALOG_DEFAULT_LIMIT,
  ANILIST_CATALOG_MAX_LIMIT,
  ANILIST_CATALOG_PAGE_DELAY_MS,
  catalogSeasonYears,
  clampAnilistImportLimit,
  collectAnilistMedia,
  type CollectAnilistMediaOptions,
} from './anilist-catalog';

function media(id: number): AnilistMedia {
  return { id, title: { romaji: `Anime ${id}` } };
}

function pageOf(start: number, count: number): AnilistMedia[] {
  return Array.from({ length: count }, (_, index) => media(start + index));
}

type Query =
  NonNullable<CollectAnilistMediaOptions['fetchPage']> extends (
    options: infer Q
  ) => Promise<AnilistMedia[]>
    ? Q
    : never;

/**
 * Popularity/trending/genre/year lanes the collector should walk.
 * Anything else returns an empty page so the test stays offline.
 */
function scriptedFetch(calls: Query[]) {
  return async (options: Query) => {
    calls.push(options);
    const page = options.page ?? 1;
    if (options.perPage !== 50) {
      throw new Error(`expected perPage 50, got ${options.perPage}`);
    }
    if (options.genre) {
      if (options.genre === 'Action' && page === 1) return pageOf(20_001, 50);
      return [];
    }
    if (options.seasonYear != null) {
      if (options.seasonYear === 1999 && page === 1) return pageOf(30_001, 20);
      return [];
    }
    if (options.status === 'RELEASING') return [];
    if (options.sort === 'TRENDING_DESC') {
      if (page === 1) return pageOf(10_001, 50);
      return [];
    }
    if (
      options.sort === 'POPULARITY_DESC' &&
      !options.genre &&
      options.seasonYear == null &&
      !options.status
    ) {
      if (page <= 4) return pageOf((page - 1) * 50 + 1, 50);
      return [];
    }
    return [];
  };
}

describe('collectAnilistMedia', () => {
  const opts = { delayMs: 0, currentYear: 2026 } as const;

  it('stops at the requested limit instead of a fixed first-page ceiling', async () => {
    const calls: Query[] = [];
    const collected = await collectAnilistMedia(80, { ...opts, fetchPage: scriptedFetch(calls) });

    expect(collected).toHaveLength(80);
    expect(new Set(collected.map((item) => item.id)).size).toBe(80);
    expect(calls.some((call) => call.sort === 'TRENDING_DESC')).toBe(true);
    expect(calls.some((call) => call.sort === 'POPULARITY_DESC' && call.page === 2)).toBe(false);
  });

  it('pages further through popularity, genres, and years when the limit is higher', async () => {
    const calls: Query[] = [];
    const collected = await collectAnilistMedia(200, { ...opts, fetchPage: scriptedFetch(calls) });

    expect(collected).toHaveLength(200);
    expect(new Set(collected.map((item) => item.id)).size).toBe(200);
    expect(
      calls.some((call) => call.sort === 'POPULARITY_DESC' && !call.genre && call.page === 2)
    ).toBe(true);
    expect(calls.some((call) => call.genre === 'Action' && call.page === 1)).toBe(true);
    expect(calls.some((call) => call.seasonYear === 1999)).toBe(true);
    expect(Math.max(...calls.map((call) => call.page ?? 1))).toBeGreaterThan(1);
  });

  it('does not request a page past the AniList 5000-result window', async () => {
    const calls: Query[] = [];
    const fetchPage = async (options: Query) => {
      calls.push(options);
      const page = options.page ?? 1;
      if (page > 100) throw new Error(`page ${page} is outside the AniList window`);
      const globalPopularity =
        options.sort === 'POPULARITY_DESC' &&
        !options.genre &&
        options.seasonYear == null &&
        !options.status;
      if (!globalPopularity) return [];
      return pageOf((page - 1) * 50 + 1, 50);
    };

    const collected = await collectAnilistMedia(6_000, { ...opts, fetchPage });

    expect(collected).toHaveLength(5_000);
    const popularityPages = calls
      .filter(
        (call) =>
          !call.genre && call.seasonYear == null && !call.status && call.sort === 'POPULARITY_DESC'
      )
      .map((call) => call.page ?? 1);
    expect(Math.max(...popularityPages)).toBe(100);
    expect(popularityPages).not.toContain(101);
  });

  it('drops duplicate ids shared across sorts', async () => {
    const fetchPage = async (options: Query) => {
      if (options.genre || options.seasonYear != null || options.status) return [];
      if ((options.page ?? 1) > 1) return [];
      return pageOf(1, 50);
    };

    const collected = await collectAnilistMedia(80, { ...opts, fetchPage });
    expect(collected.map((item) => item.id)).toEqual(pageOf(1, 50).map((item) => item.id));
  });
});

describe('anilist import limits', () => {
  it('keeps a small default and clamps a few thousand', () => {
    expect(clampAnilistImportLimit(undefined)).toBe(ANILIST_CATALOG_DEFAULT_LIMIT);
    expect(clampAnilistImportLimit(undefined)).toBe(200);
    expect(clampAnilistImportLimit(0)).toBe(200);
    expect(clampAnilistImportLimit(Number.NaN)).toBe(200);
    expect(clampAnilistImportLimit(2_000)).toBe(2_000);
    expect(clampAnilistImportLimit(9_000)).toBe(ANILIST_CATALOG_MAX_LIMIT);
    expect(clampAnilistImportLimit(1.9)).toBe(1);
  });

  it('paces catalog pages at about 30 requests per minute', () => {
    expect(ANILIST_CATALOG_PAGE_DELAY_MS).toBeGreaterThanOrEqual(2_000);
  });

  it('includes a useful year span, not a single season', () => {
    const years = catalogSeasonYears(2026);
    expect(years[0]).toBe(2026);
    expect(years).toContain(1999);
    expect(years).toContain(1990);
    expect(years).toContain(1979);
  });
});
