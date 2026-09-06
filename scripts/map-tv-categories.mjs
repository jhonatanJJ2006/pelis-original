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

/** Categorías canónicas en español (UI /admin + /tv). */
const EN_TO_ES = {
  Entertainment: 'Entretenimiento',
  General: 'General',
  Undefined: 'Otros',
  Religious: 'Religión',
  News: 'Noticias',
  Sports: 'Deportes',
  Movies: 'Películas',
  Series: 'Series',
  Music: 'Música',
  Documentary: 'Documentales',
  Culture: 'Cultura',
  Education: 'Educación',
  Legislative: 'Legislativo',
  Weather: 'Clima',
  Cooking: 'Cocina',
  Travel: 'Viajes',
  Outdoor: 'Aire libre',
  Shop: 'Compras',
  Business: 'Negocios',
  Classic: 'Clásicos',
  Comedy: 'Entretenimiento',
  Family: 'Familiar',
  Lifestyle: 'Estilo de vida',
  Science: 'Ciencia',
  Auto: 'Autos',
};

function mapCategory(c) {
  if (!c) return c;
  const tags = c.split(';').map((t) => t.trim()).filter(Boolean);
  const hasKids = tags.includes('Kids');
  const hasAnime = tags.includes('Anime');
  if (hasAnime) return 'Anime';
  if (hasKids) return 'Infantil';
  if (tags.includes('Animation') && hasKids) return 'Infantil';
  if (c === 'Animation' || tags[0] === 'Animation') return 'Animación';
  if (c === 'Kids') return 'Infantil';

  // Compuestos tipo "News;Business" → primera etiqueta mapeable
  for (const tag of tags) {
    if (EN_TO_ES[tag]) return EN_TO_ES[tag];
  }
  if (c.startsWith('Comedy')) return 'Entretenimiento';
  if (c.startsWith('Music')) return 'Música';
  if (EN_TO_ES[c]) return EN_TO_ES[c];
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