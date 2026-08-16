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

export interface ImportCatalogResult {
  imported: number;
  skipped: number;
  total: number;
}

function defaultProviders() {
  return getProvidersSortedByPriority().slice(0, 3).map((p) => ({
    name: p.name,
    url: p.baseUrl,
    language: p.language === 'sub/dub' ? 'sub' : p.language,
    isActive: true,
  }));
}

async function sleep(ms: number) {
  await new Promise((r) => setTimeout(r, ms));
}

async function upsertAnimeFromMedia(prisma: PrismaClient, media: AnilistMedia): Promise<'imported' | 'skipped'> {
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
      image: media.coverImage?.extraLarge || media.coverImage?.large || '/peliculas/placeholder.webp',
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

export async function collectAnilistMedia(limit: number): Promise<AnilistMedia[]> {
  const seen = new Set<number>();
  const collected: AnilistMedia[] = [];

  const addBatch = (items: AnilistMedia[]) => {
    for (const item of items) {
      if (seen.has(item.id)) continue;
      seen.add(item.id);
      collected.push(item);
      if (collected.length >= limit) break;
    }
  };

  addBatch(await fetchAnilistCatalog({ sort: 'POPULARITY_DESC', perPage: 50, page: 1 }));
  if (collected.length < limit) {
    addBatch(await fetchAnilistCatalog({ sort: 'TRENDING_DESC', perPage: 30, page: 1 }));
  }

  const genres = ['Action', 'Romance', 'Isekai', 'Slice of Life', 'Horror', 'Sports'];
  for (const genre of genres) {
    if (collected.length >= limit) break;
    addBatch(await fetchAnilistCatalog({ sort: 'POPULARITY_DESC', genre, perPage: 5, page: 1 }));
    await sleep(IMPORT_DELAY_MS);
  }

  if (collected.length < limit) {
    addBatch(await fetchAnilistCatalog({ sort: 'POPULARITY_DESC', seasonYear: 1999, perPage: 20, page: 1 }));
  }
  if (collected.length < limit) {
    addBatch(await fetchAnilistCatalog({ sort: 'POPULARITY_DESC', status: 'RELEASING', perPage: 20, page: 1 }));
  }
  if (collected.length < limit) {
    addBatch(
      await fetchAnilistCatalog({
        sort: 'POPULARITY_DESC',
        perPage: 20,
        page: 2,
      }),
    );
  }

  return collected.slice(0, limit);
}

export async function runAnilistImport(limit: number, prisma?: PrismaClient): Promise<ImportCatalogResult> {
  const client = prisma ?? new PrismaClient();
  const shouldDisconnect = !prisma;

  try {
    const mediaList = await collectAnilistMedia(limit);
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
