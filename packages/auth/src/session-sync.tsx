'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import { authClient } from './client';
import { useAppStore } from './store';
import {
  applyHydratedUser,
  decideSessionSync,
  type MeFetchResult,
  type MeUserLike,
  type SessionUserLike,
} from './session-user';

interface MeUser extends MeUserLike {
  role?: 'USER' | 'ADMIN';
}

function asSessionUser(user: {
  id: string;
  name: string;
  email: string;
  image?: string | null;
  emailVerified: boolean;
  role?: string | null;
}): SessionUserLike {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    image: user.image,
    emailVerified: user.emailVerified,
    role: user.role,
  };
}

async function fetchMeProfile(): Promise<MeFetchResult> {
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
        return { ok: false };
      }
      const json = (await res.json()) as MeUser | null;
      if (!json || typeof json !== 'object' || !json._id) {
        return { ok: false };
      }
      return { ok: true, user: json };
    } catch {
      if (attempt === 0) {
        await new Promise((r) => setTimeout(r, 350));
        continue;
      }
      return { ok: false };
    }
  }
  return { ok: false };
}

/**
 * Single root subscription to Better Auth session.
 * Keeps zustand in sync so all pages share the same logged-in user.
 *
 * Does NOT poll and does not refetch on focus — Better Auth already loads
 * the session on mount. Extra refetch was wiping session/plan mid-playback.
 */
export function AuthSessionSync({ children }: { children: ReactNode }) {
  const { data, isPending, error } = authClient.useSession();
  const setUser = useAppStore((state) => state.setUser);
  const clearUser = useAppStore((state) => state.clearUser);
  const hadLiveSession = useRef(false);

  useEffect(() => {
    const sessionUser = data?.user ?? null;
    const decision = decideSessionSync({
      isPending,
      sessionUserId: sessionUser?.id ?? null,
      sessionError: error,
      hadLiveSession: hadLiveSession.current,
    });

    if (decision.action === 'keep') return;

    if (decision.action === 'clear') {
      clearUser();
      return;
    }

    hadLiveSession.current = true;
    const typed = asSessionUser(sessionUser!);

    let cancelled = false;
    void (async () => {
      setUser(
        applyHydratedUser({
          sessionUser: typed,
          stored: useAppStore.getState().user,
        }),
      );

      const me = await fetchMeProfile();
      if (cancelled) return;
      setUser(
        applyHydratedUser({
          sessionUser: typed,
          stored: useAppStore.getState().user,
          me,
        }),
      );
    })();

    return () => {
      cancelled = true;
    };
  }, [data?.user?.id, isPending, error, setUser, clearUser]);

  return children;
}
