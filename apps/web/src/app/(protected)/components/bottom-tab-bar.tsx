'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Film, Tv, Radio, User } from 'lucide-react';
import { cn } from '@pelis/ui/utils';
import { getTabIndex, TAB_ROUTES } from '@/lib/tab-navigation';

const tabs = [
  { href: TAB_ROUTES[0], label: 'Inicio', icon: Home, exact: true },
  { href: TAB_ROUTES[1], label: 'Películas', icon: Film },
  { href: TAB_ROUTES[2], label: 'Series', icon: Tv },
  { href: TAB_ROUTES[3], label: 'TV', icon: Radio },
  { href: TAB_ROUTES[4], label: 'Perfil', icon: User },
] as const;

export function BottomTabBar() {
  const pathname = usePathname();
  const activeIndex = getTabIndex(pathname);

  return (
    <nav
      className="fixed bottom-0 inset-x-0 z-50 border-t border-cinema-border bg-cinema-surface/95 backdrop-blur-md pb-[env(safe-area-inset-bottom)]"
      aria-label="Navegación principal"
    >
      <div className="flex items-stretch justify-around h-16 max-w-lg mx-auto">
        {tabs.map((tab, index) => {
          const Icon = tab.icon;
          const isActive = activeIndex === index;

          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                'flex flex-1 flex-col items-center justify-center gap-1 min-w-0 px-1 transition-colors',
                isActive ? 'text-cinema-violet-light' : 'text-cinema-ash hover:text-cinema-muted'
              )}
              aria-current={isActive ? 'page' : undefined}
            >
              <Icon className={cn('w-5 h-5', isActive && 'scale-110')} aria-hidden />
              <span className="text-[10px] font-medium truncate w-full text-center">{tab.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
