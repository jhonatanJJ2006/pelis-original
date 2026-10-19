import { describe, expect, it } from 'vitest';
import { toAnimeShape, toMovieShape } from './shapes';

describe('título original en el shape', () => {
  it('la película muestra el título normalizado y conserva el guardado', () => {
    const shaped = toMovieShape({
      id: 'm1',
      name: 'COCAINE BEAR / OSO INTOXICADO',
      image: '/peliculas/x.webp',
      mediaType: 'MOVIE',
    });
    expect(shaped.name).toBe('Cocaine Bear / Oso Intoxicado');
    expect(shaped.sourceName).toBe('COCAINE BEAR / OSO INTOXICADO');
  });

  it('un título ya mixto no se reescribe', () => {
    const shaped = toMovieShape({
      id: 'm2',
      name: 'Kung Fu Panda 3',
      image: '/peliculas/x.webp',
      mediaType: 'MOVIE',
    });
    expect(shaped.name).toBe('Kung Fu Panda 3');
    expect(shaped.sourceName).toBe('Kung Fu Panda 3');
  });

  it('el anime conserva el título guardado junto al de pantalla', () => {
    const shaped = toAnimeShape({
      id: 'a1',
      title: 'JUJUTSU KAISEN 0',
      status: 'COMPLETED',
    });
    expect(shaped.title).toBe('Jujutsu Kaisen 0');
    expect(shaped.sourceTitle).toBe('JUJUTSU KAISEN 0');
  });
});
