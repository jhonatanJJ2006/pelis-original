/**
 * One-shot seed script — populates the local Postgres DB with:
 *   - adminPlans (default plans)
 *   - anime (seed from packages/convex/src/anime.ts)
 *   - tvChannels (popular seed from packages/convex/src/seedPopularChannels.ts)
 *
 * Movies are normally uploaded via the admin UI, but the historical
 * 600+ movies from _analisis_sql/sql_src can be imported too — see
 * `import-legacy-sql.ts`.
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const ANIME_SEED: Array<{
  title: string;
  alternativeTitle: string;
  synopsis: string;
  genre: string[];
  episodes: number;
  status: 'ongoing' | 'completed';
  year: number;
  rating: number;
  image: string;
}> = [
  {
    title: 'Attack on Titan',
    alternativeTitle: 'Shingeki no Kyojin',
    synopsis: 'En un mundo donde la humanidad vive dentro de ciudades amuralladas para protegerse de los Titanes...',
    genre: ['Acción', 'Drama', 'Fantasía', 'Sobrenatural'],
    episodes: 87,
    status: 'completed',
    year: 2013,
    rating: 9.0,
    image: 'https://cdn.myanimelist.net/images/anime/10/47347.jpg',
  },
  {
    title: 'One Piece',
    alternativeTitle: 'Wan Pike:',
    synopsis: 'Monkey D. Luffy...',
    genre: ['Acción', 'Aventura', 'Comedia', 'Drama'],
    episodes: 1100,
    status: 'ongoing',
    year: 1999,
    rating: 8.7,
    image: 'https://cdn.myanimelist.net/images/anime/6/73245.jpg',
  },
  {
    title: 'Demon Slayer',
    alternativeTitle: 'Kimetsu no Yaiba',
    synopsis: 'Tanjiro Kamado...',
    genre: ['Acción', 'Aventura', 'Drama', 'Sobrenatural'],
    episodes: 63,
    status: 'ongoing',
    year: 2019,
    rating: 8.9,
    image: 'https://cdn.myanimelist.net/images/anime/1286/99889.jpg',
  },
  {
    title: 'My Hero Academia',
    alternativeTitle: 'Boku no Hero Academia',
    synopsis: 'En un mundo donde la mayoría de la gente posee superpoderes...',
    genre: ['Acción', 'Comedia', 'Drama', 'Superpoderes'],
    episodes: 138,
    status: 'ongoing',
    year: 2016,
    rating: 8.3,
    image: 'https://cdn.myanimelist.net/images/anime/10/78745.jpg',
  },
  {
    title: 'Naruto Shippuden',
    alternativeTitle: 'Naruto Shippūden',
    synopsis: 'Naruto Uzumaki regresa...',
    genre: ['Acción', 'Aventura', 'Drama', 'Artes Marciales'],
    episodes: 500,
    status: 'completed',
    year: 2007,
    rating: 8.3,
    image: 'https://cdn.myanimelist.net/images/anime/5/17407.jpg',
  },
  {
    title: 'Dragon Ball Z',
    alternativeTitle: 'Doragon Bōru Zetto',
    synopsis: 'Goku, ahora adulto...',
    genre: ['Acción', 'Aventura', 'Comedia', 'Ciencia Ficción'],
    episodes: 291,
    status: 'completed',
    year: 1989,
    rating: 8.2,
    image: 'https://cdn.myanimelist.net/images/anime/1607/117271.jpg',
  },
  {
    title: 'Fullmetal Alchemist: Brotherhood',
    alternativeTitle: 'Hagane no Renkinjutsushi',
    synopsis: 'Los hermanos Edward y Alphonse Elric...',
    genre: ['Acción', 'Aventura', 'Drama', 'Fantasía'],
    episodes: 64,
    status: 'completed',
    year: 2009,
    rating: 9.1,
    image: 'https://cdn.myanimelist.net/images/anime/1223/96541.jpg',
  },
  {
    title: 'Death Note',
    alternativeTitle: 'Desu Nōto',
    synopsis: 'Light Yagami...',
    genre: ['Drama', 'Misterio', 'Psicológico', 'Sobrenatural'],
    episodes: 37,
    status: 'completed',
    year: 2006,
    rating: 8.6,
    image: 'https://cdn.myanimelist.net/images/anime/9/9453.jpg',
  },
  {
    title: 'Jujutsu Kaisen',
    alternativeTitle: 'Sorcery Fight',
    synopsis: 'Yuji Itadori...',
    genre: ['Acción', 'Drama', 'Sobrenatural', 'Fantasía'],
    episodes: 48,
    status: 'ongoing',
    year: 2020,
    rating: 8.7,
    image: 'https://cdn.myanimelist.net/images/anime/1171/109222.jpg',
  },
  {
    title: 'Chainsaw Man',
    alternativeTitle: 'Chensō Man',
    synopsis: 'Denji...',
    genre: ['Acción', 'Comedia', 'Drama', 'Sobrenatural'],
    episodes: 12,
    status: 'completed',
    year: 2022,
    rating: 8.6,
    image: 'https://cdn.myanimelist.net/images/anime/1806/126216.jpg',
  },
  {
    title: 'Sword Art Online',
    alternativeTitle: 'Sōdo Āto Onrain',
    synopsis: 'Miles de jugadores...',
    genre: ['Acción', 'Aventura', 'Ciencia Ficción', 'Romance'],
    episodes: 97,
    status: 'completed',
    year: 2012,
    rating: 7.5,
    image: 'https://cdn.myanimelist.net/images/anime/11/39717.jpg',
  },
  {
    title: 'Spy x Family',
    alternativeTitle: 'Supai Famirī',
    synopsis: 'Un espía, un asesino y un niño telépata...',
    genre: ['Acción', 'Comedia', 'Drama', 'Slice of Life'],
    episodes: 37,
    status: 'ongoing',
    year: 2022,
    rating: 8.5,
    image: 'https://cdn.myanimelist.net/images/anime/1441/122753.jpg',
  },
];

const PROVIDERS = [
  { id: 'gogoanime', name: 'GogoAnime', baseUrl: 'https://gogoanime.cl', language: 'sub' as const },
  { id: 'zoro', name: 'Zoro', baseUrl: 'https://zoro.to', language: 'sub' as const },
  { id: 'animepahe', name: 'AnimePahe', baseUrl: 'https://animepahe.ru', language: 'sub' as const },
];

async function seedPlans() {
  const plans = [
    {
      name: 'Mensual',
      price: 5.99,
      description: 'Acceso completo durante 1 mes',
      features: ['Catálogo completo', 'Calidad HD', '1 dispositivo', 'Sin anuncios'],
      icon: 'Zap',
      months: 1,
    },
    {
      name: 'Trimestral',
      price: 14.99,
      description: 'Acceso completo durante 3 meses',
      features: ['Catálogo completo', 'Calidad HD', '2 dispositivos', 'Sin anuncios', 'Ahorra 16%'],
      icon: 'Star',
      months: 3,
      recommended: true,
    },
    {
      name: 'Anual',
      price: 49.99,
      description: 'Acceso completo durante 12 meses',
      features: ['Catálogo completo', 'Calidad 4K', '4 dispositivos', 'Sin anuncios', 'Ahorra 30%', 'Descargas offline'],
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
    await prisma.anime.create({
      data: {
        title: a.title,
        alternativeTitle: a.alternativeTitle,
        image: a.image,
        synopsis: a.synopsis,
        genre: a.genre,
        episodes: a.episodes,
        status: a.status === 'ongoing' ? 'ONGOING' : 'COMPLETED',
        year: a.year,
        rating: a.rating,
        providers: PROVIDERS.map((p) => ({
          name: p.name,
          url: `${p.baseUrl}/search/${encodeURIComponent(a.title.toLowerCase().replace(/\s+/g, '-'))}`,
          language: p.language,
          isActive: true,
        })),
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