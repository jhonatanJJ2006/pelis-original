'use client';

import { useEffect } from 'react';
import { useAppStore } from './store';

interface UseUserReturn {
  user: ReturnType<typeof useAppStore>['user'];
  isLoading: boolean;
  logout: () => void;
}

export function useUser(): UseUserReturn {
  const { user, setUser, setLoading, logout: clearStoreUser } = useAppStore();

  useEffect(() => {
    async function fetchUser() {
      try {
        const res = await fetch('/api/auth/currentUser');
        if (res.ok) {
          const data = await res.json();
          if (data) {
            setUser({
              _id: data._id,
              name: data.name ?? 'User',
              email: data.email ?? '',
              image: data.image,
              planId: data.planId,
              planExpiresAt: data.planExpiresAt,
            });
          } else {
            setUser(null);
          }
        } else {
          setUser(null);
        }
      } catch {
        setUser(null);
      } finally {
        setLoading(false);
      }
    }

    fetchUser();
  }, [setUser, setLoading]);

  const logout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    clearStoreUser();
  };

  return {
    user,
    isLoading: user === null && useAppStore.getState().isLoading,
    logout,
  };
}
