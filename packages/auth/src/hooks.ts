'use client';

import { useEffect, useState } from 'react';
import { useAppStore, type User } from './store';

interface UseUserReturn {
  user: User | null;
  isLoading: boolean;
  logout: () => void;
}

interface SessionUser {
  id: string;
  name: string;
  email: string;
  image?: string;
  emailVerified: boolean;
  role?: 'USER' | 'ADMIN';
  planId?: string;
  planExpiresAt?: number;
}

async function fetchSession(): Promise<SessionUser | null> {
  try {
    const res = await fetch('/api/auth/get-session', {
      credentials: 'include',
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { user?: SessionUser } | null;
    return data?.user ?? null;
  } catch {
    return null;
  }
}

export function useUser(): UseUserReturn {
  const { user, setUser, isLoading } = useAppStore();
  const [session, setSession] = useState<SessionUser | null | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const tick = async () => {
      const next = await fetchSession();
      if (cancelled) return;
      setSession(next);
      if (!next) {
        setUser(null);
      } else {
        setUser({
          _id: next.id,
          name: next.name ?? 'User',
          email: next.email ?? '',
          image: next.image,
          role: next.role === 'ADMIN' ? 'admin' : 'user',
          planId: next.planId,
          planExpiresAt: next.planExpiresAt,
        });
      }
    };

    void tick();
    // Re-poll every 30s as a fallback. Real-time session changes come from
    // the /api/auth mutations themselves (the user logs out -> store cleared).
    timer = setInterval(tick, 30_000);

    return () => {
      cancelled = true;
      if (timer) clearInterval(timer);
    };
  }, [setUser]);

  const logout = async () => {
    try {
      await fetch('/api/auth/sign-out', {
        method: 'POST',
        credentials: 'include',
      });
    } catch {
      // ignore
    }
    setUser(null);
    setSession(null);
  };

  const resolvedUser = session ? user : null;

  return {
    user: resolvedUser,
    isLoading: session === undefined || (Boolean(session) && user === null && isLoading),
    logout,
  };
}