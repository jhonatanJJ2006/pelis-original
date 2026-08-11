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
} from 'lucide-react';
import { cn } from '@pelis/ui/utils';

const navItems = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard, enabled: true },
  { href: '/admin/movies', label: 'Películas', icon: Film, enabled: true },
  { href: '/admin/series', label: 'Series', icon: Tv, enabled: true },
  { href: '/admin/anime', label: 'Anime', icon: Clapperboard, enabled: true },
  { href: '/admin/tv', label: 'Canales TV', icon: Radio, enabled: true },
  { href: '/admin/users', label: 'Usuarios', icon: Users, enabled: true },
  { href: '/admin/plans', label: 'Planes', icon: CreditCard, enabled: true },
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
        'fixed inset-y-0 left-0 z-50 w-[min(100vw-3rem,16rem)] sm:w-64 shrink-0 border-r border-cinema-border bg-cinema-surface p-5 flex flex-col gap-6 transition-transform duration-200 ease-out lg:static lg:translate-x-0 lg:min-h-screen lg:bg-cinema-surface/50',
        mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      )}
      aria-label="Navegación admin"
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <Link
            href="/"
            onClick={handleNavClick}
            className="inline-flex items-center gap-2 text-sm text-cinema-muted hover:text-white transition-colors mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Volver al sitio
          </Link>
          <h1 className="font-display text-2xl tracking-wide text-white uppercase">Admin</h1>
          <p className="text-xs text-cinema-ash mt-1">Panel de administración</p>
        </div>
        {onMobileClose && (
          <button
            type="button"
            onClick={onMobileClose}
            className="lg:hidden p-2 rounded-lg text-cinema-muted hover:text-white hover:bg-cinema-elevated transition-colors shrink-0"
            aria-label="Cerrar menú"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      <nav className="flex flex-col gap-1 overflow-y-auto">
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
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors',
                isActive
                  ? 'bg-cinema-violet/20 text-white border border-cinema-violet/30'
                  : 'text-cinema-muted hover:text-white hover:bg-cinema-elevated/60'
              )}
            >
              <Icon className="w-4 h-4 shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
