'use client';

import { useQuery } from 'convex/react';
import { useAppStore, type User } from './store';
import { api } from '@pelis/convex';
import { useEffect } from 'react';

interface UseUserReturn {
  user: User | null;
  isLoading: boolean;
  logout: () => void;
}

export function useUser(): UseUserReturn {
  const { user, setUser, isLoading } = useAppStore();
  const convexUser = useQuery(api.users.me, {});

  useEffect(() => {
    if (convexUser !== undefined) {
      if (convexUser) {
        setUser({
          _id: convexUser._id,
          name: convexUser.name ?? 'User',
          email: convexUser.email ?? '',
          image: convexUser.image ?? undefined,
          planId: convexUser.planId ?? undefined,
          planExpiresAt: convexUser.planExpiresAt ?? undefined,
        });
      } else {
        setUser(null);
      }
    }
  }, [convexUser, setUser]);

  const logout = async () => {
    try {
      const siteUrl = process.env.NEXT_PUBLIC_CONVEX_SITE_URL;
      await fetch(`${siteUrl}/api/auth/signout`, { method: 'POST' });
    } catch {
      // Ignore
    }
    setUser(null);
  };

  return {
    user,
    isLoading: user === null && isLoading,
    logout,
  };
}
