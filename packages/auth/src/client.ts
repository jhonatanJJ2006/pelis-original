import { createAuthClient } from 'better-auth/react';

function resolveBaseUrl(): string {
  if (typeof globalThis.window !== 'undefined') {
    return globalThis.window.location.origin;
  }
  return (
    process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
    process.env.SITE_URL?.trim() ||
    'http://localhost:3000'
  );
}

export const authClient = createAuthClient({
  baseURL: resolveBaseUrl(),
  fetchOptions: {
    credentials: 'include',
  },
  // Seeking/fullscreen fires visibilitychange; Better Auth's default focus
  // refetch sets session data to null on any get-session error, which unmounted
  // the player. Session is still loaded on mount and after sign-in/sign-out.
  sessionOptions: {
    refetchOnWindowFocus: false,
    refetchInterval: 0,
  },
});
