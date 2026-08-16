#!/usr/bin/env node
/**
 * Mapeo de categorías en inglés (de iptv-org) a las categorías oficiales de la app.
 *
 * Reglas:
 *   "Animation" / "Animation;Anime" / "Animation;Series"  → "Anime"
 *   "Animation;Kids" / "Kids"                              → "Infantil"
 *   "Animation" sin kids                                  → "Animación"
 *   "Animation;Comedy"                                    → "Animación"
 *   Otros se quedan igual.
 *
 * Solo canales ONLINE activos se marcan populares (opcional).
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

function mapCategory(c) {
  if (!c) return c;
  const tags = c.split(';').map((t) => t.trim());
  const hasKids = tags.includes('Kids');
  const hasAnime = tags.includes('Anime');
  if (hasAnime) return 'Anime';
  if (hasKids) return 'Infantil';
  if (c === 'Animation') return 'Animación';
  if (c === 'Kids') return 'Infantil';
  if (c === 'Comedy' || c.startsWith('Comedy')) return 'Entretenimiento';
  if (c === 'Movies') return 'Películas';
  if (c === 'Series') return 'Series';
  if (c === 'News') return 'Noticias';
  if (c === 'Sports') return 'Deportes';
  if (c === 'Music' || c.startsWith('Music')) return 'Música';
  if (c === 'Documentary') return 'Documentales';
  if (c === 'Entertainment' || c === 'General') return c;
  return c;
}

async function main() {
  const channels = await prisma.tVChannel.findMany({
    select: { id: true, name: true, category: true, streamStatus: true, isActive: true, isPopular: true },
  });

  let mapped = 0;
  let popularized = 0;
  const changes = [];

  for (const c of channels) {
    const newCat = mapCategory(c.category);
    if (newCat !== c.category) {
      changes.push({ id: c.id, name: c.name, from: c.category, to: newCat });
      mapped++;
    }
  }

  console.log(`Mapeo: ${mapped} canales con categoría a renombrar.`);
  for (const c of changes.slice(0, 30)) {
    console.log(`  • ${c.name}: ${c.from} → ${c.to}`);
  }
  if (changes.length > 30) {
    console.log(`  … y ${changes.length - 30} más.`);
  }

  // Aplicar cambios
  for (const c of changes) {
    await prisma.tVChannel.update({
      where: { id: c.id },
      data: { category: c.to },
    });
  }
  console.log(`✓ ${mapped} categorías actualizadas.`);

  // Marcar populares los ONLINE que no lo eran
  const updated = await prisma.tVChannel.updateMany({
    where: {
      isActive: true,
      streamStatus: 'ONLINE',
      isPopular: false,
      category: { in: ['Anime', 'Animación', 'Infantil'] },
    },
    data: { isPopular: true },
  });
  console.log(`✓ ${updated.count} canales anime/animación/infantil marcados populares.`);

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});