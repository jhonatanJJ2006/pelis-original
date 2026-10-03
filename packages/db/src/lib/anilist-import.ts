/**
 * Shared AniList catalog import logic (CLI + admin action).
 * Paging and limit math live in anilist-catalog.ts so unit tests do not load Prisma.
 */
import { PrismaClient } from '@prisma/client';
import { getProvidersSortedByPriority } from './anime-providers';
import { deriveSeriesFields } from './anime-series';
import {
  mapAnilistStatus,
  pickAnilistTitle,
  slugifyTitle,
  stripHtml,
  type AnilistMedia,
} from './anilist';
import {
  ANILIST_CATALOG_DEFAULT_LIMIT,
  ANILIST_CATALOG_MAX_LIMIT,
  ANILIST_CATALOG_PAGE_DELAY_MS,
  catalogSeasonYears,
  clampAnilistImportLimit,
  collectAnilistMedia,
  type CollectAnilistMediaOptions,
} from './anilist-catalog';

export {
  ANILIST_CATALOG_DEFAULT_LIMIT,
  ANILIST_CATALOG_MAX_LIMIT,
  ANILIST_CATALOG_PAGE_DELAY_MS,
  catalogSeasonYears,
  clampAnilistImportLimit,
  collectAnilistMedia,
  type CollectAnilistMediaOptions,
};

const IMPORT_DELAY_MS = 500;

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
