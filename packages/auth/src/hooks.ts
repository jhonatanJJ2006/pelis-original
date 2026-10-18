'use client';

import { useSyncExternalStore } from 'react';
import { authClient } from './client';
import { useAppStore } from './store';
import { resolveUseUser } from './session-user';

export { canStream, hasActivePlan } from './session-user';

interface UseUserReturn {
  user: ReturnType<typeof resolveUseUser>;
  isLoading: boolean;
  logout: () => void;
}

const noopSubscribe = () => () => {};

/**
 * false en el servidor y durante la hidratación, true después. Evita el error
 * #418: la sesión (store persistido o useSession ya resuelto) puede estar
 * lista antes de que React hidrate un Suspense, y el HTML del servidor siempre
 * se generó sin usuario.
 */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false
  );
}

export function useUser(): UseUserReturn {
  const hydrated = useHydrated();
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

  if (!hydrated) {
    // Igual que el render del servidor (sin sesión).
    return { user: null, isLoading: false, logout };
  }

  return {
    user,
    isLoading,
    logout,
  };
}
