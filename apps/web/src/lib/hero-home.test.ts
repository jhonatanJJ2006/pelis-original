import { describe, expect, it } from 'vitest';
import {
  heroBackdropSrc,
  heroDurationFromSeconds,
  heroDurationLabel,
  heroMetaLine,
  heroRequestWidth,
  heroRuntimeIds,
  heroSynopsis,
  heroTitle,
  isFeaturedTitle,
  isTooDark,
  shouldPlayTrailer,
} from './hero-home';

describe('heroBackdropSrc', () => {
  it('pide el fondo por el optimizador al ancho pedido, con tope Full HD', () => {
    expect(heroBackdropSrc('/uploads/abc.webp', 1400)).toBe(
      '/_next/image?url=%2Fuploads%2Fabc.webp&w=1920&q=70'
    );
    expect(heroBackdropSrc('https://verpelis.pro/peliculas/peliculas/a.webp', 1000)).toBe(
      '/_next/image?url=%2Fpeliculas%2Fpeliculas%2Fa.webp&w=1080&q=70'
    );
    expect(heroBackdropSrc('/logo.png', 1920)).toBe('/logo.png');
    expect(heroBackdropSrc('https://s4.anilist.co/cover.png', 1920)).toBe(
      'https://s4.anilist.co/cover.png'
    );
    expect(heroBackdropSrc('  ', 1920)).toBeNull();
  });

  it('ajusta el ancho a la pantalla y no pasa de 1920', () => {
    expect(heroRequestWidth(1440, 1)).toBe(1920);
    expect(heroRequestWidth(390, 2)).toBe(828);
    expect(heroRequestWidth(800, 1)).toBe(828);
    expect(heroRequestWidth(4000, 2)).toBe(1920);
  });
});

describe('hero copy', () => {
  it('pasa el título por displayTitle', () => {
    expect(heroTitle('DUNE: PARTE DOS')).toBe('Dune: Parte Dos');
    expect(heroTitle('Oppenheimer')).toBe('Oppenheimer');
  });

  it('escribe la duración y la línea de datos', () => {
    expect(heroDurationLabel(166)).toBe('2 h 46 min');
    expect(heroDurationLabel(60)).toBe('1 h');
    expect(heroDurationLabel(46)).toBe('46 min');
    expect(heroDurationFromSeconds(2 * 3600 + 46 * 60)).toBe('2 h 46 min');
    expect(heroDurationLabel(0)).toBeNull();
    expect(
      heroMetaLine(['2024', heroDurationLabel(166), 'PG-13', 'Ciencia ficción, Aventura'])
    ).toBe('2024  ·  2 h 46 min  ·  PG-13  ·  Ciencia ficción, Aventura');
  });
});

describe('shouldPlayTrailer', () => {
  const key = 'abc_def-123';

  it('espera a que el foco descanse y no arranca con movimiento reducido', () => {
    expect(
      shouldPlayTrailer({ rested: false, forced: false, youtubeKey: key, reducedMotion: false })
    ).toBe(false);
    expect(
      shouldPlayTrailer({ rested: true, forced: false, youtubeKey: key, reducedMotion: false })
    ).toBe(true);
    expect(
      shouldPlayTrailer({ rested: true, forced: false, youtubeKey: key, reducedMotion: true })
    ).toBe(false);
    expect(
      shouldPlayTrailer({ rested: false, forced: true, youtubeKey: key, reducedMotion: true })
    ).toBe(true);
    expect(
      shouldPlayTrailer({ rested: true, forced: true, youtubeKey: null, reducedMotion: false })
    ).toBe(false);
  });
});

describe('heroSynopsis', () => {
  it('quita el reparto en negrita y lo que sigue', () => {
    const raw =
      'Un joven descubre un secreto familiar.\n\n**REPARTO**: Fulano, Mengano\n**Dirigida por** Zutano 🇺🇸';
    expect(heroSynopsis(raw)).toBe('Un joven descubre un secreto familiar.');
  });

  it('quita líneas de reparto y frases que solo enumeran el elenco', () => {
    expect(
      heroSynopsis(
        'Tarzán vuelve a la selva. Margot Robbie y Samuel L. Jackson completan el talentoso elenco.'
      )
    ).toBe('Tarzán vuelve a la selva.');
    expect(heroSynopsis('Una historia de amor.\nReparto: Ana, Luis')).toBe('Una historia de amor.');
  });

  it('pasa a tipo oración el texto en mayúsculas y capitaliza la primera letra', () => {
    expect(heroSynopsis('UNA FAMILIA SE MUDA A UNA CASA. NADA ES LO QUE PARECE.')).toBe(
      'Una familia se muda a una casa. Nada es lo que parece.'
    );
    expect(heroSynopsis('una noche cambia todo.')).toBe('Una noche cambia todo.');
  });

  it('corta por palabra con «…» y nunca supera el máximo', () => {
    const raw = 'palabra '.repeat(60);
    const out = heroSynopsis(raw, 100);
    expect(out.length).toBeLessThanOrEqual(100);
    expect(out.endsWith('palabra…')).toBe(true);
  });

  it('prefiere cortar al final de una frase si queda larga', () => {
    const raw = `${'a'.repeat(70)}. ${'b '.repeat(60)}`;
    expect(heroSynopsis(raw, 100)).toBe(`A${'a'.repeat(69)}.`);
  });

  it('vacía si no queda texto', () => {
    expect(heroSynopsis(null)).toBe('');
    expect(heroSynopsis('**REPARTO**: Ana')).toBe('');
  });
});

describe('isTooDark / isFeaturedTitle / heroRuntimeIds', () => {
  it('fondo casi negro → póster', () => {
    expect(isTooDark(5)).toBe(true);
    expect(isTooDark(43)).toBe(false);
    expect(isTooDark(null)).toBe(false);
  });

  it('solo destacado si featured es true', () => {
    expect(isFeaturedTitle({ featured: true })).toBe(true);
    expect(isFeaturedTitle({ featured: false })).toBe(false);
    expect(isFeaturedTitle({})).toBe(false);
  });

  it('ids únicos en orden y con tope', () => {
    expect(
      heroRuntimeIds([[{ _id: 'a' }, { _id: 'b' }], null, [{ _id: 'a' }, { _id: 'c' }]], 2)
    ).toEqual(['a', 'b']);
  });
});
