'use client';

import { ReactNode } from 'react';
import { AuthSessionSync } from '@pelis/auth/session-sync';

export function AppProviders({ children }: { children: ReactNode }) {
  return <AuthSessionSync>{children}</AuthSessionSync>;
}
