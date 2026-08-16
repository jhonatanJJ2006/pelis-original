#!/usr/bin/env node
/**
 * Auditoría de imágenes de Películas.
 *
 * Lee cada `Movie.image` de la BD y comprueba si el archivo existe en
 * `apps/web/public/peliculas/`. NO modifica nada. Imprime un resumen.
 */

import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PrismaClient } from '@prisma/client';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const PELICULAS_DIR = resolve(ROOT, 'apps', 'web', 'public', 'peliculas');
const UPLOADS_DIR = resolve(ROOT, 'apps', 'web', 'public', 'uploads');

const prisma = new PrismaClient();

function basename(p) {
  return p.split('/').pop() ?? '';
}

async function main() {
  const movies = await prisma.movie.findMany({
    select: { id: true, name: true, token: true, image: true, imageId: true },
    orderBy: { name: 'asc' },
  });

  const total = movies.length;
  let ok = 0;
  let missing = 0;
  let hasImageId = 0;
  const missingRows = [];

  for (const m of movies) {
    let exists = false;
    if (m.image.startsWith('/peliculas/')) {
      const file = basename(m.image);
      exists = existsSync(resolve(PELICULAS_DIR, file));
    } else if (m.image.startsWith('/uploads/')) {
      const file = basename(m.image);
      exists = existsSync(resolve(UPLOADS_DIR, file));
    } else if (/^https?:\/\//i.test(m.image)) {
      exists = false; // sin red en este script, asumimos rota
    }
    if (m.imageId) hasImageId++;
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
      });
    }
  }

  console.log('─'.repeat(72));
  console.log(`Total películas en BD:        ${total}`);
  console.log(`Imagen OK (archivo existe):   ${ok} (${Math.round((ok / total) * 100)}%)`);
  console.log(`Imagen rota:                  ${missing} (${Math.round((missing / total) * 100)}%)`);
  console.log(`Con imageId (upload):         ${hasImageId}`);
  console.log('─'.repeat(72));
  console.log('');
  console.log(`Primeras 30 imágenes rotas:`);
  for (const r of missingRows.slice(0, 30)) {
    console.log(`  • [${r.token || '?'}] ${r.name}`);
    console.log(`      image=${r.image}  imageId=${r.imageId ?? '∅'}`);
  }
  if (missingRows.length > 30) {
    console.log(`  … y ${missingRows.length - 30} más.`);
  }

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});