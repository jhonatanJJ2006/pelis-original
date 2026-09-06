import { describe, expect, it } from 'vitest';
import {
  movieCreateSchema,
  movieUpdateSchema,
  seriesCreateSchema,
  seriesUpdateSchema,
} from './movie-payload';

const validMovie = {
  name: 'Dune: Parte Dos',
  image: '/posters/dune.jpg',
  synopsis: 'Paul Atreides se une a los Fremen para vengar a su familia.',
  genre: 'Ciencia ficción',
  token: 'dune-2024',
  actors: 'Timothée Chalamet, Zendaya',
  classification: 'PG-13',
  releaseYear: '2024',
};

describe('movieCreateSchema', () => {
  it('acepta un payload de película válido', () => {
    const result = movieCreateSchema.safeParse(validMovie);
    expect(result.success).toBe(true);
  });

  it('acepta imageId y backdrop opcionales del admin', () => {
    const result = movieCreateSchema.safeParse({
      ...validMovie,
      imageId: 'img_abc',
      backdropImage: 'https://cdn.example.com/dune-bg.jpg',
      backdropImageId: 'bg_abc',
      featured: true,
    });
    expect(result.success).toBe(true);
  });

  it('acepta subtitleTracks opcionales', () => {
    const result = movieCreateSchema.safeParse({
      ...validMovie,
      subtitleTracks: [{ lang: 'es', label: 'Español', path: 'playlist_vtt.m3u8' }],
    });
    expect(result.success).toBe(true);
  });

  it('rechaza sinopsis corta con mensaje de movieSchema', () => {
    const result = movieCreateSchema.safeParse({ ...validMovie, synopsis: 'Corta' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((i) => i.path.includes('synopsis'))).toBe(true);
    }
  });

  it('rechaza imagen que no es ruta ni URL', () => {
    const result = movieCreateSchema.safeParse({ ...validMovie, image: 'dune.jpg' });
    expect(result.success).toBe(false);
  });
});

describe('movieUpdateSchema', () => {
  it('exige id', () => {
    expect(movieUpdateSchema.safeParse(validMovie).success).toBe(false);
    expect(movieUpdateSchema.safeParse({ ...validMovie, id: 'mov_1' }).success).toBe(true);
  });
});

describe('seriesCreateSchema', () => {
  it('acepta ficha de serie reutilizando movieSchema', () => {
    const result = seriesCreateSchema.safeParse({ ...validMovie, season: 2, episodes: 8 });
    expect(result.success).toBe(true);
  });

  it('rechaza año inválido', () => {
    const result = seriesCreateSchema.safeParse({ ...validMovie, releaseYear: '24' });
    expect(result.success).toBe(false);
  });

  it('exige id en update', () => {
    expect(seriesUpdateSchema.safeParse(validMovie).success).toBe(false);
    expect(seriesUpdateSchema.safeParse({ ...validMovie, id: 'ser_1' }).success).toBe(true);
  });
});
