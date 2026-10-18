import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';

/**
 * Inicio de sesión con Google en la app nativa sin cliente OAuth de Android.
 *
 * 1. La app genera `state` y `verifier` aleatorios y abre en una Custom Tab
 *    `/app-auth/google?state=<state>&challenge=<S256(verifier)>`.
 * 2. La web hace el flujo normal de Google (better-auth) y, con la sesión del
 *    navegador ya creada, emite un código de un solo uso (TTL ≤ 2 min) atado a
 *    `state` + `challenge`, y vuelve a la app con
 *    `pro.verpelis.app://auth/callback?code=<code>&state=<state>`.
 * 3. La app comprueba `state` y canjea `{ code, state, verifier }` en
 *    `POST /api/app-auth/exchange`, que crea la sesión igual que el
 *    emparejamiento de la TV (issueTvSession).
 *
 * En la base solo se guarda el hash del código, nunca el código ni un token de sesión.
 */

export const APP_AUTH_CODE_TTL_MS = 2 * 60 * 1000;
export const APP_AUTH_SCHEME = 'pro.verpelis.app';
export const APP_AUTH_PACKAGE = 'pro.verpelis.app.native';
export const APP_AUTH_CALLBACK_HOST = 'auth';
export const APP_AUTH_CALLBACK_PATH = '/callback';
/** Prefijo de las filas de tv_pairing que pertenecen a este flujo (nunca chocan con códigos TV de 6 letras). */
export const APP_AUTH_ROW_PREFIX = 'app:';
export const APP_AUTH_USER_AGENT = 'pelis-app-google';

// base64url de 32 bytes = 43 caracteres. Se acepta de 43 a 128 (como PKCE).
const TOKEN_RE = /^[A-Za-z0-9_-]{43,128}$/;

export function isAppAuthToken(value: unknown): value is string {
  return typeof value === 'string' && TOKEN_RE.test(value);
}

export function sha256Hex(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

/** PKCE S256: base64url(sha256(verifier)) sin relleno. */
export function pkceChallenge(verifier: string): string {
  return createHash('sha256').update(verifier).digest('base64url');
}

export function generateAppAuthCode(): string {
  return randomBytes(32).toString('base64url');
}

/** Clave almacenada en `tv_pairing.code`. */
export function appAuthCodeKey(code: string): string {
  return APP_AUTH_ROW_PREFIX + sha256Hex(code);
}

/** Vínculo almacenado en `tv_pairing.deviceId`: hash de state + challenge. */
export function appAuthBinding(state: string, challenge: string): string {
  return APP_AUTH_ROW_PREFIX + sha256Hex(`${state}.${challenge}`);
}

export function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}

export function buildAppCallbackUrl(code: string, state: string): string {
  const qs = new URLSearchParams({ code, state }).toString();
  return `${APP_AUTH_SCHEME}://${APP_AUTH_CALLBACK_HOST}${APP_AUTH_CALLBACK_PATH}?${qs}`;
}

/** URL `intent:` de Chrome: solo la abre el paquete de la app (otra app no puede interceptarla). */
export function buildAppIntentUrl(code: string, state: string): string {
  const qs = new URLSearchParams({ code, state }).toString();
  return (
    `intent://${APP_AUTH_CALLBACK_HOST}${APP_AUTH_CALLBACK_PATH}?${qs}` +
    `#Intent;scheme=${APP_AUTH_SCHEME};package=${APP_AUTH_PACKAGE};end`
  );
}

/** Ruta interna (relativa) a la que vuelve better-auth tras Google. */
export function buildAppAuthCompletePath(state: string, challenge: string): string {
  const qs = new URLSearchParams({ state, challenge }).toString();
  return `/api/app-auth/google/complete?${qs}`;
}
