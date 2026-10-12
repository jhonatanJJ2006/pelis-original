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
  X,
  Radio,
  Sparkles,
} from 'lucide-react';
import { cn } from '@pelis/ui/utils';

const navItems = [
  { href: '/admin', label: 'Panel', icon: LayoutDashboard, enabled: true },
  { href: '/admin/movies', label: 'Películas', icon: Film, enabled: true },
  { href: '/admin/movies/new-releases', label: 'Estrenos', icon: Sparkles, enabled: true },
  { href: '/admin/series', label: 'Series', icon: Tv, enabled: true },
  { href: '/admin/anime', label: 'Anime', icon: Clapperboard, enabled: true },
  { href: '/admin/tv', label: 'TV en directo', icon: Radio, enabled: true },
  { href: '/admin/users', label: 'Usuarios y accesos', icon: Users, enabled: true },
  { href: '/admin/plans', label: 'Planes de suscripción', icon: CreditCard, enabled: true },
];

interface AdminSidebarProps {
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

export function AdminSidebar({ mobileOpen = false, onMobileClose }: AdminSidebarProps) {
  const pathname = usePathname();

  const handleNavClick = () => {
    onMobileClose?.();
  };

  return (
    <aside
      className={cn(
        'fixed inset-y-0 left-0 z-50 w-[min(100vw-3rem,16rem)] sm:w-64 shrink-0 border-r border-cinema-border bg-cinema-bg p-5 flex flex-col gap-6 transition-transform duration-200 ease-out lg:sticky lg:top-0 lg:h-screen lg:translate-x-0',
        mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      )}
      aria-label="Navegación admin"
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <Link
            href="/"
            onClick={handleNavClick}
            className="inline-flex items-center gap-2 text-sm text-cinema-muted hover:text-cinema-chalk transition-colors mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Volver al sitio
          </Link>
          <p className="flex items-center gap-2">
            <span className="font-display text-2xl font-semibold tracking-[0.12em] text-cinema-accent">
              PELIS
            </span>
            <span className="border border-cinema-accent/50 px-1.5 py-0.5 text-[9px] uppercase tracking-[0.2em] text-cinema-accent">
              Maison Noir
            </span>
          </p>
          <p className="text-label uppercase text-cinema-ash mt-2 flex items-center gap-1.5">
            <span className="h-1 w-1 rounded-full bg-cinema-accent" aria-hidden />
            Consola maestra de curatela
          </p>
        </div>
        {onMobileClose && (
          <button
            type="button"
            onClick={onMobileClose}
            className="lg:hidden p-2 rounded-[2px] text-cinema-muted hover:text-cinema-chalk hover:bg-cinema-elevated transition-colors shrink-0"
            aria-label="Cerrar menú"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      <nav className="flex flex-col gap-1 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const matches = (href: string) =>
            href === '/admin' ? pathname === '/admin' : pathname.startsWith(href);
          const bestMatch = navItems
            .filter((n) => matches(n.href))
            .sort((a, b) => b.href.length - a.href.length)[0];
          const isActive = bestMatch?.href === item.href;

          if (!item.enabled) {
            return (
              <span
                key={item.href}
                className="flex items-center gap-3 px-3 py-2.5 rounded-[2px] text-sm text-cinema-ash/60 cursor-not-allowed"
              >
                <Icon className="w-4 h-4 shrink-0" />
                {item.label}
                <span className="ml-auto text-[10px] uppercase tracking-wide">Pronto</span>
              </span>
            );
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={handleNavClick}
              className={cn(
                'relative flex items-center gap-3 px-3 py-2.5 rounded-[2px] text-sm transition-colors border-l-2',
                isActive
                  ? 'border-cinema-accent bg-cinema-accent/10 text-cinema-accent'
                  : 'border-transparent text-cinema-muted hover:text-cinema-chalk hover:bg-cinema-elevated/60'
              )}
            >
              <Icon className={cn('w-4 h-4 shrink-0', isActive && 'text-cinema-accent')} />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
