#!/usr/bin/env node
/**
 * Migración de image paths en BD.
 *
 * Reglas:
 *   1. Si `image` apunta a una URL antigua de Convex (uncommon-dolphin…):
 *      → reescribir a PLACEHOLDER_IMAGE (/peliculas/placeholder.webp).
 *      Si la película tiene imageId válido → usar /uploads/<imageId>.webp.
 *   2. Si `image` apunta a /peliculas/<file>.webp y el archivo NO existe:
 *      → usar /uploads/<imageId>.webp si imageId existe en disco, si no placeholder.
 *   3. Si `imageId` apunta a un archivo que NO existe en disco:
 *      → limpiar imageId (dejar el image anterior).
 *
 * Opciones:
 *   --dry-run      Solo reporta, no escribe
 *   --apply        Ejecuta las correcciones
 *
 * Uso:
 *   node scripts/migrate-image-paths.mjs --dry-run
 *   node scripts/migrate-image-paths.mjs --apply
 */

import { existsSync, readdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PrismaClient } from '@prisma/client';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const PELICULAS_DIR = resolve(ROOT, 'apps', 'web', 'public', 'peliculas');
const UPLOADS_DIR = resolve(ROOT, 'apps', 'web', 'public', 'uploads');

const PLACEHOLDER = '/peliculas/placeholder.webp';

const args = new Set(process.argv.slice(2));
const APPLY = args.has('--apply');

const prisma = new PrismaClient();

function basename(p) {
  return p.split('/').pop() ?? '';
}

function isConvexLegacyUrl(url) {
  return /^https?:\/\/(uncommon-dolphin|\w+\.convex\.cloud)\/api\/storage\//i.test(url);
}

async function main() {
  const uploadFiles = new Set(readdirSync(UPLOADS_DIR));

  const movies = await prisma.movie.findMany({
    select: { id: true, name: true, image: true, imageId: true },
    orderBy: { name: 'asc' },
  });

  const actions = [];
  let skipped = 0;

  for (const m of movies) {
    const changes = {};

    // 1. URL legacy de Convex
    if (isConvexLegacyUrl(m.image)) {
      if (m.imageId && uploadFiles.has(`${m.imageId}.webp`)) {
        changes.image = `/uploads/${m.imageId}.webp`;
      } else {
        changes.image = PLACEHOLDER;
      }
    }

    // 2. /peliculas/<file>.webp sin archivo en disco
    if (m.image.startsWith('/peliculas/') && m.image.endsWith('.webp')) {
      const file = basename(m.image);
      const exists = existsSync(resolve(PELICULAS_DIR, file));
      if (!exists) {
        if (m.imageId && uploadFiles.has(`${m.imageId}.webp`)) {
          changes.image = `/uploads/${m.imageId}.webp`;
        } else {
          changes.image = PLACEHOLDER;
        }
      }
    }

    // 3. imageId apunta a archivo inexistente
    if (m.imageId && !uploadFiles.has(`${m.imageId}.webp`)) {
      changes.imageId = null;
    }

    if (Object.keys(changes).length === 0) {
      skipped++;
      continue;
    }

    actions.push({ id: m.id, name: m.name, from: m.image, to: changes });
  }

  console.log(`Total películas:               ${movies.length}`);
  console.log(`Sin cambios:                   ${skipped}`);
  console.log(`Con cambios pendientes:        ${actions.length}`);
  console.log(`Modo:                          ${APPLY ? 'APLICAR' : 'DRY-RUN'}`);
  console.log('');

  for (const a of actions.slice(0, 50)) {
    console.log(`  • [${a.id.slice(0, 8)}] ${a.name}`);
    console.log(`      ${a.from}  →  ${JSON.stringify(a.to)}`);
  }
  if (actions.length > 50) {
    console.log(`  … y ${actions.length - 50} más.`);
  }
  console.log('');

  if (!APPLY) {
    console.log('No se aplicaron cambios. Vuelve a correr con --apply para confirmar.');
  } else {
    let updated = 0;
    for (const a of actions) {
      await prisma.movie.update({
        where: { id: a.id },
        data: a.to,
      });
      updated++;
    }
    console.log(`✓ ${updated} películas actualizadas.`);
  }

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});