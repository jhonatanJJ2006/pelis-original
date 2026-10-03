import { afterEach, describe, expect, it } from 'vitest';
import {
  isPrivateOrLocalHost,
  isPrivateOrLocalOrigin,
  resolvePublicAppOrigin,
  resolveRequestOrigin,
} from './request-origin';

function req(url: string, headers: Record<string, string> = {}): Request {
  return new Request(url, { headers });
}

const LOCAL_ENV = {
  NODE_ENV: 'development',
  SITE_URL: 'http://localhost:3000',
  BETTER_AUTH_URL: 'http://localhost:3000',
  NEXT_PUBLIC_APP_URL: 'http://localhost:3000',
} as NodeJS.ProcessEnv;

const MOVIES_ENV = {
  NODE_ENV: 'production',
  SITE_URL: 'http://localhost:3000',
  BETTER_AUTH_URL: 'https://verpelis.pro',
  NEXT_PUBLIC_SITE_URL: 'https://verpelis.pro',
  NEXT_PUBLIC_APP_URL: 'http://localhost:3000',
} as NodeJS.ProcessEnv;

afterEach(() => {
  // no shared mutable state
});

describe('isPrivateOrLocalHost', () => {
  it('detecta loopback, LAN y .local', () => {
    expect(isPrivateOrLocalHost('localhost')).toBe(true);
    expect(isPrivateOrLocalHost('127.0.0.1')).toBe(true);
    expect(isPrivateOrLocalHost('10.0.2.2')).toBe(true);
    expect(isPrivateOrLocalHost('192.168.1.50')).toBe(true);
    expect(isPrivateOrLocalHost('172.16.0.1')).toBe(true);
    expect(isPrivateOrLocalHost('pelis.local')).toBe(true);
    expect(isPrivateOrLocalHost('verpelis.pro')).toBe(false);
    expect(isPrivateOrLocalHost('www.verpelis.pro')).toBe(false);
  });
});

describe('resolvePublicAppOrigin', () => {
  it('elige HTTPS público aunque SITE_URL sea localhost (Movies)', () => {
    expect(resolvePublicAppOrigin(MOVIES_ENV)).toBe('https://verpelis.pro');
  });

  it('devuelve null en stack 100% local', () => {
    expect(resolvePublicAppOrigin(LOCAL_ENV)).toBeNull();
  });
});

describe('resolveRequestOrigin (QR verifyUrl)', () => {
  it('usa el host público del request en prod', () => {
    const origin = resolveRequestOrigin(
      req('https://verpelis.pro/api/tv-auth/pairing', {
        host: 'verpelis.pro',
        'x-forwarded-proto': 'https',
      }),
      MOVIES_ENV
    );
    expect(origin).toBe('https://verpelis.pro');
    expect(`${origin}/link-tv?code=AB23CD`).toBe('https://verpelis.pro/link-tv?code=AB23CD');
    expect(isPrivateOrLocalOrigin(origin)).toBe(false);
  });

  it('no emite localhost cuando el tunnel/proxy manda Host loopback', () => {
    const origin = resolveRequestOrigin(
      req('http://localhost:3000/api/tv-auth/pairing', {
        host: 'localhost:3000',
        'x-forwarded-proto': 'https',
      }),
      MOVIES_ENV
    );
    expect(origin).toBe('https://verpelis.pro');
    expect(`${origin}/link-tv?code=CHL749`).toBe('https://verpelis.pro/link-tv?code=CHL749');
  });

  it('no emite LAN cuando el APK habla con Movies por IP privada', () => {
    const origin = resolveRequestOrigin(
      req('http://192.168.1.50:3000/api/tv-auth/pairing', {
        host: '192.168.1.50:3000',
      }),
      MOVIES_ENV
    );
    expect(origin).toBe('https://verpelis.pro');
    expect(origin.startsWith('https://')).toBe(true);
    expect(isPrivateOrLocalOrigin(origin)).toBe(false);
  });

  it('toma solo el primer valor de x-forwarded-proto (lista)', () => {
    const origin = resolveRequestOrigin(
      req('https://verpelis.pro/api/tv-auth/pairing', {
        host: 'verpelis.pro',
        'x-forwarded-proto': 'https, http',
      }),
      MOVIES_ENV
    );
    expect(origin).toBe('https://verpelis.pro');
  });

  it('en desarrollo local puro conserva localhost (QR intencional)', () => {
    const origin = resolveRequestOrigin(
      req('http://localhost:3000/api/tv-auth/pairing', {
        host: 'localhost:3000',
      }),
      LOCAL_ENV
    );
    expect(origin).toBe('http://localhost:3000');
  });

  it('en production sin env público cae a verpelis.pro (nunca localhost en el QR)', () => {
    const origin = resolveRequestOrigin(
      req('http://localhost:3000/api/tv-auth/pairing', {
        host: 'localhost:3000',
      }),
      { NODE_ENV: 'production', SITE_URL: 'http://localhost:3000' } as NodeJS.ProcessEnv
    );
    expect(origin).toBe('https://verpelis.pro');
  });
});
