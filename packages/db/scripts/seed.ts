/**
 * One-shot seed script — populates the local Postgres DB with:
 *   - adminPlans (default plans)
 *   - anime (shared starter catalog, see src/lib/anime-seed-data.ts)
 *   - tvChannels (popular seed from packages/convex/src/seedPopularChannels.ts)
 *
 * Movies are normally uploaded via the admin UI, but the historical
 * 600+ movies from _analisis_sql/sql_src can be imported too — see
 * `import-legacy-sql.ts`.
 */
import { PrismaClient } from '@prisma/client';
import { getProvidersSortedByPriority } from '../src/lib/anime-providers.js';
import { ANIME_SEED } from '../src/lib/anime-seed-data.js';
import { deriveSeriesFields } from '../src/lib/anime-series.js';
import { slugifyTitle } from '../src/lib/anilist.js';

const prisma = new PrismaClient();
const PROVIDERS = getProvidersSortedByPriority();

async function seedPlans() {
  const plans = [
    {
      name: 'Mensual',
      price: 5.99,
      description: 'Acceso completo durante 1 mes',
      features: [
        'Catálogo completo',
        'Calidad HD',
        '1 dispositivo',
        'Sin anuncios',
        'Subtítulos: Español, English',
        'Tipos: SRT, VTT',
        'Pistas de audio: Español, Original',
      ],
      icon: 'Zap',
      months: 1,
    },
    {
      name: 'Trimestral',
      price: 14.99,
      description: 'Acceso completo durante 3 meses',
      features: [
        'Catálogo completo',
        'Calidad HD',
        '2 dispositivos',
        'Sin anuncios',
        'Ahorra 16%',
        'Subtítulos: Español, English, Português',
        'Tipos: SRT, VTT, CC',
        'Pistas de audio: Español, English, Original',
      ],
      icon: 'Star',
      months: 3,
      recommended: true,
    },
    {
      name: 'Anual',
      price: 49.99,
      description: 'Acceso completo durante 12 meses',
      features: [
        'Catálogo completo',
        'Calidad 4K',
        '4 dispositivos',
        'Sin anuncios',
        'Ahorra 30%',
        'Descargas offline',
        'Subtítulos: Español, English, Português, 日本語, Français',
        'Tipos: SRT, VTT, CC, Forzados, ASS/karaoke',
        'Pistas de audio: Español, English, Japonés, Original',
      ],
      icon: 'Rocket',
      months: 12,
    },
  ];
  for (const plan of plans) {
    await prisma.plan.upsert({
      where: { id: `seed-${plan.name.toLowerCase()}` },
      create: { id: `seed-${plan.name.toLowerCase()}`, ...plan },
      update: plan,
    });
  }
  console.log(`✓ Plans: ${plans.length}`);
}

async function seedAnime() {
  const existing = await prisma.anime.count();
  if (existing > 0) {
    console.log(`✓ Anime: ${existing} already exist, skipping`);
    return;
  }
  for (const a of ANIME_SEED) {
    const series = deriveSeriesFields(a.title, a.format);
    const seriesMainExists = await prisma.anime.count({
      where: { seriesKey: series.seriesKey, isSeriesMain: true },
    });
    await prisma.anime.create({
      data: {
        title: a.title,
        alternativeTitle: a.alternativeTitle ?? null,
        slug: slugifyTitle(a.title),
        anilistId: a.anilistId,
        malId: a.malId ?? null,
        image: a.image,
        synopsis: a.synopsis,
        genre: a.genre,
        episodes: a.episodes,
        status: a.status === 'ongoing' ? 'ONGOING' : 'COMPLETED',
        year: a.year,
        rating: a.rating ?? null,
        providers: PROVIDERS.slice(0, 3).map((p) => ({
          name: p.name,
          url: p.baseUrl,
          language: p.language === 'sub/dub' ? 'sub' : p.language,
          isActive: true,
        })),
        ...series,
        isSeriesMain: seriesMainExists === 0,
      },
    });
  }
  console.log(`✓ Anime: ${ANIME_SEED.length} seeded`);
}

async function main() {
  console.log('Seeding local Postgres DB...');
  await seedPlans();
  await seedAnime();
  console.log('Done!');
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });