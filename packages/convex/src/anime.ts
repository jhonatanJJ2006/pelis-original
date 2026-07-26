import { v } from 'convex/values';
import { query, mutation, action } from './_generated/server';

const PROVIDERS = [
  { id: 'gogoanime', name: 'GogoAnime', baseUrl: 'https://gogoanime.cl', language: 'sub' as const },
  { id: 'zoro', name: 'Zoro', baseUrl: 'https://zoro.to', language: 'sub' as const },
  { id: 'animepahe', name: 'AnimePahe', baseUrl: 'https://animepahe.ru', language: 'sub' as const },
];

const CONSUMET_API = 'https://api.consumet.org';

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
    synopsis: 'En un mundo donde la humanidad vive dentro de ciudades amuralladas para protegerse de los Titanes, gigantes devoradores de humanos, el joven Eren Jaeger jura exterminar a todos los Titanes después de que uno destruye su hogar y mata a su madre.',
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
    synopsis: 'Monkey D. Luffy, un joven que adquiere propiedades de goma después de comer una fruta del diablo, reúne una tripulación de piratas para encontrar el tesoro legendario One Piece y convertirse en el Rey de los Piratas.',
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
    synopsis: 'Tanjiro Kamado, un joven vendedor de carbón, se convierte en un cazador de demonios después de que su familia es masacrada y su hermana Nezuko es transformada en demonio. Busca una cura para su hermana mientras protege a la humanidad.',
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
    synopsis: 'En un mundo donde la mayoría de la gente posee superpoderes llamados "Quirks", Izuku Midoriya, un niño sin poderes, sueña con convertirse en el héroe más grande de todos.',
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
    synopsis: 'Naruto Uzumaki regresa a la Aldea Oculta de la Hoja después de dos años de entrenamiento para enfrentar la organización criminal Akatsuki y salvar a su amigo Sasuke Uchiha.',
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
    synopsis: 'Goku, ahora adulto, protege la Tierra de poderosos guerreros alienígenas como Vegeta, Freezer, Cell y Majin Buu mientras descubre los secretos de su herencia Saiyajin.',
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
    synopsis: 'Los hermanos Edward y Alphonse Elric buscan la legendaria Piedra Filosofal para restaurar sus cuerpos después de un fallido intento de resucitar a su madre mediante la alquimia.',
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
    synopsis: 'Light Yagami, un estudiante brillante, descubre un cuaderno sobrenatural que le permite matar a cualquier persona escribiendo su nombre en él. Decide usarlo para eliminar criminales y crear un nuevo mundo.',
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
    synopsis: 'Yuji Itadori, un estudiante de secundaria con una fuerza increíble, se traga un dedo maldito para proteger a sus amigos y se convierte en el anfitrión de Ryomen Sukuna, el Rey de las Maldiciones.',
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
    synopsis: 'Denji, un joven cazador de demonios, se fusiona con su demonio mascota Pochita y se convierte en Chainsaw Man, un ser con la capacidad de transformar partes de su cuerpo en motosierras.',
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
    synopsis: 'Miles de jugadores quedan atrapados dentro del mundo de realidad virtual de Sword Art Online. Para escapar, deben completar los 100 pisos de Aincrad, pero morir en el juego significa morir en la vida real.',
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
    synopsis: 'Un espía, un asesino y un niño telépata forman una familia falsa para cumplir misiones secretas, pero pronto descubren que el amor genuino y los lazos familiares son más fuertes que cualquier misión.',
    genre: ['Acción', 'Comedia', 'Drama', 'Slice of Life'],
    episodes: 37,
    status: 'ongoing',
    year: 2022,
    rating: 8.5,
    image: 'https://cdn.myanimelist.net/images/anime/1441/122753.jpg',
  },
];

export const list = query({
  args: {
    genre: v.optional(v.string()),
    status: v.optional(v.union(v.literal('ongoing'), v.literal('completed'))),
    search: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let anime = await ctx.db.query('anime').collect();

    if (args.status) {
      anime = anime.filter((a) => a.status === args.status);
    }

    if (args.genre) {
      anime = anime.filter((a) => a.genre.includes(args.genre));
    }

    if (args.search) {
      const searchLower = args.search.toLowerCase();
      anime = anime.filter(
        (a) =>
          a.title.toLowerCase().includes(searchLower) ||
          a.alternativeTitle?.toLowerCase().includes(searchLower)
      );
    }

    return anime.sort((a, b) => a.title.localeCompare(b.title));
  },
});

export const getById = query({
  args: { id: v.id('anime') },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

export const getGenres = query({
  args: {},
  handler: async (ctx) => {
    const anime = await ctx.db.query('anime').collect();
    const genres = [...new Set(anime.flatMap((a) => a.genre))];
    return genres.sort();
  },
});

export const getProviders = query({
  args: {},
  handler: async () => {
    return PROVIDERS.map((p) => ({
      id: p.id,
      name: p.name,
      baseUrl: p.baseUrl,
      language: p.language,
    }));
  },
});

export const searchExternal = action({
  args: { query: v.string() },
  handler: async (_, args) => {
    const results = [];

    for (const provider of PROVIDERS) {
      try {
        const response = await fetch(
          `${CONSUMET_API}/meta/anilist/${encodeURIComponent(args.query)}?provider=${provider.id}`,
          { signal: AbortSignal.timeout(5000) }
        );
        if (response.ok) {
          const data = await response.json();
          results.push(...(data.results || []).slice(0, 5));
        }
      } catch {}
    }

    return results;
  },
});

export const getEpisodes = action({
  args: {
    animeId: v.string(),
    provider: v.string(),
    episodePage: v.optional(v.number()),
  },
  handler: async (_, args) => {
    try {
      const response = await fetch(
        `${CONSUMET_API}/meta/anilist/info/${args.animeId}?provider=${args.provider}`,
        { signal: AbortSignal.timeout(10000) }
      );

      if (!response.ok) return [];

      const data = await response.json();
      return (data.episodes || []).map((ep: any) => ({
        id: ep.id,
        number: ep.number,
        title: ep.title || `Episodio ${ep.number}`,
        image: ep.image || '',
        description: ep.description || '',
      }));
    } catch {
      return [];
    }
  },
});

export const getVideoUrl = action({
  args: {
    episodeId: v.string(),
    provider: v.string(),
  },
  handler: async (_, args) => {
    try {
      const response = await fetch(
        `${CONSUMET_API}/meta/anilist/watch/${args.episodeId}?provider=${args.provider}`,
        { signal: AbortSignal.timeout(10000) }
      );

      if (!response.ok) return { sources: [], subtitles: [] };

      const data = await response.json();
      return {
        sources: (data.sources || []).map((s: any) => ({
          url: s.url,
          quality: s.quality || 'default',
          isM3U8: s.isM3U8 ?? s.url?.includes('.m3u8'),
        })),
        subtitles: (data.subtitles || []).map((s: any) => ({
          url: s.url,
          lang: s.lang || 'English',
        })),
      };
    } catch {
      return { sources: [], subtitles: [] };
    }
  },
});

export const seed = mutation({
  args: {},
  handler: async (ctx) => {
    const existing = await ctx.db.query('anime').collect();
    if (existing.length > 0) return { count: existing.length, seeded: 0 };

    let count = 0;
    for (const anime of ANIME_SEED) {
      await ctx.db.insert('anime', {
        title: anime.title,
        alternativeTitle: anime.alternativeTitle,
        image: anime.image,
        synopsis: anime.synopsis,
        genre: anime.genre,
        episodes: anime.episodes,
        status: anime.status,
        year: anime.year,
        rating: anime.rating,
        providers: PROVIDERS.map((p) => ({
          name: p.name,
          url: `${p.baseUrl}/search/${encodeURIComponent(anime.title.toLowerCase().replace(/\s+/g, '-'))}`,
          language: p.language,
          isActive: true,
        })),
      });
      count++;
    }

    return { count, seeded: count };
  },
});
