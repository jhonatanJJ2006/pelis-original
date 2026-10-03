/**
 * Pure anime slug selection. No Prisma and no database writes, so unit tests
 * can load this module before `prisma generate`.
 *
 * Existing rows are not renamed here. The importer only asks for a slug when
 * the anilistId is new, then creates that row.
 */

import { slugifyTitle } from './anilist';

/** How many `{base}-N` suffixes to consider before falling through. */
const NUMERIC_SUFFIX_LIMIT = 100;

/** Extra `{base}-{anilistId}-N` forms used when the id slug is taken too. */
const ID_SUFFIX_LIMIT = 20;

export function animeSlugBase(title: string, anilistId: number): string {
  const base = slugifyTitle(title);
  if (base.length > 0) return base;
  return `anime-${anilistId}`;
}

/**
 * Slugs to check, in the order they should be used:
 * 1. `slugifyTitle(title)` (or `anime-{anilistId}` when the title slugifies empty)
 * 2. `{base}-{anilistId}` when the base is already taken
 * 3. the smallest numeric suffix `{base}-2`, `{base}-3`, ...
 * 4. `{base}-{anilistId}-2`, ... if those are taken as well
 */
export function animeSlugCandidates(title: string, anilistId: number): string[] {
  const base = animeSlugBase(title, anilistId);
  const withId = `${base}-${anilistId}`;
  const candidates: string[] = [];
  const seen = new Set<string>();

  const add = (slug: string) => {
    if (seen.has(slug)) return;
    seen.add(slug);
    candidates.push(slug);
  };

  add(base);
  add(withId);
  for (let n = 2; n <= NUMERIC_SUFFIX_LIMIT; n++) add(`${base}-${n}`);
  for (let n = 2; n <= ID_SUFFIX_LIMIT; n++) add(`${withId}-${n}`);
  return candidates;
}

export function pickUniqueAnimeSlug(
  title: string,
  anilistId: number,
  isTaken: (slug: string) => boolean
): string {
  for (const candidate of animeSlugCandidates(title, anilistId)) {
    if (!isTaken(candidate)) return candidate;
  }
  const withId = `${animeSlugBase(title, anilistId)}-${anilistId}`;
  return `${withId}-${anilistId}`;
}

/**
 * A different slug after create lost a race on `rejected`.
 * Prefers appending the anilist id, then a numeric tail, and never returns
 * `rejected` or a slug `isTaken` already knows about.
 */
export function retryUniqueAnimeSlug(
  title: string,
  anilistId: number,
  rejected: string,
  isTaken: (slug: string) => boolean = () => false
): string {
  const base = animeSlugBase(title, anilistId);
  const withId = `${base}-${anilistId}`;
  const blocked = (slug: string) => slug === rejected || isTaken(slug);
  const alreadyPinned = rejected === withId || rejected.startsWith(`${withId}-`);
  const preferred = alreadyPinned
    ? [`${rejected}-2`, `${withId}-2`, `${withId}-3`]
    : [`${rejected}-${anilistId}`, withId, `${withId}-2`, `${rejected}-2`];

  for (const candidate of preferred) {
    if (!blocked(candidate)) return candidate;
  }

  for (let n = 2; n <= NUMERIC_SUFFIX_LIMIT; n++) {
    const candidate = `${withId}-${n}`;
    if (!blocked(candidate)) return candidate;
  }

  return `${withId}-${NUMERIC_SUFFIX_LIMIT + 1}`;
}

function constraintFields(target: unknown): string[] {
  if (Array.isArray(target)) {
    return target.flatMap((item) => String(item).split(','));
  }
  if (typeof target === 'string') return target.split(',');
  return [];
}

function fieldIsSlug(field: string): boolean {
  const name = field.trim().toLowerCase();
  return name === 'slug' || name === 'anime_slug_key';
}

/**
 * True only for a Prisma P2002 whose target is the anime slug.
 * An `anilistId` unique conflict is not a slug collision and must not be retried
 * as a second insert.
 */
export function isAnimeSlugUniqueConflict(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const record = error as { code?: unknown; meta?: { target?: unknown }; message?: unknown };
  if (record.code !== 'P2002') return false;

  const fields = constraintFields(record.meta?.target);
  if (fields.length > 0) return fields.some(fieldIsSlug);

  if (typeof record.message === 'string') {
    const message = record.message.toLowerCase();
    return message.includes('slug') && !message.includes('anilistid');
  }
  return false;
}
