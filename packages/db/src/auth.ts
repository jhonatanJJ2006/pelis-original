import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import type { BetterAuthOptions } from 'better-auth';
import { prisma } from './client';

const siteUrl =
  process.env.SITE_URL?.trim() ||
  process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
  'http://localhost:3000';

function resolveSecureCookies(baseUrl: string): boolean {
  const override = process.env.BETTER_AUTH_SECURE_COOKIES?.trim().toLowerCase();
  if (override === 'true') return true;
  if (override === 'false') return false;
  // HTTPS production URLs need Secure cookies; local HTTP dev must not use them.
  return baseUrl.startsWith('https://') && process.env.NODE_ENV === 'production';
}

function resolveTrustedOrigins(baseUrl: string): string[] {
  const origins = new Set<string>([baseUrl]);
  for (const key of ['NEXT_PUBLIC_SITE_URL', 'BETTER_AUTH_URL'] as const) {
    const value = process.env[key]?.trim();
    if (value) origins.add(value);
  }
  // `next start` corre con NODE_ENV=production, pero también se abre desde el
  // PC vía http://localhost:3000: esas origins deben ser de confianza siempre.
  origins.add('http://localhost:3000');
  origins.add('http://127.0.0.1:3000');
  origins.add('https://verpelis.pro');
  origins.add('https://www.verpelis.pro');
  return [...origins];
}

export function createAuth() {
  const opts: BetterAuthOptions = {
    appName: 'Pelis',
    baseURL: siteUrl,
    secret: process.env.BETTER_AUTH_SECRET!,
    trustedOrigins: resolveTrustedOrigins(siteUrl),
    advanced: {
      useSecureCookies: resolveSecureCookies(siteUrl),
      defaultCookieAttributes: {
        sameSite: 'lax',
        secure: resolveSecureCookies(siteUrl),
        httpOnly: true,
        path: '/',
      },
    },
    database: prismaAdapter(prisma, { provider: 'postgresql' }),
    emailAndPassword: {
      enabled: true,
      autoSignIn: true,
      requireEmailVerification: true,
    },
    socialProviders: (() => {
      const clientId =
        process.env.AUTH_GOOGLE_ID?.trim() ||
        process.env.GOOGLE_CLIENT_ID?.trim() ||
        '';
      const clientSecret =
        process.env.AUTH_GOOGLE_SECRET?.trim() ||
        process.env.GOOGLE_CLIENT_SECRET?.trim() ||
        '';
      if (!clientId || !clientSecret) return undefined;
      return {
        google: {
          clientId,
          clientSecret,
        },
      };
    })(),
    user: {
      additionalFields: {
        role: { type: 'string', defaultValue: 'USER', input: false },
      },
    },
    session: {
      expiresIn: 60 * 60 * 24 * 7,
      updateAge: 60 * 60 * 24,
    },
    databaseHooks: {
      user: {
        create: {
          after: async (user) => {
            const u = user as unknown as { id: string; email: string; name: string; emailVerified: boolean };
            await syncUser(u).catch((err) =>
              console.error('[auth] syncUser after create failed', err),
            );
          },
        },
        update: {
          after: async (user) => {
            const list = Array.isArray(user) ? user : [user];
            for (const doc of list) {
              const u = doc as unknown as { id: string; email: string; name: string; emailVerified: boolean };
              await syncUser(u).catch((err) =>
                console.error('[auth] syncUser after update failed', err),
              );
            }
          },
        },
      },
      session: {
        create: {
          after: async (session) => {
            const s = session as unknown as { userId?: string; expiresAt?: string | number };
            if (!s?.userId) return;
            const expiresAt =
              typeof s.expiresAt === 'number'
                ? new Date(s.expiresAt)
                : s.expiresAt
                  ? new Date(s.expiresAt)
                  : new Date();
            await recordLogin(s.userId, expiresAt).catch((err) =>
              console.error('[auth] recordLogin failed', err),
            );
          },
        },
      },
    },
  };
  return betterAuth(opts);
}

async function syncUser(u: { id: string; email: string; name: string; emailVerified: boolean }) {
  if (!u?.id || !u?.email) return;
  const adminEmails = (process.env.ADMIN_EMAILS ?? '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  const email = u.email.toLowerCase();
  const role = adminEmails.includes(email) ? 'ADMIN' : 'USER';
  const existing = await prisma.user.findUnique({ where: { id: u.id } });
  const now = new Date();
  if (existing) {
    await prisma.user.update({
      where: { id: u.id },
      data: {
        email,
        name: u.name ?? email,
        emailVerified: !!u.emailVerified,
        verifiedAt: u.emailVerified ? existing.verifiedAt ?? now : undefined,
        role: existing.role === 'ADMIN' || role === 'ADMIN' ? 'ADMIN' : existing.role,
      },
    });
    return;
  }
  await prisma.user.create({
    data: {
      id: u.id,
      email,
      name: u.name ?? email,
      role,
      emailVerified: !!u.emailVerified,
      verifiedAt: u.emailVerified ? now : null,
    },
  });
}

async function recordLogin(userId: string, expiresAt: Date) {
  await prisma.user.update({
    where: { id: userId },
    data: { lastLoginAt: new Date(), lastSessionExpiresAt: expiresAt },
  });
}

export type AuthInstance = ReturnType<typeof createAuth>;

let cached: AuthInstance | null = null;
export function auth(): AuthInstance {
  if (!cached) cached = createAuth();
  return cached;
}