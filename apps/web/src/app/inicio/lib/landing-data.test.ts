import { describe, expect, it } from 'vitest';
import { buildPosterCollage, formatPlanPrice, isRenderableImage, pickPlans } from './landing-data';

describe('landing /inicio', () => {
  it('collage: sin duplicados ni vacíos y con límite', () => {
    const out = buildPosterCollage(
      [
        { src: '/peliculas/a.webp', alt: 'A' },
        { src: '/peliculas/a.webp', alt: 'A bis' },
        { src: '', alt: 'vacío' },
        { src: 'http://inseguro/x.jpg', alt: 'http' },
        { src: 'https://image.tmdb.org/t/p/w500/b.jpg', alt: 'B' },
        { src: '/peliculas/c.webp', alt: 'C' },
      ],
      2
    );
    expect(out.map((p) => p.alt)).toEqual(['A', 'B']);
  });

  it('planes ordenados por precio, máximo 3', () => {
    const plans = pickPlans([
      { _id: 'p', name: 'Premium', price: 19.99, features: [], months: 1 },
      { _id: 'b', name: 'Básico', price: 6.99, features: [], months: 1 },
      { _id: 'e', name: 'Estándar', price: 13.99, features: [], months: 1 },
      { _id: 'x', name: 'Extra', price: 29.99, features: [], months: 1 },
    ]);
    expect(plans.map((p) => p.name)).toEqual(['Básico', 'Estándar', 'Premium']);
  });

  it('solo imágenes locales o de hosts permitidos', () => {
    expect(isRenderableImage('/peliculas/a.webp')).toBe(true);
    expect(isRenderableImage('https://s4.anilist.co/file/x.jpg')).toBe(true);
    expect(isRenderableImage('https://foo.convex.cloud/x.jpg')).toBe(false);
    expect(isRenderableImage('//evil.example/x.jpg')).toBe(false);
    expect(isRenderableImage(undefined)).toBe(false);
  });

  it('precio legible', () => {
    expect(formatPlanPrice({ price: 6.99, months: 1 })).toBe('$6.99 al mes');
    expect(formatPlanPrice({ price: 30, months: 3 })).toBe('$30.00 cada 3 meses');
  });
});
