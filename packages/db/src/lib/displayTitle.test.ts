import { describe, expect, it } from 'vitest';
import { displayTitle } from './displayTitle';

describe('displayTitle', () => {
  it('normaliza mayúsculas y minúsculas completas', () => {
    expect(displayTitle('volver al futuro 1')).toBe('Volver al futuro 1');
    expect(displayTitle('COCAINE BEAR / OSO INTOXICADO')).toBe('Cocaine Bear / Oso Intoxicado');
    expect(displayTitle('JUJUTSU KAISEN 0')).toBe('Jujutsu Kaisen 0');
    expect(displayTitle("DON'T TOY WITH ME, MISS NAGATORO")).toBe(
      "Don't Toy with Me, Miss Nagatoro"
    );
    expect(displayTitle('86 EIGHTY-SIX')).toBe('86 Eighty-Six');
    expect(displayTitle('THE GHOST IN THE SHELL')).toBe('The Ghost in the Shell');
  });
  it('respeta grafías cortas y títulos mixtos', () => {
    expect(displayTitle('GOAT')).toBe('GOAT');
    expect(displayTitle('M3GAN')).toBe('M3GAN');
    expect(displayTitle('SSSS.GRIDMAN')).toBe('SSSS.GRIDMAN');
    expect(displayTitle('Kung Fu Panda 3')).toBe('Kung Fu Panda 3');
    expect(displayTitle('10 días de un buen hombre')).toBe('10 días de un buen hombre');
  });
});
