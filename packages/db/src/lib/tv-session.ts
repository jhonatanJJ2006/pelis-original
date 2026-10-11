import { randomBytes } from 'node:crypto';
import { prisma } from '../client';
import { auth } from '../auth';
import { signSessionToken } from './tv-session-sign';

export { signSessionToken };

const SESSION_DAYS = 7;

export interface IssuedTvSession {
  token: string;
  cookieName: string;
  cookieValue: string;
  maxAge: number;
  secure: boolean;
}

function wantsSecureCookie(request: Request): boolean {
  const proto = request.headers.get('x-forwarded-proto') ?? '';
  if (proto === 'https') return true;
  try {
    return new URL(request.url).protocol === 'https:';
  } catch {
    return false;
  }
}

export function betterAuthSessionCookieName(secure: boolean): string {
  return secure ? '__Secure-better-auth.session_token' : 'better-auth.session_token';
}

async function createSessionViaAdapter(userId: string, request: Request) {
  const instance = auth();
  const ctx = await instance.$context;
  const adapter = ctx.internalAdapter as {
    createSession: (
      userId: string,
      dontRememberMe?: boolean,
      request?: Request
    ) => Promise<{ token: string }>;
  };
  try {
    return await adapter.createSession(userId, false, request);
  } catch {
    return adapter.createSession(userId, false);
  }
}

async function createSessionViaPrisma(userId: string, request: Request) {
  const token = randomBytes(32).toString('base64url');
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
  const forwarded = request.headers.get('x-forwarded-for') ?? '';
  await prisma.session.create({
    data: {
      token,
      userId,
      expiresAt,
      userAgent: request.headers.get('user-agent') ?? null,
      ipAddress: forwarded.split(',')[0]?.trim() || null,
    },
  });
  return { token };
}

export async function issueTvSession(userId: string, request: Request): Promise<IssuedTvSession> {
  let token: string;
  try {
    const session = await createSessionViaAdapter(userId, request);
    token = session.token;
  } catch {
    const session = await createSessionViaPrisma(userId, request);
    token = session.token;
  }

  const maxAge = SESSION_DAYS * 24 * 60 * 60;
  // Mismo nombre, atributos y firma que usa better-auth al iniciar sesión.
  let cookieName = betterAuthSessionCookieName(wantsSecureCookie(request));
  let secure = wantsSecureCookie(request);
  let secret = process.env.BETTER_AUTH_SECRET ?? '';
  try {
    const ctx = (await auth().$context) as {
      secret?: string;
      authCookies?: { sessionToken?: { name?: string; options?: { secure?: boolean } } };
    };
    if (ctx.authCookies?.sessionToken?.name) cookieName = ctx.authCookies.sessionToken.name;
    if (typeof ctx.authCookies?.sessionToken?.options?.secure === 'boolean') {
      secure = ctx.authCookies.sessionToken.options.secure;
    }
    if (ctx.secret) secret = ctx.secret;
  } catch {
    // se mantienen los valores por defecto
  }
  return {
    token,
    cookieName,
    cookieValue: secret ? signSessionToken(token, secret) : token,
    maxAge,
    secure,
  };
}
