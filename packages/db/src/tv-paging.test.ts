import { describe, expect, it, vi } from 'vitest';

const { animeRows, movieFindMany } = vi.hoisted(() => {
  const animeRows = ['Naruto', 'Bleach', 'One Piece', 'Haikyuu', 'Monster'].map((title, i) => ({
    id: `a${i}`,
    title,
    seriesTitle: title,
    seriesKey: title.toLowerCase().replace(/\s+/g, '-'),
    isSeriesMain: true,
    alternativeTitle: null,
    image: `/a${i}.jpg`,
    backdropImage: null,
    synopsis: '',
    genre: i % 2 === 0 ? ['Action'] : ['Drama'],
    year: 2000 + i,
    rating: null,
    status: 'COMPLETED',
    format: 'TV',
    episodes: 12,
    seasonNumber: 1,
    seasonLabel: null,
  }));
  const movieFindMany = vi.fn(async () => [{ genre: 'Drama, Comedia' }]);
  return { animeRows, movieFindMany };
});

vi.mock('./client', () => ({
  prisma: {
    anime: { findMany: vi.fn(async () => animeRows) },
    movie: { findMany: movieFindMany },
  },
}));

import { invoke } from './invoke';
import './queries/anime';
import './queries/movies';

const ctx = { userId: null, isAdmin: false };
type Card = { title: string };

describe('paginación opcional para la app TV', () => {
  it('anime.listSeries sin limit devuelve todo (como antes)', async () => {
    const all = (await invoke({ name: 'anime.listSeries', args: {}, ctx })) as Card[];
    expect(all.map((c) => c.title)).toEqual([
      'Bleach',
      'Haikyuu',
      'Monster',
      'Naruto',
      'One Piece',
    ]);
  });

  it('anime.listSeries corta con limit/offset después de ordenar y filtrar', async () => {
    const page = (await invoke({
      name: 'anime.listSeries',
      args: { limit: 2, offset: 1 },
      ctx,
    })) as Card[];
    expect(page.map((c) => c.title)).toEqual(['Haikyuu', 'Monster']);
    const action = (await invoke({
      name: 'anime.listSeries',
      args: { genre: 'Action', limit: 2 },
      ctx,
    })) as Card[];
    expect(action.map((c) => c.title)).toEqual(['Monster', 'Naruto']);
  });

  it('movies.getGenres filtra por mediaType solo si se pide', async () => {
    await invoke({ name: 'movies.getGenres', args: { mediaType: 'movie' }, ctx });
    expect(movieFindMany).toHaveBeenLastCalledWith({
      select: { genre: true },
      where: { mediaType: 'MOVIE' },
    });
    await invoke({ name: 'movies.getGenres', args: undefined, ctx });
    expect(movieFindMany).toHaveBeenLastCalledWith({ select: { genre: true } });
  });
});
