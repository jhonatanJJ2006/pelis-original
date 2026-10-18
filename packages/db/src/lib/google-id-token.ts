import { createPublicKey, createVerify, type JsonWebKey, type KeyObject } from 'node:crypto';

/**
 * Verificación de ID tokens de Google (OpenID Connect) sin dependencias:
 * firma RS256 contra las claves públicas de Google (JWKS), `iss`, `aud`,
 * `exp`/`iat`, `nonce` y `email_verified`.
 *
 * Lo usa el login nativo de la app de celular (Credential Manager): la app
 * pide a Google un ID token con `serverClientId` = cliente OAuth WEB, así que
 * `aud` es el client id web que ya usa better-auth.
 */

export const GOOGLE_ISSUERS = ['https://accounts.google.com', 'accounts.google.com'] as const;
export const GOOGLE_JWKS_URL = 'https://www.googleapis.com/oauth2/v3/certs';
/** Tolerancia de reloj al comprobar `exp` / `iat`. */
export const GOOGLE_CLOCK_SKEW_S = 60;

export type GoogleIdTokenErrorReason =
  'malformed' | 'alg' | 'key' | 'signature' | 'iss' | 'aud' | 'exp' | 'iat' | 'nonce' | 'email';

export class GoogleIdTokenError extends Error {
  constructor(
    public readonly reason: GoogleIdTokenErrorReason,
    message: string
  ) {
    super(message);
    this.name = 'GoogleIdTokenError';
  }
}

export interface GoogleIdTokenClaims {
  sub: string;
  email: string;
  emailVerified: boolean;
  name?: string;
  picture?: string;
  nonce?: string;
  aud: string;
  azp?: string;
  iat: number;
  exp: number;
}

/** Devuelve la clave pública para un `kid`, o null si no existe. */
export type GoogleKeyResolver = (kid: string) => Promise<KeyObject | null>;

export interface VerifyGoogleIdTokenOptions {
  /** Client id(s) OAuth aceptados como `aud` (el cliente WEB). */
  audience: string | readonly string[];
  /** Si se indica, `nonce` del token debe coincidir exactamente. */
  nonce?: string;
  /** Exigir `email_verified === true` (por defecto sí). */
  requireVerifiedEmail?: boolean;
  now?: Date;
  getKey?: GoogleKeyResolver;
}

function b64urlJson(part: string): Record<string, unknown> {
  const value = JSON.parse(Buffer.from(part, 'base64url').toString('utf8')) as unknown;
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('not an object');
  return value as Record<string, unknown>;
}

const JWT_PART = /^[A-Za-z0-9_-]+$/;

// ── JWKS de Google con caché (respeta Cache-Control: max-age) ─────────────
let jwksCache: { keys: Map<string, KeyObject>; expiresAt: number } | null = null;

async function fetchGoogleKeys(): Promise<Map<string, KeyObject>> {
  const res = await fetch(GOOGLE_JWKS_URL);
  if (!res.ok) throw new Error(`JWKS ${res.status}`);
  const body = (await res.json()) as { keys?: (JsonWebKey & { kid?: string })[] };
  const keys = new Map<string, KeyObject>();
  for (const jwk of body.keys ?? []) {
    if (!jwk.kid || jwk.kty !== 'RSA') continue;
    keys.set(jwk.kid, createPublicKey({ key: jwk, format: 'jwk' }));
  }
  const maxAge = /max-age=(\d+)/.exec(res.headers.get('cache-control') ?? '')?.[1];
  const ttlMs = Math.min(Math.max(Number(maxAge ?? 3600), 60), 24 * 3600) * 1000;
  jwksCache = { keys, expiresAt: Date.now() + ttlMs };
  return keys;
}

export const googleJwksKeyResolver: GoogleKeyResolver = async (kid) => {
  if (jwksCache && jwksCache.expiresAt > Date.now() && jwksCache.keys.has(kid)) {
    return jwksCache.keys.get(kid) ?? null;
  }
  // kid desconocido o caché vencida: Google rota las claves, se vuelve a pedir.
  const keys = await fetchGoogleKeys();
  return keys.get(kid) ?? null;
};

export async function verifyGoogleIdToken(
  token: unknown,
  opts: VerifyGoogleIdTokenOptions
): Promise<GoogleIdTokenClaims> {
  if (typeof token !== 'string' || token.length > 8192) {
    throw new GoogleIdTokenError('malformed', 'Token de Google inválido');
  }
  const parts = token.split('.');
  if (parts.length !== 3 || !parts.every((p) => JWT_PART.test(p))) {
    throw new GoogleIdTokenError('malformed', 'Token de Google inválido');
  }
  const [h, p, s] = parts as [string, string, string];
  let header: Record<string, unknown>;
  let payload: Record<string, unknown>;
  try {
    header = b64urlJson(h);
    payload = b64urlJson(p);
  } catch {
    throw new GoogleIdTokenError('malformed', 'Token de Google inválido');
  }

  if (header.alg !== 'RS256') throw new GoogleIdTokenError('alg', 'Algoritmo no permitido');
  const kid = typeof header.kid === 'string' ? header.kid : '';
  if (!kid) throw new GoogleIdTokenError('key', 'Token de Google sin clave');
  const key = await (opts.getKey ?? googleJwksKeyResolver)(kid);
  if (!key) throw new GoogleIdTokenError('key', 'Clave de Google desconocida');

  const verifier = createVerify('RSA-SHA256');
  verifier.update(`${h}.${p}`);
  verifier.end();
  if (!verifier.verify(key, Buffer.from(s, 'base64url'))) {
    throw new GoogleIdTokenError('signature', 'Firma del token de Google inválida');
  }

  if (!GOOGLE_ISSUERS.includes(payload.iss as (typeof GOOGLE_ISSUERS)[number])) {
    throw new GoogleIdTokenError('iss', 'Emisor del token inválido');
  }

  const audiences = (typeof opts.audience === 'string' ? [opts.audience] : opts.audience).filter(
    Boolean
  );
  const aud = payload.aud;
  if (typeof aud !== 'string' || !audiences.includes(aud)) {
    throw new GoogleIdTokenError('aud', 'El token no es para esta aplicación');
  }

  const nowS = Math.floor((opts.now ?? new Date()).getTime() / 1000);
  const exp = payload.exp;
  const iat = payload.iat;
  if (typeof exp !== 'number' || exp + GOOGLE_CLOCK_SKEW_S <= nowS) {
    throw new GoogleIdTokenError('exp', 'El token de Google expiró');
  }
  if (typeof iat !== 'number' || iat - GOOGLE_CLOCK_SKEW_S > nowS) {
    throw new GoogleIdTokenError('iat', 'Token de Google con fecha inválida');
  }

  const nonce = typeof payload.nonce === 'string' ? payload.nonce : undefined;
  if (opts.nonce !== undefined && nonce !== opts.nonce) {
    throw new GoogleIdTokenError('nonce', 'Nonce inválido');
  }

  const sub = typeof payload.sub === 'string' ? payload.sub : '';
  const email = typeof payload.email === 'string' ? payload.email.trim().toLowerCase() : '';
  if (!sub) throw new GoogleIdTokenError('malformed', 'Token de Google sin usuario');
  const emailVerified = payload.email_verified === true || payload.email_verified === 'true';
  if (!email || ((opts.requireVerifiedEmail ?? true) && !emailVerified)) {
    throw new GoogleIdTokenError('email', 'El correo de Google no está verificado');
  }

  return {
    sub,
    email,
    emailVerified,
    name: typeof payload.name === 'string' ? payload.name : undefined,
    picture: typeof payload.picture === 'string' ? payload.picture : undefined,
    nonce,
    aud,
    azp: typeof payload.azp === 'string' ? payload.azp : undefined,
    iat,
    exp,
  };
}
