import { describe, expect, it } from 'vitest';
import { slugify } from './slugify';

describe('slugify', () => {
  it('lowercases and replaces spaces with dashes', () => {
    expect(slugify('Hola Mundo')).toBe('hola-mundo');
  });

  it('strips diacritics', () => {
    expect(slugify('Última Canción')).toBe('ultima-cancion');
    expect(slugify('Pélîs Òrigînal')).toBe('pelis-original');
  });

  it('collapses non-alphanumeric runs into a single dash', () => {
    expect(slugify('foo   ---   bar!!')).toBe('foo-bar');
  });

  it('trims leading and trailing dashes', () => {
    expect(slugify('---foo---')).toBe('foo');
  });

  it('handles mixed punctuation and digits', () => {
    expect(slugify('Operación Fénix 2: El Regreso')).toBe('operacion-fenix-2-el-regreso');
  });

  it('returns empty string for empty input', () => {
    expect(slugify('')).toBe('');
    expect(slugify('   ')).toBe('');
    expect(slugify('!!!')).toBe('');
  });

  it('truncates to maxLength without a trailing dash (posters scripts use 40)', () => {
    const long = 'Las crónicas de una ciudad que nunca duerme en invierno';
    const slug = slugify(long, { maxLength: 40 });
    expect(slug.length).toBeLessThanOrEqual(40);
    expect(slug.endsWith('-')).toBe(false);
    expect(slug).toBe('las-cronicas-de-una-ciudad-que-nunca-due');
    expect(slugify('Avatar: Fuego y ceniza', { maxLength: 40 })).toBe('avatar-fuego-y-ceniza');
  });
});
