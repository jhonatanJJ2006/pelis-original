'use client';

import { ReactNode, useEffect } from 'react';
import { authClient } from '@/lib/auth-client';

export function AppProviders({ children }: { children: ReactNode }) {
  useEffect(() => {
    // Eagerly trigger any auth session bootstrap the SDK performs.
    void authClient.getSession();
  }, []);
  return <>{children}</>;
}