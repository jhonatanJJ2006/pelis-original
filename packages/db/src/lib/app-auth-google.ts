import { prisma } from '../client';
import { AuthError } from './requireAdmin';
import {
  APP_AUTH_ROW_PREFIX,
  generateAppAuthCode,
  isAppAuthToken,
  sha256Hex,
} from './app-auth-code';
import {
  GoogleIdTokenError,
  verifyGoogleIdToken,
  type GoogleIdTokenClaims,
  type GoogleKeyResolver,
} from './google-id-token';

/**
 * Login nativo con Google en la app de celular (Credential Manager, hoja de
 * cuentas del sistema dentro de la app, sin navegador).
 *
 * 1. La app pide `POST /api/app-auth/google/nonce` → `{ nonce, clientId }`.
 *    El nonce es de un solo uso (TTL 10 min); en la base solo se guarda su hash
 *    (tabla tv_pairing, prefijo `app:`, igual que el flujo con código).
 * 2. La app pide a Google un ID token con `serverClientId = clientId` (cliente
 *    OAuth WEB) y ese `nonce`.
 * 3. La app envía `POST /api/app-auth/google/id-token { idToken }`; el servidor
 *    verifica firma, `iss`, `aud` (= client id web), `exp`, `email_verified`,
 *    consume el nonce y crea la sesión igual que `/api/app-auth/exchange`.
 */

export const GOOGLE_NONCE_TTL_MS = 10 * 60 * 1000;
export const GOOGLE_NONCE_DEVICE = `${APP_AUTH_ROW_PREFIX}google-nonce`;
export const GOOGLE_NONCE_USER_AGENT = 'pelis-app-google-idtoken';

export function googleNonceKey(nonce: string): string {
  return `${APP_AUTH_ROW_PREFIX}n:${sha256Hex(nonce)}`;
}

/** Client id OAuth web de Google configurado para better-auth (no es secreto). */
export function googleWebClientId(): string {
  return process.env.AUTH_GOOGLE_ID?.trim() || process.env.GOOGLE_CLIENT_ID?.trim() || '';
}

export async function createGoogleNonce(
  now: Date = new Date()
): Promise<{ nonce: string; expiresAt: Date }> {
  const nonce = generateAppAuthCode();
  const expiresAt = new Date(now.getTime() + GOOGLE_NONCE_TTL_MS);
  await prisma.tvPairing.create({
    data: {
      code: googleNonceKey(nonce),
      deviceId: GOOGLE_NONCE_DEVICE,
      status: 'PENDING',
      userAgent: GOOGLE_NONCE_USER_AGENT,
      expiresAt,
    },
  });
  return { nonce, expiresAt };
}

/** Marca el nonce como usado (atómico). Devuelve false si no existe, venció o ya se usó. */
export async function consumeGoogleNonce(nonce: unknown, now: Date = new Date()): Promise<boolean> {
  if (!isAppAuthToken(nonce)) return false;
  const result = await prisma.tvPairing.updateMany({
    where: {
      code: googleNonceKey(nonce),
      deviceId: GOOGLE_NONCE_DEVICE,
      status: 'PENDING',
      expiresAt: { gt: now },
    },
    data: { status: 'CLAIMED', claimedAt: now },
  });
  return result.count === 1;
}

/** Busca (o crea/vincula) el usuario de better-auth para la cuenta de Google. */
export type GoogleUserResolver = (claims: GoogleIdTokenClaims) => Promise<string>;

type AdapterUser = { id: string; email: string; emailVerified: boolean };
type AdapterAccount = { providerId: string; accountId: string };
interface InternalAdapterLike {
  findOAuthUser(
    email: string,
    accountId: string,
    providerId: string
  ): Promise<{ user: AdapterUser; accounts: AdapterAccount[] } | null>;
  createOAuthUser(
    user: Record<string, unknown>,
    account: Record<string, unknown>
  ): Promise<{ user: AdapterUser }>;
  linkAccount(account: Record<string, unknown>): Promise<unknown>;
  updateUser(userId: string, data: Record<string, unknown>): Promise<unknown>;
}

/** Igual que better-auth en el callback OAuth: vincula por correo verificado o crea la cuenta. */
export const betterAuthGoogleUserResolver: GoogleUserResolver = async (claims) => {
  const { auth } = await import('../auth');
  const ctx = await auth().$context;
  const ia = ctx.internalAdapter as unknown as InternalAdapterLike;
  const found = await ia.findOAuthUser(claims.email, claims.sub, 'google');
  if (found) {
    const linked = found.accounts.some(
      (a) => a.providerId === 'google' && a.accountId === claims.sub
    );
    if (!linked) {
      await ia.linkAccount({ userId: found.user.id, providerId: 'google', accountId: claims.sub });
    }
    if (!found.user.emailVerified && found.user.email === claims.email) {
      await ia.updateUser(found.user.id, { emailVerified: true });
    }
    return found.user.id;
  }
  const created = await ia.createOAuthUser(
    {
      email: claims.email,
      name: claims.name?.trim() || claims.email.split('@')[0] || 'Usuario',
      image: claims.picture ?? null,
      emailVerified: true,
    },
    { providerId: 'google', accountId: claims.sub }
  );
  return created.user.id;
};

const MESSAGES: Record<string, string> = {
  nonce: 'El inicio de sesión expiró. Vuelve a intentarlo.',
  email: 'Tu correo de Google no está verificado.',
  aud: 'Este inicio de sesión de Google no es para Pelis.',
  exp: 'El inicio de sesión de Google expiró. Vuelve a intentarlo.',
};

/** Verifica el ID token + nonce y devuelve el userId (crea/vincula si hace falta). */
export async function signInWithGoogleIdToken(input: {
  idToken: unknown;
  audience?: string;
  now?: Date;
  getKey?: GoogleKeyResolver;
  resolveUser?: GoogleUserResolver;
}): Promise<{ userId: string; email: string }> {
  const audience = input.audience ?? googleWebClientId();
  if (!audience) throw new AuthError('Login con Google no configurado', 503);
  const now = input.now ?? new Date();
  let claims: GoogleIdTokenClaims;
  try {
    claims = await verifyGoogleIdToken(input.idToken, {
      audience,
      now,
      getKey: input.getKey,
      requireVerifiedEmail: true,
    });
    if (!(await consumeGoogleNonce(claims.nonce, now))) {
      throw new GoogleIdTokenError('nonce', 'Nonce inválido');
    }
  } catch (err) {
    if (err instanceof GoogleIdTokenError) {
      throw new AuthError(MESSAGES[err.reason] ?? 'Token de Google inválido', 401);
    }
    throw err;
  }
  const userId = await (input.resolveUser ?? betterAuthGoogleUserResolver)(claims);
  if (!userId) throw new AuthError('No se pudo iniciar sesión con Google', 500);
  return { userId, email: claims.email };
}
