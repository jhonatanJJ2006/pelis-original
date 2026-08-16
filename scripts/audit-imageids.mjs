#!/usr/bin/env node
/**
 * Auditoría específica de `imageId` → /uploads/<imageId>.webp
 */

import { existsSync, readdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PrismaClient } from '@prisma/client';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const UPLOADS_DIR = resolve(ROOT, 'apps', 'web', 'public', 'uploads');

const prisma = new PrismaClient();

async function main() {
  const files = new Set(readdirSync(UPLOADS_DIR));
  const movies = await prisma.movie.findMany({
    where: { imageId: { not: null } },
    select: { id: true, name: true, token: true, image: true, imageId: true },
  });

  let ok = 0;
  let missing = 0;
  const missingRows = [];

  for (const m of movies) {
    const expected = `${m.imageId}.webp`;
    const exists = files.has(expected);
    if (exists) {
      ok++;
    } else {
      missing++;
      missingRows.push({
        id: m.id,
        name: m.name,
        token: m.token,
        image: m.image,
        imageId: m.imageId,
        expectedFile: expected,
      });
    }
  }

  console.log(`Películas con imageId:        ${movies.length}`);
  console.log(`imageId → archivo existe:     ${ok}`);
  console.log(`imageId → archivo FALTA:      ${missing}`);
  console.log('');
  console.log('Primeras 20 con imageId roto:');
  for (const r of missingRows.slice(0, 20)) {
    console.log(`  • [${r.token || '?'}] ${r.name}`);
    console.log(`      image=${r.image}`);
    console.log(`      imageId=${r.imageId}  expectedFile=${r.expectedFile}`);
  }
  if (missingRows.length > 20) {
    console.log(`  … y ${missingRows.length - 20} más.`);
  }

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});