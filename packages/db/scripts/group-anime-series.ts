/**
 * Deduplicate the anime catalog and group seasons into single series.
 *
 * Two problems are fixed in one pass:
 *   1. Legacy rows imported without an `anilistId` collide with AniList imports
 *      (e.g. two "Attack on Titan", one with 25 episodes and one with 87).
 *   2. AniList publishes every season as its own media entry, so franchises are
 *      scattered across many catalog cards.
 *
 * Usage:
 *   pnpm --filter @pelis/db group:anime            # apply changes
 *   pnpm --filter @pelis/db group:anime -- --dry   # report only
 */
import { PrismaClient } from '@prisma/client';
import type { Anime } from '@prisma/client';
import {
  fetchAnilistWithRelations,
  searchAnilist,
  pickAnilistTitle,
  type AnilistMediaWithRelations,
} from '../src/lib/anilist.js';
import {
  SERIES_RELATION_TYPES,
  UnionFind,
  deriveSeasonLabel,
  fallbackSeriesKey,
  isFranchisePrefix,
  isSeasonalFormat,
  normalizeSeriesTitle,
  parseSeasonNumberFromTitle,
  slugify,
  sortSeasons,
} from '../src/lib/anime-series.js';

const prisma = new PrismaClient();
const DRY_RUN = process.argv.includes('--dry');

function log(...args: unknown[]) {
  console.log(...args);
}

/** Prefer the row with real artwork and richer metadata when merging duplicates. */
function scoreRow(a: Anime): number {
  let score = 0;
  if (a.anilistId) score += 100;
  if (a.imageId) score += 20;
  if (a.backdropImage || a.backdropImageId) score += 10;
  if (a.synopsis.length > 100) score += 5;
  if (a.genre.length > 0) score += 3;
  if (a.episodes > 0) score += 2;
  return score;
}

/**
 * Step 1 — resolve legacy rows that have no `anilistId`.
 *
 * If AniList maps the row onto a title already in the catalog it is a true
 * duplicate and gets removed (keeping any local artwork the survivor lacks).
 * Otherwise the row is enriched in place with its external ids.
 */
async function resolveLegacyRows(): Promise<{ merged: number; enriched: number; unresolved: string[] }> {
  const legacy = await prisma.anime.findMany({ where: { anilistId: null }, orderBy: { title: 'asc' } });
  log(`\n=== Paso 1: ${legacy.length} registros sin anilistId ===`);

  let merged = 0;
  let enriched = 0;
  const unresolved: string[] = [];

  for (const row of legacy) {
    let matches: Awaited<ReturnType<typeof searchAnilist>> = [];
    try {
      matches = await searchAnilist(row.title, row.year);
    } catch (err) {
      log(`  ! AniList falló para "${row.title}": ${(err as Error).message}`);
      unresolved.push(row.title);
      continue;
    }

    const normalized = normalizeSeriesTitle(row.title).toLowerCase();
    const titlesOf = (m: (typeof matches)[number]) =>
      [m.title.english, m.title.romaji, m.title.native]
        .filter((t): t is string => Boolean(t))
        .map((t) => normalizeSeriesTitle(t).toLowerCase());

    const catalogAnilistIds = new Set(
      (await prisma.anime.findMany({ where: { anilistId: { not: null } }, select: { anilistId: true } }))
        .map((r) => r.anilistId)
        .filter((v): v is number => v !== null),
    );

    // Rank candidates instead of taking the first hit: a search for
    // "Naruto Shippuden" returns the movie before the series.
    const scoreMatch = (m: (typeof matches)[number]): number => {
      const titles = titlesOf(m);
      let score = 0;
      if (titles.includes(normalized)) score += 100;
      else if (titles.some((t) => t.startsWith(normalized) || normalized.startsWith(t))) score += 40;

      const format = (m.format ?? 'TV').toUpperCase();
      // A legacy row with many episodes is a series, never a movie.
      if (row.episodes > 1 && format === 'MOVIE') score -= 60;
      if (row.episodes > 1 && (format === 'TV' || format === 'ONA')) score += 25;
      if (catalogAnilistIds.has(m.id)) score += 30;
      if (m.seasonYear) score -= Math.min(Math.abs(m.seasonYear - row.year), 20);
      return score;
    };

    const match = [...matches].sort((a, b) => scoreMatch(b) - scoreMatch(a))[0];

    if (!match) {
      log(`  ? Sin match en AniList: "${row.title}"`);
      unresolved.push(row.title);
      continue;
    }

    const existing = await prisma.anime.findUnique({ where: { anilistId: match.id } });

    if (existing && existing.id !== row.id) {
      const winner = scoreRow(existing) >= scoreRow(row) ? existing : row;
      const loser = winner.id === existing.id ? row : existing;

      log(
        `  → Fusionando "${row.title}" (${row.episodes} eps) en "${existing.title}" ` +
          `[AniList ${match.id}] · conservo ${winner.id === existing.id ? 'AniList' : 'legacy'}`,
      );

      if (!DRY_RUN) {
        // Keep locally uploaded artwork if the survivor has none.
        const patch: Record<string, unknown> = {};
        if (!existing.imageId && loser.imageId) {
          patch.image = loser.image;
          patch.imageId = loser.imageId;
        }
        if (!existing.backdropImage && !existing.backdropImageId) {
          if (loser.backdropImage) patch.backdropImage = loser.backdropImage;
          if (loser.backdropImageId) patch.backdropImageId = loser.backdropImageId;
        }
        if (existing.synopsis.length < 40 && loser.synopsis.length > existing.synopsis.length) {
          patch.synopsis = loser.synopsis;
        }
        if (Object.keys(patch).length > 0) {
          await prisma.anime.update({ where: { id: existing.id }, data: patch });
        }
        await prisma.anime.delete({ where: { id: row.id } });
      }
      merged += 1;
      continue;
    }

    log(`  + Vinculando "${row.title}" → AniList ${match.id} (${pickAnilistTitle(match)})`);
    if (!DRY_RUN) {
      await prisma.anime.update({
        where: { id: row.id },
        data: {
          anilistId: match.id,
          malId: match.idMal ?? null,
          format: match.format ?? null,
        },
      });
    }
    enriched += 1;

    // Stay polite with AniList's rate limit.
    await new Promise((resolve) => setTimeout(resolve, 800));
  }

  return { merged, enriched, unresolved };
}

/**
 * Step 2 — build franchises from AniList relations and write series columns.
 */
async function groupSeries(): Promise<{ series: number; grouped: number }> {
  const rows = await prisma.anime.findMany({ orderBy: { title: 'asc' } });
  const withAnilist = rows.filter((r): r is Anime & { anilistId: number } => r.anilistId !== null);

  log(`\n=== Paso 2: agrupando ${rows.length} animes (${withAnilist.length} con AniList) ===`);

  let media: AnilistMediaWithRelations[] = [];
  try {
    media = await fetchAnilistWithRelations(withAnilist.map((r) => r.anilistId));
  } catch (err) {
    log(`  ! No se pudieron leer relaciones de AniList: ${(err as Error).message}`);
    log('  → Se agrupará solo por título normalizado.');
  }

  const mediaById = new Map(media.map((m) => [m.id, m]));
  const rowByAnilistId = new Map(withAnilist.map((r) => [r.anilistId, r]));
  const inCatalog = new Set(withAnilist.map((r) => r.anilistId));

  const uf = new UnionFind();

  // Relations only connect entries that already exist in the catalog, so a
  // franchise never pulls in titles the user has not imported.
  for (const m of media) {
    const row = rowByAnilistId.get(m.id);
    if (!row) continue;
    for (const relation of m.relations) {
      if (!SERIES_RELATION_TYPES.has(relation.relationType)) continue;
      if (relation.type && relation.type !== 'ANIME') continue;
      if (!inCatalog.has(relation.id)) continue;
      const other = rowByAnilistId.get(relation.id);
      if (other) uf.union(row.id, other.id);
    }
  }

  // Titles that share a normalized name belong together even without relations.
  const byFallbackKey = new Map<string, string[]>();
  for (const row of rows) {
    const key = fallbackSeriesKey(row.title);
    const bucket = byFallbackKey.get(key);
    if (bucket) bucket.push(row.id);
    else byFallbackKey.set(key, [row.id]);
  }
  for (const ids of byFallbackKey.values()) {
    for (let i = 1; i < ids.length; i += 1) uf.union(ids[0]!, ids[i]!);
  }

  // A franchise chain breaks when an intermediate entry (a recap movie, say) is
  // missing from the catalog, leaving "HAIKYU!! TO THE TOP" orphaned from
  // "HAIKYU!!". Reconnect those by franchise name prefix.
  const baseTitles = [...new Set(rows.map((r) => normalizeSeriesTitle(r.title)))].sort(
    (a, b) => a.length - b.length,
  );
  const rowIdByBaseTitle = new Map<string, string>();
  for (const row of rows) {
    const key = normalizeSeriesTitle(row.title);
    if (!rowIdByBaseTitle.has(key)) rowIdByBaseTitle.set(key, row.id);
  }
  for (const row of rows) {
    const own = normalizeSeriesTitle(row.title);
    // Longest matching base wins, so sub-franchises stay with their closest parent.
    const base = [...baseTitles].reverse().find((t) => t !== own && isFranchisePrefix(t, own));
    const baseRowId = base ? rowIdByBaseTitle.get(base) : undefined;
    if (baseRowId) uf.union(baseRowId, row.id);
  }

  const rowById = new Map(rows.map((r) => [r.id, r]));
  const groups = uf.groups(rows.map((r) => r.id));

  const usedKeys = new Set<string>();
  let seriesCount = 0;
  let groupedCount = 0;

  for (const memberIds of groups.values()) {
    const members = memberIds
      .map((id) => rowById.get(id))
      .filter((r): r is Anime => Boolean(r))
      .map((r) => ({
        ...r,
        startDate: r.anilistId ? mediaById.get(r.anilistId)?.startDate ?? null : null,
        format: r.format ?? (r.anilistId ? mediaById.get(r.anilistId)?.format ?? null : null),
      }));

    const ordered = sortSeasons(members);
    const base = ordered[0];
    if (!base) continue;

    // The franchise title comes from the earliest entry, minus season suffixes.
    const seriesTitle = normalizeSeriesTitle(base.title);
    let seriesKey = slugify(seriesTitle);
    if (!seriesKey) seriesKey = slugify(base.title) || base.id;
    // Two unrelated franchises can normalize to the same slug; keep them apart.
    if (usedKeys.has(seriesKey)) seriesKey = `${seriesKey}-${base.anilistId ?? base.id.slice(0, 6)}`;
    usedKeys.add(seriesKey);

    let seasonCursor = 0;
    if (ordered.length > 1) groupedCount += ordered.length;
    seriesCount += 1;

    const planned = ordered.map((member) => {
      const seasonal = isSeasonalFormat(member.format);
      if (seasonal) seasonCursor += 1;
      const seasonNumber = seasonal
        ? (parseSeasonNumberFromTitle(member.title) ?? seasonCursor)
        : null;
      return {
        member,
        seasonNumber,
        label: deriveSeasonLabel({
          title: member.title,
          seriesTitle,
          format: member.format,
          seasonNumber,
        }),
      };
    });

    // Remakes ("Hunter x Hunter" 1999 and 2011) would otherwise both read
    // "Temporada 1"; the release year is what actually tells them apart.
    const labelCounts = new Map<string, number>();
    for (const entry of planned) {
      labelCounts.set(entry.label, (labelCounts.get(entry.label) ?? 0) + 1);
    }
    for (const entry of planned) {
      if ((labelCounts.get(entry.label) ?? 0) > 1) {
        entry.label = `${entry.label} (${entry.member.year})`;
      }
    }

    for (const { member, seasonNumber, label: seasonLabel } of planned) {
      if (!DRY_RUN) {
        await prisma.anime.update({
          where: { id: member.id },
          data: {
            seriesKey,
            seriesTitle,
            seasonNumber,
            seasonLabel,
            isSeriesMain: member.id === base.id,
            format: member.format ?? null,
          },
        });
      }
    }

    if (ordered.length > 1) {
      log(
        `  ${seriesTitle} [${seriesKey}] → ${ordered.length} entradas: ` +
          planned.map((p) => p.label).join(', '),
      );
    }
  }

  return { series: seriesCount, grouped: groupedCount };
}

async function main() {
  if (DRY_RUN) log('MODO SIMULACIÓN: no se escribirá nada en la base de datos.\n');

  const before = await prisma.anime.count();
  const legacy = await resolveLegacyRows();
  const grouping = await groupSeries();
  const after = await prisma.anime.count();

  log('\n=== Resumen ===');
  log(`Animes antes:        ${before}`);
  log(`Duplicados fusionados: ${legacy.merged}`);
  log(`Vinculados a AniList:  ${legacy.enriched}`);
  log(`Animes después:      ${after}`);
  log(`Series resultantes:  ${grouping.series}`);
  log(`Entradas en series con más de una temporada: ${grouping.grouped}`);
  if (legacy.unresolved.length > 0) {
    log(`Sin resolver: ${legacy.unresolved.join(', ')}`);
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
