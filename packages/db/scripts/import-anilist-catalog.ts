/**
 * Import anime titles from AniList into Postgres.
 *
 * Existing rows with the same anilistId are skipped. Nothing is updated or deleted.
 *
 * Usage:
 *   pnpm --filter @pelis/db import:anilist -- --limit 200
 *   pnpm --filter @pelis/db import:anilist -- --limit 2000
 */
import { PrismaClient } from '@prisma/client';
import { clampAnilistImportLimit, runAnilistImport } from '../src/lib/anilist-import.js';

const prisma = new PrismaClient();

function parseLimit(): number {
  const idx = process.argv.indexOf('--limit');
  if (idx === -1) return clampAnilistImportLimit(undefined);
  return clampAnilistImportLimit(Number(process.argv[idx + 1]));
}

async function main() {
  const limit = parseLimit();
  console.log(`Importando hasta ${limit} animes desde AniList...`);
  const result = await runAnilistImport(limit, prisma);
  console.log(
    `Listo: ${result.imported} importados, ${result.skipped} omitidos (${result.total} procesados).`
  );
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
