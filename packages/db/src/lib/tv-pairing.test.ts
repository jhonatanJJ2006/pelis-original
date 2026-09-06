import { describe, expect, it } from 'vitest';
import {
  PAIRING_CODE_ALPHABET,
  PAIRING_CODE_LENGTH,
  buildLinkTvUrl,
  formatPairingCode,
  generatePairingCode,
  isPairingCodeShape,
  normalizePairingCode,
  pairingPublicStatus,
} from './tv-pairing-code';

describe('generatePairingCode', () => {
  it('usa el alfabeto sin ambiguos y la longitud fija', () => {
    const code = generatePairingCode(Uint8Array.from([0, 1, 2, 3, 4, 5]));
    expect(code).toHaveLength(PAIRING_CODE_LENGTH);
    expect([...code].every((ch) => PAIRING_CODE_ALPHABET.includes(ch))).toBe(true);
  });
});

describe('normalizePairingCode', () => {
  it('quita espacios, pasa a mayúsculas y recorta', () => {
    expect(normalizePairingCode(' ab 12 cd ')).toBe('AB12CD');
  });

  it('no incluye letras ambiguas en el recorte', () => {
    expect(normalizePairingCode('ab-23-cd')).toBe('AB23CD');
  });
});

describe('isPairingCodeShape', () => {
  it('acepta códigos del alfabeto', () => {
    expect(isPairingCodeShape('AB23CD')).toBe(true);
    expect(isPairingCodeShape('AB1OCD')).toBe(false);
    expect(isPairingCodeShape('ABC')).toBe(false);
  });
});

describe('pairingPublicStatus', () => {
  const expires = new Date('2026-09-06T12:10:00.000Z');

  it('marca expirado si pasó expiresAt y no se reclamó', () => {
    expect(pairingPublicStatus('PENDING', expires, new Date('2026-09-06T12:11:00.000Z'))).toBe(
      'expired'
    );
    expect(pairingPublicStatus('APPROVED', expires, new Date('2026-09-06T12:11:00.000Z'))).toBe(
      'expired'
    );
  });

  it('no pisa claimed aunque expire', () => {
    expect(pairingPublicStatus('CLAIMED', expires, new Date('2026-09-06T12:11:00.000Z'))).toBe(
      'claimed'
    );
  });

  it('devuelve el estado vivo en minúsculas', () => {
    expect(pairingPublicStatus('PENDING', expires, new Date('2026-09-06T12:00:00.000Z'))).toBe(
      'pending'
    );
    expect(pairingPublicStatus('APPROVED', expires, new Date('2026-09-06T12:00:00.000Z'))).toBe(
      'approved'
    );
  });
});

describe('buildLinkTvUrl / formatPairingCode', () => {
  it('arma la URL de aprobación móvil', () => {
    expect(buildLinkTvUrl('https://verpelis.pro/', 'AB23CD')).toBe(
      'https://verpelis.pro/link-tv?code=AB23CD'
    );
  });

  it('formatea el código para leerlo en tele', () => {
    expect(formatPairingCode('ab23cd')).toBe('AB2 3CD');
  });
});
