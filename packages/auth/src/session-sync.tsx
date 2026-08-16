'use client';

import { useEffect, type ReactNode } from 'react';
import { authClient } from './client';
import { useAppStore, type User } from './store';

interface MeUser {
  _id: string;
  name: string;
  email: string;
  image?: string;
  role?: 'USER' | 'ADMIN';
  emailVerified?: boolean;
  planId?: string;
  planExpiresAt?: number;
}

function toAppUser(
  sessionUser: {
    id: string;
    name: string;
    email: string;
    image?: string | null;
    emailVerified: boolean;
    role?: string | null;
  },
  me?: MeUser | null,
): User {
  const role = (me?.role ?? sessionUser.role ?? 'USER').toString().toUpperCase();
  return {
    _id: me?._id ?? sessionUser.id,
    name: me?.name ?? sessionUser.name ?? 'User',
    email: me?.email ?? sessionUser.email ?? '',
    image: me?.image ?? sessionUser.image ?? undefined,
    role: role === 'ADMIN' ? 'admin' : 'user',
    planId: me?.planId,
    planExpiresAt: me?.planExpiresAt,
  };
}

async function fetchMeProfile(): Promise<MeUser | null> {
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await fetch('/api/function/users.me', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: '{}',
      });
      if (!res.ok) {
        if (attempt === 0) {
          await new Promise((r) => setTimeout(r, 350));
          continue;
        }
        return null;
      }
      return ((await res.json()) as MeUser | null) ?? null;
    } catch {
      if (attempt === 0) {
        await new Promise((r) => setTimeout(r, 350));
        continue;
      }
      return null;
    }
  }
  return null;
}

/**
 * Single root subscription to Better Auth session.
 * Keeps zustand in sync so all pages share the same logged-in user.
 */
export function AuthSessionSync({ children }: { children: ReactNode }) {
  const { data, isPending, refetch } = authClient.useSession();
  const setUser = useAppStore((state) => state.setUser);
  const clearUser = useAppStore((state) => state.clearUser);

  // Polling periódico y refetch al volver a la pestaña.
  useEffect(() => {
    const interval = setInterval(() => {
      void refetch();
    }, 60_000);
    const onFocus = () => {
      void refetch();
    };
    window.addEventListener('focus', onFocus);
    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', onFocus);
    };
  }, [refetch]);

  useEffect(() => {
    if (isPending) return;

    const sessionUser = data?.user;
    if (!sessionUser) {
      clearUser();
      return;
    }

    let cancelled = false;

    void (async () => {
      const base = toAppUser(sessionUser);
      setUser(base);

      const me = await fetchMeProfile();
      if (cancelled) return;
      setUser(toAppUser(sessionUser, me));
    })();

    return () => {
      cancelled = true;
    };
  }, [data?.user?.id, isPending, setUser, clearUser, data?.user]);

  return children;
}
