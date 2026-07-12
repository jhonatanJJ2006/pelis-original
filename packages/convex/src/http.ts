import { httpRouter } from 'convex/server';
import { createClient } from '@convex-dev/better-auth';
import { betterAuth } from 'better-auth';
import { convex } from '@convex-dev/better-auth/plugins';
import { getAuthConfigProvider } from '@convex-dev/better-auth/auth-config';
import { components } from './_generated/api';

const http = httpRouter();

const authClient = createClient(components.betterAuth);

const siteUrl = process.env.SITE_URL || 'http://localhost:3000';

authClient.registerRoutes(http, (ctx) => {
  return betterAuth({
    baseURL: siteUrl,
    secret: process.env.BETTER_AUTH_SECRET!,
    trustedOrigins: [siteUrl],
    database: authClient.adapter(ctx),
    emailAndPassword: {
      enabled: true,
      autoSignIn: true,
      requireEmailVerification: false,
    },
    socialProviders: {
      ...(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET
        ? {
            google: {
              clientId: process.env.AUTH_GOOGLE_ID,
              clientSecret: process.env.AUTH_GOOGLE_SECRET,
            },
          }
        : {}),
    },
    plugins: [
      convex({
        authConfig: {
          providers: [getAuthConfigProvider()],
        },
      }),
    ],
    session: {
      expiresIn: 60 * 60 * 24 * 7,
      updateAge: 60 * 60 * 24,
    },
  });
});

export default http;
