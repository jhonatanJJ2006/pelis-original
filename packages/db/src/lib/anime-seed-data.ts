/**
 * Starter anime catalog, shared by the runtime seed (`anime.seed`) and the CLI
 * seed script.
 *
 * Every entry MUST carry an `anilistId`. It is the key used to deduplicate the
 * catalog, to group seasons and to resolve episodes and streams; rows without it
 * end up as duplicates of the AniList imports (which is exactly what happened
 * when these two seeds held separate, id-less copies of the same titles).
 */

export interface AnimeSeedEntry {
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
  format?: string;
}

export const ANIME_SEED: AnimeSeedEntry[] = [
  {
    title: 'Naruto Shippuden',
    alternativeTitle: 'ナルト 疾風伝',
    image: 'https://cdn.myanimelist.net/images/anime/1565/111305l.jpg',
    synopsis:
      'Naruto regresa a Konoha tras dos años y medio de entrenamiento con Jiraiya. La organización Akatsuki empieza a moverse y los miembros de la Aldea Oculta de la Hoja deben prepararse para una guerra que amenaza al mundo shinobi.',
    genre: ['Acción', 'Aventura', 'Shonen', 'Superpoderes'],
    episodes: 500,
    status: 'completed',
    year: 2007,
    rating: 8.3,
    anilistId: 1735,
    malId: 1735,
    format: 'TV',
  },
  {
    title: 'One Piece',
    alternativeTitle: 'ワンピース',
    image: 'https://cdn.myanimelist.net/images/anime/6/73245l.jpg',
    synopsis:
      'Monkey D. Luffy se embarca en una aventura para encontrar el tesoro más grande del mundo, el "One Piece", y convertirse en el Rey de los Piratas. Junto a su tripulación de Sombreros de Paja, navega por la Grand Line enfrentándose a la Marina y a los Yonko.',
    genre: ['Acción', 'Aventura', 'Comedia', 'Shonen', 'Piratas'],
    episodes: 1100,
    status: 'ongoing',
    year: 1999,
    rating: 9.1,
    anilistId: 21,
    malId: 21,
    format: 'TV',
  },
  {
    title: 'Demon Slayer: Kimetsu no Yaiba',
    alternativeTitle: '鬼滅の刃',
    image: 'https://cdn.myanimelist.net/images/anime/1286/99889l.jpg',
    synopsis:
      'Tanjiro Kamado ve su vida destruida cuando un demonio masacra a su familia. Su hermana Nezuko sobrevive pero se convierte en demonio. Tanjiro se convierte en cazador de demonios para encontrar la cura y vengar a su familia.',
    genre: ['Acción', 'Shonen', 'Demons', 'Histórico'],
    episodes: 26,
    status: 'completed',
    year: 2019,
    rating: 8.7,
    anilistId: 101922,
    malId: 38000,
    format: 'TV',
  },
  {
    title: 'Jujutsu Kaisen',
    alternativeTitle: '呪術廻戦',
    image: 'https://cdn.myanimelist.net/images/anime/1171/109222l.jpg',
    synopsis:
      'Yuuji Itadori es un estudiante con habilidades físicas excepcionales. Un día, para salvar a un amigo atacado por maldiciones, se traga un dedo de Ryomen Sukuna, convirtiéndose en su anfitrión. Se une a la escuela de hechicería de Tokio.',
    genre: ['Acción', 'Shonen', 'Sobrenatural', 'Maldiciones'],
    episodes: 24,
    status: 'completed',
    year: 2020,
    rating: 8.6,
    anilistId: 113415,
    malId: 40748,
    format: 'TV',
  },
  {
    title: 'Attack on Titan',
    alternativeTitle: '進撃の巨人',
    image: 'https://cdn.myanimelist.net/images/anime/10/47347l.jpg',
    synopsis:
      'La humanidad vive recluida tras enormes muros para protegerse de los Titanes. Cuando un Titan colosal rompe el muro, Eren Yeager jura exterminar a todos los Titanes y unirse a las Tropas de Reconocimiento.',
    genre: ['Acción', 'Drama', 'Fantasía oscura', 'Misterio'],
    episodes: 25,
    status: 'completed',
    year: 2013,
    rating: 9.0,
    anilistId: 16498,
    malId: 16498,
    format: 'TV',
  },
  {
    title: 'My Hero Academia',
    alternativeTitle: '僕のヒーローアカデミア',
    image: 'https://cdn.myanimelist.net/images/anime/10/78745l.jpg',
    synopsis:
      'En un mundo donde casi todos tienen superpoderes ("Quirks"), Izuku Midoriya nace sin ninguno pero sueña con ser un héroe. Es elegido por el héroe número uno, All Might, para heredar su Quirk y asistir a la U.A.',
    genre: ['Acción', 'Shonen', 'Superhéroes', 'Colegios'],
    episodes: 13,
    status: 'completed',
    year: 2016,
    rating: 8.1,
    anilistId: 21459,
    malId: 31964,
    format: 'TV',
  },
  {
    title: 'Fullmetal Alchemist: Brotherhood',
    alternativeTitle: '鋼の錬金術師',
    image: 'https://cdn.myanimelist.net/images/anime/1208/94745l.jpg',
    synopsis:
      'Los hermanos Edward y Alphonse Elric usan la alquimia prohibida para resucitar a su madre. El precio es devastador: Edward pierde un brazo y una pierna, y Alphonse pierde todo su cuerpo. Buscan la Piedra Filosofal para restaurar sus cuerpos.',
    genre: ['Acción', 'Aventura', 'Drama', 'Fantasía'],
    episodes: 64,
    status: 'completed',
    year: 2009,
    rating: 9.2,
    anilistId: 5114,
    malId: 5114,
    format: 'TV',
  },
  {
    title: 'Spy x Family',
    alternativeTitle: 'スパイファミリー',
    image: 'https://cdn.myanimelist.net/images/anime/1441/139629l.jpg',
    synopsis:
      'Un espía debe construir una familia falsa para cumplir una misión. Sin saberlo, su "esposa" es una asesina y su "hija" es una telépata. Los tres intentan mantener su tapadera mientras se encariñan genuinamente.',
    genre: ['Acción', 'Comedia', 'Shonen', 'Familia'],
    episodes: 12,
    status: 'completed',
    year: 2022,
    rating: 8.6,
    anilistId: 140960,
    malId: 50265,
    format: 'TV',
  },
  {
    title: 'Death Note',
    alternativeTitle: 'デスノート',
    image: 'https://cdn.myanimelist.net/images/anime/9/9453l.jpg',
    synopsis:
      'Light Yagami encuentra un cuaderno sobrenatural que mata a cualquiera cuyo nombre sea escrito en él. Con el alias "Kira", intenta crear un mundo sin crimen, pero el detective L se propone detenerlo.',
    genre: ['Suspenso', 'Psicológico', 'Sobrenatural'],
    episodes: 37,
    status: 'completed',
    year: 2006,
    rating: 8.9,
    anilistId: 1535,
    malId: 1535,
    format: 'TV',
  },
  {
    title: 'Dragon Ball Z',
    alternativeTitle: 'ドラゴンボールZ',
    image: 'https://cdn.myanimelist.net/images/anime/1601/140276l.jpg',
    synopsis:
      'Goku y sus amigos defienden la Tierra contra enemigos cada vez más poderosos: Vegeta, Freezer, Cell y Majin Buu. Las batallas se vuelven legendarias mientras los Saiyajin superan sus límites con los Super Saiyajin.',
    genre: ['Acción', 'Aventura', 'Shonen', 'Artes marciales'],
    episodes: 291,
    status: 'completed',
    year: 1989,
    rating: 8.7,
    anilistId: 813,
    malId: 813,
    format: 'TV',
  },
  {
    title: 'Bleach',
    alternativeTitle: 'ブリーチ',
    image: 'https://cdn.myanimelist.net/images/anime/3/40451l.jpg',
    synopsis:
      'Ichigo Kurosaki obtiene los poderes de un Shinigami (Dios de la Muerte) y se ve inmerso en el mundo espiritual. Debe proteger a los humanos de los Hollows malignos mientras descubre su propio destino.',
    genre: ['Acción', 'Shonen', 'Sobrenatural', 'Artes marciales'],
    episodes: 366,
    status: 'completed',
    year: 2004,
    rating: 8.0,
    anilistId: 269,
    malId: 269,
    format: 'TV',
  },
  {
    title: 'Chainsaw Man',
    alternativeTitle: 'チェンソーマン',
    image: 'https://cdn.myanimelist.net/images/anime/1806/126216l.jpg',
    synopsis:
      'Denji es un joven que fusiona su cuerpo con su demonio mascota Pochita para convertirse en Chainsaw Man. Se une a los cazadores de demonios públicos para vivir una vida normal y pagar sus deudas.',
    genre: ['Acción', 'Shonen', 'Sobrenatural', 'Gore'],
    episodes: 12,
    status: 'completed',
    year: 2022,
    rating: 8.5,
    anilistId: 127230,
    malId: 44511,
    format: 'TV',
  },
  {
    title: 'Solo Leveling',
    alternativeTitle: '俺だけレベルアップな件',
    image: 'https://cdn.myanimelist.net/images/anime/1926/141089l.jpg',
    synopsis:
      'En un mundo donde los cazadores con poderes mágicos luchan contra monstruos en dungeons, Sung Jinwoo es el cazador más débil hasta que descubre un sistema secreto que solo a él le permite subir de nivel.',
    genre: ['Acción', 'Fantasía', 'Aventura'],
    episodes: 12,
    status: 'completed',
    year: 2024,
    rating: 8.2,
    anilistId: 151807,
    malId: 52299,
    format: 'TV',
  },
  {
    title: 'Tokyo Ghoul',
    alternativeTitle: '東京喰種',
    image: 'https://cdn.myanimelist.net/images/anime/5/71749l.jpg',
    synopsis:
      'Kaneki Ken es un estudiante universitario que se convierte en un ghoul (criatura que se alimenta de humanos) después de un encuentro casi mortal. Debe navegar entre el mundo humano y el de los ghouls.',
    genre: ['Acción', 'Horror', 'Psicológico', 'Sobrenatural'],
    episodes: 12,
    status: 'completed',
    year: 2014,
    rating: 7.7,
    anilistId: 20605,
    malId: 22319,
    format: 'TV',
  },
  {
    title: 'Hunter x Hunter',
    alternativeTitle: 'ハンターハンター',
    image: 'https://cdn.myanimelist.net/images/anime/1337/99013l.jpg',
    synopsis:
      'Gon Freecss descubre que su padre, al que nunca conoció, es un Hunter legendario. Para encontrarlo, Gon se convierte en Hunter y vive aventuras con sus amigos Killua, Kurapika y Leorio.',
    genre: ['Acción', 'Aventura', 'Shonen'],
    episodes: 148,
    status: 'completed',
    year: 2011,
    rating: 9.0,
    anilistId: 11061,
    malId: 11061,
    format: 'TV',
  },
  {
    title: 'Sword Art Online',
    alternativeTitle: 'ソードアート・オンライン',
    image: 'https://cdn.myanimelist.net/images/anime/11/39717l.jpg',
    synopsis:
      'Los jugadores de un MMORPG de realidad virtual quedan atrapados dentro del juego: morir en él significa morir de verdad. Kirito debe llegar al piso 100 del Aincrad para liberar a todos.',
    genre: ['Acción', 'Aventura', 'Fantasía', 'Romance'],
    episodes: 25,
    status: 'completed',
    year: 2012,
    rating: 7.5,
    anilistId: 11757,
    malId: 11757,
    format: 'TV',
  },
];
