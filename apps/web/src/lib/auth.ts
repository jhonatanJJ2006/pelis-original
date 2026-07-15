import { convexBetterAuthNextJs } from '@convex-dev/better-auth/nextjs';

function resolveConvexSiteUrl(): string {
  const explicit =
    process.env.CONVEX_SITE_URL?.trim() || process.env.NEXT_PUBLIC_CONVEX_SITE_URL?.trim();
  if (explicit) {
    return explicit.replace(/\/$/, '');
  }

  const cloud = process.env.NEXT_PUBLIC_CONVEX_URL?.trim();
  if (cloud) {
    return cloud.replace('.convex.cloud', '.convex.site').replace(/\/$/, '');
  }

  throw new Error(
    'CONVEX_SITE_URL is not set. Set NEXT_PUBLIC_CONVEX_SITE_URL or NEXT_PUBLIC_CONVEX_URL in Vercel.'
  );
}

const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL!;
const convexSiteUrl = resolveConvexSiteUrl();

export const { handler, getToken, isAuthenticated } = convexBetterAuthNextJs({
  convexUrl,
  convexSiteUrl,
});
