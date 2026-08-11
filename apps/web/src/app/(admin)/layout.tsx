'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { Menu } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useUser } from '@pelis/auth/hooks';
import { Skeleton } from '@pelis/ui/components';
import { AdminSidebar } from './admin/components/admin-sidebar';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useUser();
  const router = useRouter();
  const pathname = usePathname();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  useEffect(() => {
    setMobileNavOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (isLoading) return;
    if (!user) {
      router.replace('/login');
      return;
    }
    if (user.role !== 'admin') {
      router.replace('/');
    }
  }, [user, isLoading, router]);

  useEffect(() => {
    if (!mobileNavOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMobileNavOpen(false);
    };
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = '';
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [mobileNavOpen]);

  if (isLoading || !user) {
    return (
      <div className="min-h-screen bg-cinema-bg flex flex-col lg:flex-row" aria-busy="true" aria-label="Cargando">
        <Skeleton className="hidden lg:block w-64 h-screen shrink-0 rounded-none" />
        <main className="flex-1 p-4 sm:p-6 md:p-8 space-y-6">
          <Skeleton className="h-9 w-48" />
          <Skeleton className="h-64 w-full rounded-2xl" />
        </main>
      </div>
    );
  }

  if (user.role !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-cinema-bg" aria-busy="true">
        <Skeleton className="h-8 w-48" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cinema-bg flex flex-col lg:flex-row">
      {mobileNavOpen && (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-black/60 lg:hidden"
          aria-label="Cerrar menú"
          onClick={() => setMobileNavOpen(false)}
        />
      )}

      <header className="lg:hidden sticky top-0 z-30 flex items-center gap-3 px-4 py-3 border-b border-cinema-border bg-cinema-surface/95 backdrop-blur-xl">
        <button
          type="button"
          onClick={() => setMobileNavOpen(true)}
          className="p-2 -ml-2 rounded-lg text-cinema-muted hover:text-white hover:bg-cinema-elevated transition-colors"
          aria-label="Abrir menú"
          aria-expanded={mobileNavOpen}
        >
          <Menu className="w-5 h-5" />
        </button>
        <span className="font-display text-lg tracking-wide text-white uppercase truncate">
          Admin
        </span>
        <Link
          href="/"
          className="ml-auto text-xs sm:text-sm text-cinema-muted hover:text-white transition-colors shrink-0"
        >
          Ir al sitio
        </Link>
      </header>

      <AdminSidebar
        mobileOpen={mobileNavOpen}
        onMobileClose={() => setMobileNavOpen(false)}
      />

      <main className="flex-1 min-w-0 p-4 sm:p-6 md:p-8 pb-[max(1rem,env(safe-area-inset-bottom))]">
        {children}
      </main>
    </div>
  );
}
