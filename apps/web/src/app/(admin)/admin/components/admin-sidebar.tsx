'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Film,
  LayoutDashboard,
  Tv,
  Clapperboard,
  Users,
  CreditCard,
  ArrowLeft,
} from 'lucide-react';
import { cn } from '@pelis/ui/utils';

const navItems = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard, enabled: true },
  { href: '/admin/movies', label: 'Películas', icon: Film, enabled: true },
  { href: '/admin/series', label: 'Series', icon: Tv, enabled: false },
  { href: '/admin/anime', label: 'Anime', icon: Clapperboard, enabled: false },
  { href: '/admin/users', label: 'Usuarios', icon: Users, enabled: false },
  { href: '/admin/plans', label: 'Planes', icon: CreditCard, enabled: false },
];

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 shrink-0 border-r border-cinema-border bg-cinema-surface/50 min-h-screen p-5 flex flex-col gap-6">
      <div>
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-cinema-muted hover:text-white transition-colors mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver al sitio
        </Link>
        <h1 className="font-display text-2xl tracking-wide text-white uppercase">Admin</h1>
        <p className="text-xs text-cinema-ash mt-1">Panel de administración</p>
      </div>

      <nav className="flex flex-col gap-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            item.href === '/admin'
              ? pathname === '/admin'
              : pathname.startsWith(item.href);

          if (!item.enabled) {
            return (
              <span
                key={item.href}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-cinema-ash/60 cursor-not-allowed"
              >
                <Icon className="w-4 h-4" />
                {item.label}
                <span className="ml-auto text-[10px] uppercase tracking-wide">Pronto</span>
              </span>
            );
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors',
                isActive
                  ? 'bg-cinema-violet/20 text-white border border-cinema-violet/30'
                  : 'text-cinema-muted hover:text-white hover:bg-cinema-elevated/60'
              )}
            >
              <Icon className="w-4 h-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
