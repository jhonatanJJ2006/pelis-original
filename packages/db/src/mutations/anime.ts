import { z } from 'zod';
import { prisma } from '../client';
import { notifyChange } from '../realtime';
import { register } from '../registry';
import { getProvidersSortedByPriority } from '../lib/anime-providers';
import { slugifyTitle } from '../lib/anilist';

const PROVIDERS = getProvidersSortedByPriority();

// Seed mínimo: animes populares que funcionan con gogoanime/zoro.
// Se ejecuta la primera vez que el usuario visita /anime y la tabla está vacía.
// Imágenes vía MyAnimeList CDN (legítimo, usado por apps de anime OSS).
const SEED_ANIME: Array<{
  title: string;
  alternativeTitle?: string;
  image: string;
  synopsis: string;
  genre: string[];
  episodes: number;
  status: 'ongoing' | 'completed';
  year: number;
  rating?: number;
  anilistId: number;
  malId?: number;
}> = [
  {
    title: 'Naruto Shippuden',
    alternativeTitle: 'ナルト 疾風伝',
    image: 'https://cdn.myanimelist.net/images/anime/1565/111305l.jpg',
    synopsis: 'Naruto regresa a Konoha tras dos años y medio de entrenamiento con Jiraiya. La organización Akatsuki empieza a moverse y los miembros de la Aldea Oculta de la Hoja deben prepararse para una guerra que amenaza al mundo shinobi.',
    genre: ['Acción', 'Aventura', 'Shonen', 'Superpoderes'],
    episodes: 500,
    status: 'completed',
    year: 2007,
    rating: 8.3,
    anilistId: 1735,
    malId: 1735,
  },
  {
    title: 'One Piece',
    alternativeTitle: 'ワンピース',
    image: 'https://cdn.myanimelist.net/images/anime/6/73245l.jpg',
    synopsis: 'Monkey D. Luffy se embarca en una aventura para encontrar el tesoro más grande del mundo, el "One Piece", y convertirse en el Rey de los Piratas. Junto a su tripulación de Sombreros de Paja, navega por la Grand Line enfrentándose a la Marina y a los Yonko.',
    genre: ['Acción', 'Aventura', 'Comedia', 'Shonen', 'Piratas'],
    episodes: 1100,
    status: 'ongoing',
    year: 1999,
    rating: 9.1,
    anilistId: 21,
    malId: 21,
  },
  {
    title: 'Demon Slayer: Kimetsu no Yaiba',
    alternativeTitle: '鬼滅の刃',
    image: 'https://cdn.myanimelist.net/images/anime/1286/99889l.jpg',
    synopsis: 'Tanjiro Kamado ve su vida destruida cuando un demonio masacra a su familia. Su hermana Nezuko sobrevive pero se convierte en demonio. Tanjiro se convierte en cazador de demonios para encontrar la cura y vengar a su familia.',
    genre: ['Acción', 'Shonen', 'Demons', 'Histórico'],
    episodes: 55,
    status: 'completed',
    year: 2019,
    rating: 8.7,
    anilistId: 101922,
    malId: 38000,
  },
  {
    title: 'Jujutsu Kaisen',
    alternativeTitle: '呪術廻戦',
    image: 'https://cdn.myanimelist.net/images/anime/1171/109222l.jpg',
    synopsis: 'Yuuji Itadori es un estudiante con habilidades físicas excepcionales. Un día, para salvar a un amigo atacado por maldiciones, se traga un dedo de Ryomen Sukuna, convirtiéndose en su anfitrión. Se une a la escuela de hechicería de Tokio.',
    genre: ['Acción', 'Shonen', 'Sobrenatural', 'Maldiciones'],
    episodes: 47,
    status: 'completed',
    year: 2020,
    rating: 8.6,
    anilistId: 113415,
    malId: 40748,
  },
  {
    title: 'Attack on Titan',
    alternativeTitle: '進撃の巨人',
    image: 'https://cdn.myanimelist.net/images/anime/10/47347l.jpg',
    synopsis: 'La humanidad vive recluida tras enormes muros para protegerse de los Titanes. Cuando un Titan colosal rompe el muro, Eren Yeager jura exterminar a todos los Titanes y unirse a las Tropas de Reconocimiento.',
    genre: ['Acción', 'Drama', 'Fantasía oscura', 'Misterio'],
    episodes: 94,
    status: 'completed',
    year: 2013,
    rating: 9.0,
    anilistId: 16498,
    malId: 16498,
  },
  {
    title: 'My Hero Academia',
    alternativeTitle: '僕のヒーローアカデミア',
    image: 'https://cdn.myanimelist.net/images/anime/10/78745l.jpg',
    synopsis: 'En un mundo donde casi todos tienen superpoderes ("Quirks"), Izuku Midoriya nace sin ninguno pero sueña con ser un héroe. Es elegido por el héroe número uno, All Might, para heredar su Quirk y asistir a la U.A.',
    genre: ['Acción', 'Shonen', 'Superhéroes', 'Colegios'],
    episodes: 138,
    status: 'completed',
    year: 2016,
    rating: 8.1,
    anilistId: 21459,
    malId: 31964,
  },
  {
    title: 'Fullmetal Alchemist: Brotherhood',
    alternativeTitle: '鋼の錬金術師',
    image: 'https://cdn.myanimelist.net/images/anime/1208/94745l.jpg',
    synopsis: 'Los hermanos Edward y Alphonse Elric usan la alquimia prohibida para resucitar a su madre. El precio es devastador: Edward pierde un brazo y una pierna, y Alphonse pierde todo su cuerpo. Buscan la Piedra Filosofal para restaurar sus cuerpos.',
    genre: ['Acción', 'Aventura', 'Drama', 'Fantasía'],
    episodes: 64,
    status: 'completed',
    year: 2009,
    rating: 9.2,
    anilistId: 5114,
    malId: 5114,
  },
  {
    title: 'Spy x Family',
    alternativeTitle: 'スパイファミリー',
    image: 'https://cdn.myanimelist.net/images/anime/1441/139629l.jpg',
    synopsis: 'Un espía debe construir una familia falsa para cumplir una misión. Sin saberlo, su "esposa" es una asesina y su "hija" es una telépata. Los tres intentan mantener su tapadera mientras se encariñan genuinamente.',
    genre: ['Acción', 'Comedia', 'Shonen', 'Familia'],
    episodes: 37,
    status: 'ongoing',
    year: 2022,
    rating: 8.6,
    anilistId: 140960,
    malId: 50265,
  },
  {
    title: 'Death Note',
    alternativeTitle: 'デスノート',
    image: 'https://cdn.myanimelist.net/images/anime/9/9453l.jpg',
    synopsis: 'Light Yagami encuentra un cuaderno sobrenatural que mata a cualquiera cuyo nombre sea escrito en él. Con el alias "Kira", intenta crear un mundo sin crimen, pero el detective L se propone detenerlo.',
    genre: ['Suspenso', 'Psicológico', 'Sobrenatural'],
    episodes: 37,
    status: 'completed',
    year: 2006,
    rating: 8.9,
    anilistId: 1535,
    malId: 1535,
  },
  {
    title: 'Dragon Ball Z',
    alternativeTitle: 'ドラゴンボールZ',
    image: 'https://cdn.myanimelist.net/images/anime/1601/140276l.jpg',
    synopsis: 'Goku y sus amigos defienden la Tierra contra enemigos cada vez más poderosos: Vegeta, Freezer, Cell y Majin Buu. Las batallas se vuelven legendarias mientras los Saiyajin superan sus límites con los Super Saiyajin.',
    genre: ['Acción', 'Aventura', 'Shonen', 'Artes marciales'],
    episodes: 291,
    status: 'completed',
    year: 1989,
    rating: 8.7,
    anilistId: 813,
    malId: 813,
  },
  {
    title: 'Bleach',
    alternativeTitle: 'ブリーチ',
    image: 'https://cdn.myanimelist.net/images/anime/3/40451l.jpg',
    synopsis: 'Ichigo Kurosaki obtiene los poderes de un Shinigami (Dios de la Muerte) y se ve inmerso en el mundo espiritual. Debe proteger a los humanos de los Hollows malignos mientras descubre su propio destino.',
    genre: ['Acción', 'Shonen', 'Sobrenatural', 'Artes marciales'],
    episodes: 366,
    status: 'ongoing',
    year: 2004,
    rating: 8.0,
    anilistId: 269,
    malId: 269,
  },
  {
    title: 'Chainsaw Man',
    alternativeTitle: 'チェンソーマン',
    image: 'https://cdn.myanimelist.net/images/anime/1806/126216l.jpg',
    synopsis: 'Denji es un joven que fusiona su cuerpo con su demonio mascota Pochita para convertirse en Chainsaw Man. Se une a los cazadores de demonios públicos para vivir una vida normal y pagar sus deudas.',
    genre: ['Acción', 'Shonen', 'Sobrenatural', 'Gore'],
    episodes: 12,
    status: 'completed',
    year: 2022,
    rating: 8.5,
    anilistId: 127230,
    malId: 44511,
  },
  {
    title: 'Solo Leveling',
    alternativeTitle: '俺だけレベルアップな件',
    image: 'https://cdn.myanimelist.net/images/anime/1926/141089l.jpg',
    synopsis: 'En un mundo donde los cazadores con poderes mágicos luchan contra monstruos en dungeons, Sung Jinwoo es el cazador más débil hasta que descubre un sistema secreto que solo a él le permite subir de nivel.',
    genre: ['Acción', 'Fantasía', 'Aventura'],
    episodes: 25,
    status: 'completed',
    year: 2024,
    rating: 8.2,
    anilistId: 151807,
    malId: 52299,
  },
  {
    title: 'Tokyo Ghoul',
    alternativeTitle: '東京喰種',
    image: 'https://cdn.myanimelist.net/images/anime/5/71749l.jpg',
    synopsis: 'Kaneki Ken es un estudiante universitario que se convierte en un ghoul (criatura que se alimenta de humanos) después de un encuentro casi mortal. Debe navegar entre el mundo humano y el de los ghouls.',
    genre: ['Acción', 'Horror', 'Psicológico', 'Sobrenatural'],
    episodes: 48,
    status: 'completed',
    year: 2014,
    rating: 7.7,
    anilistId: 20605,
    malId: 22319,
  },
  {
    title: 'Hunter x Hunter',
    alternativeTitle: 'ハンターハンター',
    image: 'https://cdn.myanimelist.net/images/anime/1337/99013l.jpg',
    synopsis: 'Gon Freecss descubre que su padre, al que nunca conoció, es un Hunter legendario. Para encontrarlo, Gon se convierte en Hunter y vive aventuras con sus amigos Killua, Kurapika y Leorio.',
    genre: ['Acción', 'Aventura', 'Shonen'],
    episodes: 148,
    status: 'completed',
    year: 2011,
    rating: 9.0,
    anilistId: 11061,
    malId: 11061,
  },
];

export const seed = register({
  kind: 'mutation',
  name: 'anime.seed',
  writes: ['anime'],
  args: z.object({}).optional(),
  handler: async () => {
    const existing = await prisma.anime.count();
    if (existing > 0) return { count: existing, seeded: 0 };
    const defaultProviders = PROVIDERS.slice(0, 2).map((p) => ({
      name: p.name,
      url: `${p.baseUrl}/`,
      language: p.language === 'sub/dub' ? 'sub' : p.language,
      isActive: true,
    }));
    let seeded = 0;
    for (const a of SEED_ANIME) {
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
          providers: defaultProviders as object,
        },
      });
      seeded++;
    }
    await notifyChange('anime', 'insert', 'seed');
    return { count: seeded, seeded };
  },
});

const AnimeCreate = z.object({
  title: z.string(),
  alternativeTitle: z.string().optional(),
  image: z.string(),
  synopsis: z.string(),
  genre: z.array(z.string()),
  episodes: z.number(),
  status: z.enum(['ongoing', 'completed']),
  year: z.number(),
  rating: z.number().optional(),
  providers: z.array(
    z.object({
      name: z.string(),
      url: z.string(),
      language: z.enum(['sub', 'dub', 'esp']),
      isActive: z.boolean(),
    }),
  ),
});

export const create = register({
  kind: 'mutation',
  name: 'anime.create',
  writes: ['anime'],
  args: AnimeCreate,
  handler: async (_ctx, args) => {
    const anime = await prisma.anime.create({
      data: {
        title: args.title,
        alternativeTitle: args.alternativeTitle ?? null,
        image: args.image,
        synopsis: args.synopsis,
        genre: args.genre,
        episodes: args.episodes,
        status: args.status === 'ongoing' ? 'ONGOING' : 'COMPLETED',
        year: args.year,
        rating: args.rating ?? null,
        providers: args.providers as object,
      },
    });
    await notifyChange('anime', 'insert', anime.id);
    return anime.id;
  },
});

export const update = register({
  kind: 'mutation',
  name: 'anime.update',
  writes: ['anime'],
  args: AnimeCreate.extend({ id: z.string() }),
  handler: async (_ctx, args) => {
    const { id, ...rest } = args;
    await prisma.anime.update({
      where: { id },
      data: {
        title: rest.title,
        alternativeTitle: rest.alternativeTitle ?? null,
        image: rest.image,
        synopsis: rest.synopsis,
        genre: rest.genre,
        episodes: rest.episodes,
        status: rest.status === 'ongoing' ? 'ONGOING' : 'COMPLETED',
        year: rest.year,
        rating: rest.rating ?? null,
        providers: rest.providers as object,
      },
    });
    await notifyChange('anime', 'update', id);
    return id;
  },
});

export const remove = register({
  kind: 'mutation',
  name: 'anime.remove',
  writes: ['anime'],
  args: z.object({ id: z.string() }),
  handler: async (_ctx, { id }) => {
    await prisma.anime.delete({ where: { id } });
    await notifyChange('anime', 'delete', id);
    return id;
  },
});