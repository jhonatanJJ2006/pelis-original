/**
 * Series grouping helpers.
 *
 * AniList models every season as an independent media entry, so a franchise like
 * "Attack on Titan" arrives as five unrelated rows. These helpers turn those rows
 * into a single series with ordered seasons.
 */

export type AnimeFormat = 'TV' | 'TV_SHORT' | 'MOVIE' | 'OVA' | 'ONA' | 'SPECIAL' | 'MUSIC';

/** Relation types that mean "same franchise, another season/part". */
export const SERIES_RELATION_TYPES = new Set(['PREQUEL', 'SEQUEL', 'PARENT', 'SIDE_STORY']);

/** Formats that consume a season slot; movies and specials are listed apart. */
const SEASONAL_FORMATS = new Set(['TV', 'TV_SHORT', 'ONA']);

const ORDINAL_WORDS: Record<string, number> = {
  first: 1,
  second: 2,
  third: 3,
  fourth: 4,
  fifth: 5,
  sixth: 6,
  seventh: 7,
  eighth: 8,
  ninth: 9,
  tenth: 10,
};

const ROMAN_NUMERALS: Record<string, number> = {
  i: 1,
  ii: 2,
  iii: 3,
  iv: 4,
  v: 5,
  vi: 6,
  vii: 7,
  viii: 8,
  ix: 9,
  x: 10,
};

/**
 * Suffixes that only describe *which* season a title is, never the franchise.
 * Order matters: longer, more specific patterns first.
 */
const SEASON_SUFFIX_PATTERNS: RegExp[] = [
  /\s+season\s+\d+\s+part\s+\d+$/i,
  /\s+\d+(?:st|nd|rd|th)\s+season\s+part\s+\d+$/i,
  /\s+final\s+season(?:\s+part\s+\d+)?$/i,
  /\s+season\s+\d+$/i,
  /\s+\d+(?:st|nd|rd|th)\s+season$/i,
  /\s+(?:first|second|third|fourth|fifth|sixth|seventh|eighth|ninth|tenth)\s+season$/i,
  /\s+part\s+\d+$/i,
  /\s+cour\s+\d+$/i,
  /\s+s\d+$/i,
  /\s+\((?:19|20)\d{2}\)$/,
  /\s+\((?:tv|movie|ova|ona|special|dub|sub)\)$/i,
];

function stripDiacritics(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

export function slugify(value: string): string {
  return stripDiacritics(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Reduce a season title to the franchise title it belongs to.
 * "Attack on Titan Season 3 Part 2" -> "Attack on Titan"
 */
export function normalizeSeriesTitle(title: string): string {
  let out = title.trim();
  let changed = true;
  // Titles can stack suffixes ("Season 3 Part 2"), so strip until stable.
  while (changed) {
    changed = false;
    for (const pattern of SEASON_SUFFIX_PATTERNS) {
      const next = out.replace(pattern, '').trim();
      if (next !== out && next.length > 0) {
        out = next;
        changed = true;
      }
    }
  }
  return out;
}

/**
 * Grouping key used when AniList relations are unavailable. Collapses
 * punctuation differences too, so "Naruto: Shippuden" and "Naruto Shippuden"
 * land in the same bucket.
 */
export function fallbackSeriesKey(title: string): string {
  return slugify(normalizeSeriesTitle(title));
}

/** Extract the season number a title advertises, if any. */
export function parseSeasonNumberFromTitle(title: string): number | null {
  const t = title.toLowerCase();
  const numeric = t.match(/\bseason\s+(\d+)\b/) ?? t.match(/\b(\d+)(?:st|nd|rd|th)\s+season\b/);
  if (numeric?.[1]) return Number(numeric[1]);

  const worded = t.match(
    /\b(first|second|third|fourth|fifth|sixth|seventh|eighth|ninth|tenth)\s+season\b/,
  );
  if (worded?.[1]) return ORDINAL_WORDS[worded[1]] ?? null;

  const roman = t.match(/\s(i{1,3}|iv|v|vi{1,3}|ix|x)$/);
  if (roman?.[1]) return ROMAN_NUMERALS[roman[1]] ?? null;

  return null;
}

export function parsePartNumberFromTitle(title: string): number | null {
  const part = title.toLowerCase().match(/\bpart\s+(\d+)\b/) ?? title.toLowerCase().match(/\bcour\s+(\d+)\b/);
  return part?.[1] ? Number(part[1]) : null;
}

export function isSeasonalFormat(format?: string | null): boolean {
  return SEASONAL_FORMATS.has((format ?? 'TV').toUpperCase());
}

export function isMovieFormat(format?: string | null): boolean {
  return (format ?? '').toUpperCase() === 'MOVIE';
}

export interface SeasonLabelInput {
  title: string;
  seriesTitle: string;
  format?: string | null;
  seasonNumber?: number | null;
}

/**
 * Human label shown in the season picker. Prefers the distinctive part of the
 * title ("Final Season", "Mugen Train") and falls back to "Temporada N".
 */
export function deriveSeasonLabel({
  title,
  seriesTitle,
  format,
  seasonNumber,
}: SeasonLabelInput): string {
  const upperFormat = (format ?? 'TV').toUpperCase();
  if (upperFormat === 'MOVIE') return 'Película';
  if (upperFormat === 'OVA') return 'OVA';
  if (upperFormat === 'SPECIAL') return 'Especial';

  const lowerTitle = title.toLowerCase();
  const part = parsePartNumberFromTitle(title);

  if (lowerTitle.includes('final season')) {
    return part ? `Temporada final · Parte ${part}` : 'Temporada final';
  }

  const parsed = parseSeasonNumberFromTitle(title) ?? seasonNumber;
  if (parsed) {
    return part ? `Temporada ${parsed} · Parte ${part}` : `Temporada ${parsed}`;
  }

  // Titles that add a distinctive subtitle ("HAIKYU!! TO THE TOP") keep it.
  const remainder = title
    .replace(new RegExp(`^${escapeRegExp(seriesTitle)}`, 'i'), '')
    .replace(/^[\s:·\-–—]+/, '')
    .trim();
  // A bare year or format tag is noise, not a season name.
  const isNoise = /^\(?(?:19|20)\d{2}\)?$/.test(remainder) || /^\((?:tv|movie|ova|ona)\)$/i.test(remainder);
  if (remainder.length > 0 && remainder.length <= 40 && !isNoise) return remainder;

  return seasonNumber ? `Temporada ${seasonNumber}` : 'Temporada 1';
}

/**
 * True when `candidate` looks like an entry of the franchise called `baseTitle`
 * ("HAIKYU!!" is the base of "HAIKYU!! TO THE TOP"). Used to reconnect seasons
 * whose AniList relation chain passes through a title absent from the catalog.
 */
export function isFranchisePrefix(baseTitle: string, candidate: string): boolean {
  const base = stripDiacritics(baseTitle).toLowerCase().trim();
  const other = stripDiacritics(candidate).toLowerCase().trim();
  // Short bases like "Bleach" are fine, but 3-letter ones cause false matches.
  if (base.length < 6 || other.length <= base.length) return false;
  if (!other.startsWith(base)) return false;
  // The franchise name must end on a word boundary, not mid-word.
  return /^[\s:·\-–—!?.,()]/.test(other.slice(base.length));
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export interface SeasonSortable {
  id: string;
  title: string;
  format?: string | null;
  year: number;
  startDate?: { year?: number | null; month?: number | null; day?: number | null } | null;
}

function startTimestamp(item: SeasonSortable): number {
  const y = item.startDate?.year ?? item.year;
  const m = item.startDate?.month ?? 1;
  const d = item.startDate?.day ?? 1;
  return new Date(y, m - 1, d).getTime();
}

/**
 * Chronological order within a series: seasons first (by air date), then
 * movies/OVAs/specials, also chronological.
 */
export function sortSeasons<T extends SeasonSortable>(items: T[]): T[] {
  return [...items].sort((a, b) => {
    const aSeasonal = isSeasonalFormat(a.format);
    const bSeasonal = isSeasonalFormat(b.format);
    if (aSeasonal !== bSeasonal) return aSeasonal ? -1 : 1;

    const aTitleSeason = parseSeasonNumberFromTitle(a.title);
    const bTitleSeason = parseSeasonNumberFromTitle(b.title);
    if (aTitleSeason && bTitleSeason && aTitleSeason !== bTitleSeason) {
      return aTitleSeason - bTitleSeason;
    }

    const byDate = startTimestamp(a) - startTimestamp(b);
    if (byDate !== 0) return byDate;

    const aPart = parsePartNumberFromTitle(a.title) ?? 0;
    const bPart = parsePartNumberFromTitle(b.title) ?? 0;
    if (aPart !== bPart) return aPart - bPart;

    return a.title.localeCompare(b.title);
  });
}

export interface SeriesFields {
  seriesKey: string;
  seriesTitle: string;
  seasonNumber: number | null;
  seasonLabel: string;
  format: string | null;
}

/**
 * Series columns derived from a title alone, for rows created at import time.
 * This keeps newly imported seasons attached to their franchise immediately;
 * `group:anime` later refines the grouping using AniList relations.
 */
export function deriveSeriesFields(title: string, format?: string | null): SeriesFields {
  const seriesTitle = normalizeSeriesTitle(title);
  const seasonal = isSeasonalFormat(format);
  const seasonNumber = seasonal ? (parseSeasonNumberFromTitle(title) ?? 1) : null;
  return {
    seriesKey: fallbackSeriesKey(title),
    seriesTitle,
    seasonNumber,
    seasonLabel: deriveSeasonLabel({ title, seriesTitle, format, seasonNumber }),
    format: format ?? null,
  };
}

/** Minimal union-find used to merge franchise members transitively. */
export class UnionFind {
  private parent = new Map<string, string>();

  find(key: string): string {
    const current = this.parent.get(key);
    if (current === undefined) {
      this.parent.set(key, key);
      return key;
    }
    if (current === key) return key;
    const root = this.find(current);
    this.parent.set(key, root);
    return root;
  }

  union(a: string, b: string): void {
    const rootA = this.find(a);
    const rootB = this.find(b);
    if (rootA !== rootB) this.parent.set(rootB, rootA);
  }

  groups(keys: string[]): Map<string, string[]> {
    const out = new Map<string, string[]>();
    for (const key of keys) {
      const root = this.find(key);
      const bucket = out.get(root);
      if (bucket) bucket.push(key);
      else out.set(root, [key]);
    }
    return out;
  }
}
