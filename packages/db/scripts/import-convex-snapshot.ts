/**
 * Import a Convex snapshot ZIP into local Postgres.
 *
 * Usage:
 *   pnpm --filter @pelis/db import:convex -- /path/to/snapshot.zip
 */
import { execFile } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';
import { PrismaClient } from '@prisma/client';
import {
  mapAccount,
  mapAnime,
  mapFavorite,
  mapHistory,
  mapMovie,
  mapPlan,
  mapSeries,
  mapSession,
  mapSubscription,
  mapTvChannel,
  mapTvPlaylist,
  mapUsers,
} from './convex-import/mappers.js';
import { chunk, readJsonlIfExists } from './convex-import/read-jsonl.js';
import {
  collectReferencedStorageIds,
  importStorageFiles,
} from './convex-import/storage.js';

const execFileAsync = promisify(execFile);
const prisma = new PrismaClient();
const BATCH_SIZE = 500;

type CountCheck = {
  label: string;
  expected: number;
  actual: number;
};

async function extractZip(zipPath: string, destDir: string): Promise<void> {
  await execFileAsync('unzip', ['-q', '-o', zipPath, '-d', destDir]);
}

async function wipeDatabase(): Promise<void> {
  await prisma.$executeRawUnsafe(`
    TRUNCATE TABLE
      "history",
      "favorite",
      "subscription",
      "movie",
      "series",
      "anime",
      "tv_channel",
      "tv_playlist",
      "plan",
      "session",
      "account",
      "verification",
      "user"
    RESTART IDENTITY CASCADE
  `);
}

async function importBatch<T>(
  label: string,
  rows: T[],
  insert: (batch: T[]) => Promise<{ count: number }>,
  skipped = 0,
): Promise<number> {
  if (rows.length === 0) {
    console.log(`  ${label}: 0 (empty)`);
    return 0;
  }
  let imported = 0;
  for (const batch of chunk(rows, BATCH_SIZE)) {
    const result = await insert(batch);
    imported += result.count;
  }
  const skipNote = skipped > 0 ? ` (${skipped} skipped — invalid FK)` : '';
  console.log(`  ${label}: ${imported}${skipNote}`);
  return imported;
}

function printCheck({ label, expected, actual }: CountCheck): void {
  const ok = expected === actual;
  console.log(`  ${label}: expected ${expected}, imported ${actual} ${ok ? '✓' : '✗'}`);
}

async function verifyForeignKeys(): Promise<void> {
  const [orphanFavorites, orphanHistory, orphanSubscriptions] = await Promise.all([
    prisma.$queryRaw<[{ count: bigint }]>`
      SELECT COUNT(*)::bigint AS count FROM "favorite" f
      LEFT JOIN "user" u ON u.id = f."userId"
      LEFT JOIN "movie" m ON m.id = f."movieId"
      WHERE u.id IS NULL OR m.id IS NULL
    `,
    prisma.$queryRaw<[{ count: bigint }]>`
      SELECT COUNT(*)::bigint AS count FROM "history" h
      LEFT JOIN "user" u ON u.id = h."userId"
      LEFT JOIN "movie" m ON m.id = h."movieId"
      WHERE u.id IS NULL OR m.id IS NULL
    `,
    prisma.$queryRaw<[{ count: bigint }]>`
      SELECT COUNT(*)::bigint AS count FROM "subscription" s
      LEFT JOIN "user" u ON u.id = s."userId"
      LEFT JOIN "plan" p ON p.id = s."planId"
      WHERE u.id IS NULL OR p.id IS NULL
    `,
  ]);

  const fav = Number(orphanFavorites[0]?.count ?? 0);
  const hist = Number(orphanHistory[0]?.count ?? 0);
  const subs = Number(orphanSubscriptions[0]?.count ?? 0);

  console.log('\nFK sanity:');
  console.log(`  orphan favorites: ${fav} ${fav === 0 ? '✓' : '✗'}`);
  console.log(`  orphan history: ${hist} ${hist === 0 ? '✓' : '✗'}`);
  console.log(`  orphan subscriptions: ${subs} ${subs === 0 ? '✓' : '✗'}`);
}

async function main() {
  const args = process.argv.slice(2).filter((arg) => arg !== '--');
  const zipPath = args[0];
  if (!zipPath) {
    console.error('Usage: tsx scripts/import-convex-snapshot.ts <snapshot.zip>');
    process.exit(1);
  }

  const extractDir = await mkdtemp(join(tmpdir(), 'convex-import-'));
  console.log(`Extracting ${zipPath} → ${extractDir}`);
  await extractZip(zipPath, extractDir);

  const [
    plansRaw,
    baUsersRaw,
    domainUsersRaw,
    accountsRaw,
    sessionsRaw,
    moviesRaw,
    animeRaw,
    seriesRaw,
    tvPlaylistsRaw,
    tvChannelsRaw,
    subscriptionsRaw,
    favoritesRaw,
    historyRaw,
  ] = await Promise.all([
    readJsonlIfExists(extractDir, 'plans/documents.jsonl'),
    readJsonlIfExists(extractDir, '_components/betterAuth/user/documents.jsonl'),
    readJsonlIfExists(extractDir, 'users/documents.jsonl'),
    readJsonlIfExists(extractDir, '_components/betterAuth/account/documents.jsonl'),
    readJsonlIfExists(extractDir, '_components/betterAuth/session/documents.jsonl'),
    readJsonlIfExists(extractDir, 'movies/documents.jsonl'),
    readJsonlIfExists(extractDir, 'anime/documents.jsonl'),
    readJsonlIfExists(extractDir, 'series/documents.jsonl'),
    readJsonlIfExists(extractDir, 'tvPlaylists/documents.jsonl'),
    readJsonlIfExists(extractDir, 'tvChannels/documents.jsonl'),
    readJsonlIfExists(extractDir, 'subscriptions/documents.jsonl'),
    readJsonlIfExists(extractDir, 'favorites/documents.jsonl'),
    readJsonlIfExists(extractDir, 'history/documents.jsonl'),
  ]);

  console.log('\nWiping existing Postgres data...');
  await wipeDatabase();

  console.log('\nImporting tables...');
  const plans = plansRaw.map(mapPlan);
  const users = mapUsers(baUsersRaw, domainUsersRaw);
  const accounts = accountsRaw.map(mapAccount);
  const sessions = sessionsRaw.map(mapSession);
  const movies = moviesRaw.map(mapMovie);
  const anime = animeRaw.map(mapAnime);
  const series = seriesRaw.map(mapSeries);
  const tvPlaylists = tvPlaylistsRaw.map(mapTvPlaylist);
  const tvChannels = tvChannelsRaw.map(mapTvChannel);
  const userIds = new Set(users.map((u) => u.id));
  const movieIds = new Set(movies.map((m) => m.id));
  const planIds = new Set(plans.map((p) => p.id));

  const subscriptions = subscriptionsRaw
    .map(mapSubscription)
    .filter((row) => userIds.has(row.userId) && planIds.has(row.planId));
  const favorites = favoritesRaw
    .map(mapFavorite)
    .filter((row) => userIds.has(row.userId) && movieIds.has(row.movieId));
  const history = historyRaw
    .map(mapHistory)
    .filter((row) => userIds.has(row.userId) && movieIds.has(row.movieId));

  const skipped = {
    subscriptions: subscriptionsRaw.length - subscriptions.length,
    favorites: favoritesRaw.length - favorites.length,
    history: historyRaw.length - history.length,
  };

  const imported = {
    plans: await importBatch('plans', plans, (batch) => prisma.plan.createMany({ data: batch })),
    users: await importBatch('users', users, (batch) => prisma.user.createMany({ data: batch })),
    accounts: await importBatch('accounts', accounts, (batch) =>
      prisma.account.createMany({ data: batch }),
    ),
    sessions: await importBatch('sessions', sessions, (batch) =>
      prisma.session.createMany({ data: batch }),
    ),
    movies: await importBatch('movies', movies, (batch) => prisma.movie.createMany({ data: batch })),
    anime: await importBatch('anime', anime, (batch) => prisma.anime.createMany({ data: batch })),
    series: await importBatch('series', series, (batch) => prisma.series.createMany({ data: batch })),
    tvPlaylists: await importBatch('tvPlaylists', tvPlaylists, (batch) =>
      prisma.tVPlaylist.createMany({ data: batch }),
    ),
    tvChannels: await importBatch('tvChannels', tvChannels, (batch) =>
      prisma.tVChannel.createMany({ data: batch }),
    ),
    subscriptions: await importBatch(
      'subscriptions',
      subscriptions,
      (batch) => prisma.subscription.createMany({ data: batch }),
      skipped.subscriptions,
    ),
    favorites: await importBatch(
      'favorites',
      favorites,
      (batch) => prisma.favorite.createMany({ data: batch }),
      skipped.favorites,
    ),
    history: await importBatch(
      'history',
      history,
      (batch) => prisma.history.createMany({ data: batch }),
      skipped.history,
    ),
  };

  const referencedStorageIds = collectReferencedStorageIds(
    [...moviesRaw, ...animeRaw, ...seriesRaw],
    ['imageId', 'backdropImageId'],
  );

  console.log('\nImporting storage files...');
  const storageResult = await importStorageFiles(extractDir, referencedStorageIds);
  console.log(
    `  storage: expected ${storageResult.expected}, copied ${storageResult.copied}, skipped ${storageResult.skipped}`,
  );
  if (storageResult.missing.length > 0) {
    console.warn(
      `  ⚠ ${storageResult.missing.length} referenced storage files missing from backup`,
    );
  }

  console.log('\nVerification:');
  printCheck({ label: 'plans', expected: plansRaw.length, actual: imported.plans });
  printCheck({ label: 'users', expected: baUsersRaw.length, actual: imported.users });
  printCheck({ label: 'accounts', expected: accountsRaw.length, actual: imported.accounts });
  printCheck({ label: 'sessions', expected: sessionsRaw.length, actual: imported.sessions });
  printCheck({ label: 'movies', expected: moviesRaw.length, actual: imported.movies });
  printCheck({ label: 'anime', expected: animeRaw.length, actual: imported.anime });
  printCheck({ label: 'series', expected: seriesRaw.length, actual: imported.series });
  printCheck({ label: 'tvPlaylists', expected: tvPlaylistsRaw.length, actual: imported.tvPlaylists });
  printCheck({ label: 'tvChannels', expected: tvChannelsRaw.length, actual: imported.tvChannels });
  printCheck({
    label: 'subscriptions',
    expected: subscriptionsRaw.length - skipped.subscriptions,
    actual: imported.subscriptions,
  });
  printCheck({
    label: 'favorites',
    expected: favoritesRaw.length - skipped.favorites,
    actual: imported.favorites,
  });
  printCheck({
    label: 'history',
    expected: historyRaw.length - skipped.history,
    actual: imported.history,
  });

  await verifyForeignKeys();

  await rm(extractDir, { recursive: true, force: true });
  console.log('\nDone.');
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
