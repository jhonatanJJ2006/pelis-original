import { betterAuth } from 'better-auth/minimal';
import { google } from '@better-auth/core/social-providers';
import { convex } from '@convex-dev/better-auth/plugins';

export const auth = betterAuth({
  database: {
    type: 'postgres',
    connectionString: process.env.DATABASE_URL!,
  },
  authSecrets: process.env.BETTER_AUTH_SECRET!,
  providers: [
    google({
      clientId: process.env.AUTH_GOOGLE_ID!,
      clientSecret: process.env.AUTH_GOOGLE_SECRET!,
    }),
  ],
  plugins: [
    convex({
      authConfig: {
        providers: [{
          applicationID: 'convex',
          domain: process.env.CONVEX_SITE_URL!,
        }],
      },
    }),
  ],
  session: {
    expiresIn: 60 * 60 * 24 * 7,
    updateAge: 60 * 60 * 24,
  },
});
