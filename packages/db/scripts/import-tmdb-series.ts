/**
 * Import TV series into the public catalog (movie.mediaType = SERIES).
 *
 * /series and the home "Series" row read only those Movie rows. Admin
 * "Nueva serie" writes the separate `series` table; this command copies
 * those rows across when the token is new, then optionally adds TMDB titles.
 *
 * Additive only:
 * - inserts movie rows that do not already use that token
 * - skips existing films and series (does not convert a movie into a series)
 * - does not update or delete users, subscriptions, movies, or series
 * - does not truncate
 *
 * Usage (from a machine whose DATABASE_URL is the database you mean):
 *   pnpm --filter @pelis/db import:tmdb-series -- --limit 40
 *
 * Env (names only; values stay in the local .env):
 *   DATABASE_URL   required by Prisma
 *   TMDB_API_KEY   optional. Without it, only the admin series mirror runs.
 */
import { PrismaClient } from '@prisma/client';
import { clampTmdbSeriesLimit } from '../src/lib/tmdb-series-catalog.js';
import {
  importPopularTmdbSeries,
  mirrorAdminSeriesToMovies,
} from '../src/lib/tmdb-series-import.js';

const prisma = new PrismaClient();

function parseLimit(): number {
  const idx = process.argv.indexOf('--limit');
  if (idx === -1) return clampTmdbSeriesLimit(undefined);
  return clampTmdbSeriesLimit(Number(process.argv[idx + 1]));
}

async function main() {
  const limit = parseLimit();
  const mirrored = await mirrorAdminSeriesToMovies(prisma);
  console.log(
    `Admin series → movie: ${mirrored.imported} nuevas, ${mirrored.skipped} ya existían (${mirrored.total} en tabla series).`
  );

  const apiKey = process.env.TMDB_API_KEY?.trim();
  if (!apiKey) {
    console.log('TMDB_API_KEY no está definida. No se consultó TMDB. Nada se borró.');
    return;
  }

  console.log(`Importando hasta ${limit} series populares de TMDB hacia movie.mediaType=SERIES...`);
  const result = await importPopularTmdbSeries(prisma, limit, apiKey);
  console.log(
    `TMDB: ${result.imported} nuevas, ${result.skipped} omitidas (${result.total} candidatas). Nada se actualizó ni se borró.`
  );
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
