'use client';

import { authClient } from './client';
import { useAppStore, type User } from './store';

interface UseUserReturn {
  user: User | null;
  isLoading: boolean;
  logout: () => void;
}

function sessionFallbackUser(sessionUser: {
  id: string;
  name: string;
  email: string;
  image?: string | null;
  emailVerified: boolean;
  role?: string | null;
}): User {
  const role = (sessionUser.role ?? 'USER').toString().toUpperCase();
  return {
    _id: sessionUser.id,
    name: sessionUser.name ?? 'User',
    email: sessionUser.email ?? '',
    image: sessionUser.image ?? undefined,
    role: role === 'ADMIN' ? 'admin' : 'user',
  };
}

function mergeStoredAndSession(
  stored: User | null,
  sessionUser: {
    id: string;
    name: string;
    email: string;
    image?: string | null;
    emailVerified: boolean;
    role?: string | null;
  },
): User {
  const fromSession = sessionFallbackUser(sessionUser);
  if (!stored || stored._id !== fromSession._id) return fromSession;
  return {
    ...fromSession,
    planId: stored.planId,
    planExpiresAt: stored.planExpiresAt,
    role:
      stored.role === 'admin' || fromSession.role === 'admin' ? 'admin' : 'user',
  };
}

export function useUser(): UseUserReturn {
  const { data, isPending } = authClient.useSession();
  const storedUser = useAppStore((state) => state.user);
  const clearUser = useAppStore((state) => state.clearUser);

  const sessionUser = data?.user ?? null;
  const isAuthenticated = Boolean(sessionUser);

  const user: User | null = isAuthenticated
    ? mergeStoredAndSession(storedUser, sessionUser!)
    : isPending
      ? storedUser
      : null;

  const isLoading = isPending && !user;

  const logout = async () => {
    try {
      await authClient.signOut();
    } catch {
      // ignore
    }
    clearUser();
  };

  return {
    user,
    isLoading,
    logout,
  };
}
