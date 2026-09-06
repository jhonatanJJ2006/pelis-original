'use client';

import { ReactNode } from 'react';
import { AuthSessionSync } from '@pelis/auth/session-sync';
import { PwaRuntime } from '@/components/pwa-runtime';

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <AuthSessionSync>
      {children}
      <PwaRuntime />
    </AuthSessionSync>
  );
}
