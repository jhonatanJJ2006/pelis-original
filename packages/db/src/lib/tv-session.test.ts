import { webcrypto } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { signSessionToken } from './tv-session-sign';

// Réplica de better-call `signCookieValue` (crypto.mjs), que better-auth usa para la cookie de sesión.
async function betterCallSign(value: string, secret: string): Promise<string> {
  const key = await webcrypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sig = await webcrypto.subtle.sign('HMAC', key, new TextEncoder().encode(value));
  return encodeURIComponent(`${value}.${btoa(String.fromCharCode(...new Uint8Array(sig)))}`);
}

describe('signSessionToken', () => {
  it('coincide con la firma de better-call usada por better-auth', async () => {
    const secret = 'secreto-de-prueba-123';
    const token = 'O9gi7rbTCh4n1Iw5M0Dzz5ZSTBOshHe4';
    expect(encodeURIComponent(signSessionToken(token, secret))).toBe(
      await betterCallSign(token, secret)
    );
  });
});
