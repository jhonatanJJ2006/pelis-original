import { describe, expect, it, vi } from 'vitest';

vi.mock('./client', () => ({ prisma: {} }));

import { invoke, InvokeError } from './invoke';
import { movieCreateSchema, movieUpdateSchema } from './lib/movie-payload';
import { register } from './registry';

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

const ctx = { userId: null, isAdmin: false };

register({
  kind: 'mutation',
  name: 'test.movies.create',
  writes: ['movie'],
  args: movieCreateSchema,
  handler: async (_ctx, args) => args,
});

register({
  kind: 'mutation',
  name: 'test.movies.update',
  writes: ['movie'],
  args: movieUpdateSchema,
  handler: async (_ctx, args) => args,
});

describe('invoke + movieSchema', () => {
  it('rechaza create inválido con 400 y detalle de campos', async () => {
    try {
      await invoke({
        name: 'test.movies.create',
        args: { name: 'Dune', image: 'dune.jpg', synopsis: 'Corta' },
        ctx,
      });
      expect.fail('debía lanzar InvokeError');
    } catch (err) {
      expect(err).toBeInstanceOf(InvokeError);
      const inv = err as InvokeError;
      expect(inv.status).toBe(400);
      expect(inv.message).toContain('Invalid args for "test.movies.create"');
      expect(inv.message).toMatch(/image|synopsis|genre|token/);
    }
  });

  it('acepta create válido y llega al handler', async () => {
    const data = await invoke({
      name: 'test.movies.create',
      args: { ...validMovie, videoUrl: '', mediaType: 'movie' },
      ctx,
    });
    expect(data).toMatchObject({ name: validMovie.name, image: validMovie.image });
  });

  it('rechaza update sin id', async () => {
    try {
      await invoke({ name: 'test.movies.update', args: validMovie, ctx });
      expect.fail('debía lanzar InvokeError');
    } catch (err) {
      expect(err).toBeInstanceOf(InvokeError);
      expect((err as InvokeError).status).toBe(400);
      expect((err as InvokeError).message).toContain('id');
    }
  });

  it('acepta update válido', async () => {
    const data = await invoke({
      name: 'test.movies.update',
      args: { ...validMovie, id: 'mov_1' },
      ctx,
    });
    expect(data).toMatchObject({ id: 'mov_1', name: validMovie.name });
  });
});
