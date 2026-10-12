'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { Menu } from 'lucide-react';
import { AdminSidebar } from './admin/components/admin-sidebar';

export function AdminChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  useEffect(() => {
    setMobileNavOpen(false);
  }, [pathname]);

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

      <header className="lg:hidden sticky top-0 z-30 flex items-center gap-3 px-4 py-3 border-b border-cinema-border bg-cinema-bg/95 backdrop-blur-xl">
        <button
          type="button"
          onClick={() => setMobileNavOpen(true)}
          className="p-2 -ml-2 rounded-[2px] text-cinema-muted hover:text-cinema-chalk hover:bg-cinema-elevated transition-colors"
          aria-label="Abrir menú"
          aria-expanded={mobileNavOpen}
        >
          <Menu className="w-5 h-5" />
        </button>
        <span className="font-display text-lg font-semibold tracking-[0.12em] text-cinema-accent truncate">
          PELIS <span className="font-sans text-label uppercase text-cinema-ash">Admin</span>
        </span>
        <Link
          href="/"
          className="ml-auto text-xs sm:text-sm text-cinema-muted hover:text-cinema-chalk transition-colors shrink-0"
        >
          Ir al sitio
        </Link>
      </header>

      <AdminSidebar mobileOpen={mobileNavOpen} onMobileClose={() => setMobileNavOpen(false)} />

      <main className="flex-1 min-w-0 p-4 sm:p-6 md:p-8 lg:px-10 pb-[max(1rem,env(safe-area-inset-bottom))]">
        {children}
      </main>
    </div>
  );
}
