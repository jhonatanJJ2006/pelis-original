/**
 * Import ~200 anime titles from AniList into Postgres.
 *
 * Usage:
 *   pnpm --filter @pelis/db import:anilist -- --limit 200
 */
import { PrismaClient } from '@prisma/client';
import { runAnilistImport } from '../src/lib/anilist-import.js';

const prisma = new PrismaClient();

function parseLimit(): number {
  const idx = process.argv.indexOf('--limit');
  if (idx === -1) return 200;
  const value = Number(process.argv[idx + 1]);
  return Number.isFinite(value) && value > 0 ? value : 200;
}

async function main() {
  const limit = parseLimit();
  console.log(`Importando hasta ${limit} animes desde AniList...`);
  const result = await runAnilistImport(limit, prisma);
  console.log(`Listo: ${result.imported} importados, ${result.skipped} omitidos (${result.total} procesados).`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
