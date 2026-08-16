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
});
