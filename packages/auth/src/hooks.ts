'use client';

import { useQuery, useConvexAuth } from 'convex/react';
import { useAppStore, type User } from './store';
import { api } from '@pelis/convex';
import { getAuthApiBase } from './convex-site';
import { useEffect } from 'react';

interface UseUserReturn {
  user: User | null;
  isLoading: boolean;
  logout: () => void;
}

export function useUser(): UseUserReturn {
  const { user, setUser, isLoading } = useAppStore();
  const { isAuthenticated, isLoading: isAuthLoading } = useConvexAuth();
  const convexUser = useQuery(api.users.me, {});

  useEffect(() => {
    if (!isAuthLoading && !isAuthenticated) {
      setUser(null);
      return;
    }

    if (convexUser) {
      setUser({
        _id: convexUser._id,
        name: convexUser.name ?? 'User',
        email: convexUser.email ?? '',
        image: convexUser.image ?? undefined,
        role: convexUser.role ?? 'user',
        planId: convexUser.planId ?? undefined,
        planExpiresAt: convexUser.planExpiresAt ?? undefined,
      });
    }
  }, [convexUser, setUser, isAuthenticated, isAuthLoading]);

  const logout = async () => {
    try {
      await fetch(`${getAuthApiBase()}/signout`, {
        method: 'POST',
        credentials: 'include',
      });
    } catch {
      // Ignore
    }
    setUser(null);
  };

  const resolvedUser = isAuthenticated ? user : null;

  return {
    user: resolvedUser,
    isLoading:
      isAuthLoading ||
      (isAuthenticated && convexUser === undefined) ||
      (resolvedUser === null && isLoading),
    logout,
  };
}
