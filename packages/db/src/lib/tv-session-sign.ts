import { createHmac } from 'node:crypto';

/**
 * Firma el token igual que better-call (`signCookieValue`): `<token>.<base64 HMAC-SHA256>`.
 * better-auth `getSession` solo acepta cookies de sesión firmadas; sin firma la sesión
 * emitida al reclamar un emparejamiento quedaba anónima.
 * El valor se devuelve sin codificar: `NextResponse.cookies.set` aplica encodeURIComponent.
 */
export function signSessionToken(token: string, secret: string): string {
  const signature = createHmac('sha256', secret).update(token).digest('base64');
  return `${token}.${signature}`;
}
