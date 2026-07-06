import { betterAuth } from 'better-auth/minimal';
import { google } from '@better-auth/core/social-providers';

const { authHandler, sessionQuery, currentUserQuery } = betterAuth({
  database: {
    type: 'postgres',
    connectionString: process.env.DATABASE_URL!,
  },
  authSecrets: process.env.BETTER_AUTH_SECRET!,
  email: {
    adapter: {
      sendVerificationRequest: async ({ identifier, url }) => {
        console.log('Send email to', identifier, 'with url', url);
      },
    },
  },
  providers: [
    google({
      clientId: process.env.AUTH_GOOGLE_ID!,
      clientSecret: process.env.AUTH_GOOGLE_SECRET!,
    }),
  ],
  session: {
    expiresIn: 60 * 60 * 24 * 7,
    updateAge: 60 * 60 * 24,
  },
});

export { authHandler, sessionQuery, currentUserQuery };
