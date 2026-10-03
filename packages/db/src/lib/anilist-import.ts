/**
 * Shared AniList catalog import logic (CLI + admin action).
 */
import { PrismaClient } from '@prisma/client';
import { getProvidersSortedByPriority } from './anime-providers';
import { deriveSeriesFields } from './anime-series';
import {
  fetchAnilistCatalog,
  mapAnilistStatus,
  pickAnilistTitle,
  slugifyTitle,
  stripHtml,
  type AnilistMedia,
} from './anilist';

const IMPORT_DELAY_MS = 500;

/** AniList allows about 30 requests/minute. Sleep between catalog pages, not only between DB writes. */
export const ANILIST_CATALOG_PAGE_DELAY_MS = 2_000;

/** Default for a normal admin/CLI run. Large enough to matter, small enough to finish quickly. */
export const ANILIST_CATALOG_DEFAULT_LIMIT = 200;

/** Bulk imports can cover a few thousand titles. AniList itself will not page a single query past 5000. */
export const ANILIST_CATALOG_MAX_LIMIT = 5_000;

/** AniList rejects perPage above 50 and any page whose window passes 5000 results. */
const ANILIST_PER_PAGE = 50;
const ANILIST_MAX_WINDOW = 5_000;

/** Stop a source after this many full pages that add nothing new (overlap with earlier sorts). */
const STALE_PAGE_LIMIT = 3;

/**
 * Official AniList genres that actually branch away from the global popularity list.
 * Isekai is a tag, not a genre, so it is not queried here.
 */
const CATALOG_GENRES = [
  'Action',
  'Adventure',
  'Comedy',
  'Drama',
  'Fantasy',
  'Horror',
  'Mecha',
  'Mystery',
  'Psychological',
  'Romance',
  'Sci-Fi',
  'Slice of Life',
  'Sports',
  'Supernatural',
  'Thriller',
] as const;

export interface ImportCatalogResult {
  imported: number;
  skipped: number;
  total: number;
}

function defaultProviders() {
  return getProvidersSortedByPriority()
    .slice(0, 3)
    .map((p) => ({
      name: p.name,
      url: p.baseUrl,
      language: p.language === 'sub/dub' ? 'sub' : p.language,
      isActive: true,
    }));
}

async function sleep(ms: number) {
  await new Promise((r) => setTimeout(r, ms));
}

async function upsertAnimeFromMedia(
  prisma: PrismaClient,
  media: AnilistMedia
): Promise<'imported' | 'skipped'> {
  const existing = await prisma.anime.findUnique({ where: { anilistId: media.id } });
  if (existing) return 'skipped';

  const title = pickAnilistTitle(media);
  const series = deriveSeriesFields(title, media.format);
  // Only the first entry of a franchise represents it in the catalog.
  const seriesMainExists = await prisma.anime.count({
    where: { seriesKey: series.seriesKey, isSeriesMain: true },
  });

  await prisma.anime.create({
    data: {
      title,
      alternativeTitle: media.title.native,
      slug: slugifyTitle(title),
      anilistId: media.id,
      malId: media.idMal ?? null,
      image:
        media.coverImage?.extraLarge || media.coverImage?.large || '/peliculas/placeholder.webp',
      synopsis: stripHtml(media.description),
      genre: media.genres ?? [],
      episodes: media.episodes ?? 0,
      status: mapAnilistStatus(media.status) === 'ongoing' ? 'ONGOING' : 'COMPLETED',
      year: media.seasonYear ?? new Date().getFullYear(),
      rating: media.averageScore ? media.averageScore / 10 : null,
      providers: defaultProviders(),
      ...series,
      isSeriesMain: seriesMainExists === 0,
    },
  });
  return 'imported';
}

type CatalogPageQuery = Parameters<typeof fetchAnilistCatalog>[0];

interface CatalogSource {
  sort: string;
  genre?: string;
  seasonYear?: number;
  status?: string;
  page: number;
  stalePages: number;
  done: boolean;
}

/** Recent seasons plus a thinner sample of older years, so a large import is not only this week's chart. */
export function catalogSeasonYears(currentYear: number): number[] {
  const years: number[] = [];
  const newest = Number.isFinite(currentYear) ? Math.floor(currentYear) : new Date().getFullYear();
  for (let year = newest; year >= 1990; year--) years.push(year);
  for (const year of [1988, 1986, 1979]) {
    if (!years.includes(year)) years.push(year);
  }
  return years;
}

function catalogSources(currentYear: number): CatalogSource[] {
  const source = (
    partial: Pick<CatalogSource, 'sort' | 'genre' | 'seasonYear' | 'status'>
  ): CatalogSource => ({
    ...partial,
    page: 1,
    stalePages: 0,
    done: false,
  });

  return [
    source({ sort: 'POPULARITY_DESC' }),
    source({ sort: 'TRENDING_DESC' }),
    source({ sort: 'POPULARITY_DESC', status: 'RELEASING' }),
    ...CATALOG_GENRES.map((genre) => source({ sort: 'POPULARITY_DESC', genre })),
    ...catalogSeasonYears(currentYear).map((seasonYear) =>
      source({ sort: 'POPULARITY_DESC', seasonYear })
    ),
  ];
}

export interface CollectAnilistMediaOptions {
  /** Injected in unit tests. Defaults to the live AniList client. */
  fetchPage?: (options: CatalogPageQuery) => Promise<AnilistMedia[]>;
  /** Override the gap between page requests. Production uses ~30 req/min. */
  delayMs?: number;
  /** Fixed clock so year lanes stay deterministic in tests. */
  currentYear?: number;
}

/**
 * Page popularity, trending, genres, and years until `limit` unique media are
 * collected or every lane runs out (empty page, only duplicates, or AniList's
 * 5000-result window). Existing rows are not touched here; the importer skips
 * them later by anilistId.
 */
export async function collectAnilistMedia(
  limit: number,
  options: CollectAnilistMediaOptions = {}
): Promise<AnilistMedia[]> {
  const target = Number.isFinite(limit) ? Math.max(0, Math.floor(limit)) : 0;
  if (target === 0) return [];

  const fetchPage = options.fetchPage ?? fetchAnilistCatalog;
  const delayMs = options.delayMs ?? ANILIST_CATALOG_PAGE_DELAY_MS;
  const seen = new Set<number>();
  const collected: AnilistMedia[] = [];
  const sources = catalogSources(options.currentYear ?? new Date().getFullYear());

  const addBatch = (items: AnilistMedia[]) => {
    let added = 0;
    for (const item of items) {
      if (collected.length >= target) break;
      if (!item || seen.has(item.id)) continue;
      seen.add(item.id);
      collected.push(item);
      added++;
    }
    return added;
  };

  let requestCount = 0;
  while (collected.length < target && sources.some((source) => !source.done)) {
    for (const source of sources) {
      if (collected.length >= target) break;
      if (source.done) continue;
      if (source.page * ANILIST_PER_PAGE > ANILIST_MAX_WINDOW) {
        source.done = true;
        continue;
      }

      if (requestCount > 0 && delayMs > 0) await sleep(delayMs);
      requestCount++;

      const items =
        (await fetchPage({
          sort: source.sort,
          genre: source.genre,
          seasonYear: source.seasonYear,
          status: source.status,
          perPage: ANILIST_PER_PAGE,
          page: source.page,
        })) ?? [];

      const added = addBatch(items);
      const lastPage = items.length < ANILIST_PER_PAGE;
      if (lastPage) {
        source.done = true;
        continue;
      }
      if (added === 0) {
        source.stalePages += 1;
        if (source.stalePages >= STALE_PAGE_LIMIT) {
          source.done = true;
          continue;
        }
      } else {
        source.stalePages = 0;
      }
      source.page += 1;
    }
  }

  return collected.slice(0, target);
}

export function clampAnilistImportLimit(limit: number | undefined): number {
  if (limit == null || !Number.isFinite(limit) || limit <= 0) return ANILIST_CATALOG_DEFAULT_LIMIT;
  return Math.min(ANILIST_CATALOG_MAX_LIMIT, Math.max(1, Math.floor(limit)));
}

export async function runAnilistImport(
  limit: number,
  prisma?: PrismaClient
): Promise<ImportCatalogResult> {
  const client = prisma ?? new PrismaClient();
  const shouldDisconnect = !prisma;
  const capped = clampAnilistImportLimit(limit);

  try {
    const mediaList = await collectAnilistMedia(capped);
    let imported = 0;
    let skipped = 0;

    for (const media of mediaList) {
      const result = await upsertAnimeFromMedia(client, media);
      if (result === 'imported') imported++;
      else skipped++;
      await sleep(IMPORT_DELAY_MS);
    }

    return { imported, skipped, total: mediaList.length };
  } finally {
    if (shouldDisconnect) await client.$disconnect();
  }
}
