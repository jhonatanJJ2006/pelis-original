'use client';

import { authClient } from './client';
import { useAppStore } from './store';
import { resolveUseUser } from './session-user';

export { hasActivePlan } from './session-user';

interface UseUserReturn {
  user: ReturnType<typeof resolveUseUser>;
  isLoading: boolean;
  logout: () => void;
}

export function useUser(): UseUserReturn {
  const { data, isPending } = authClient.useSession();
  const storedUser = useAppStore((state) => state.user);
  const clearUser = useAppStore((state) => state.clearUser);

  const sessionUser = data?.user ?? null;
  const user = resolveUseUser({
    sessionUser: sessionUser
      ? {
          id: sessionUser.id,
          name: sessionUser.name,
          email: sessionUser.email,
          image: sessionUser.image,
          emailVerified: sessionUser.emailVerified,
          role: (sessionUser as { role?: string | null }).role,
        }
      : null,
    storedUser,
  });

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
