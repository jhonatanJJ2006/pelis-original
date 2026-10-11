'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Search, Radio, User, Sparkles } from 'lucide-react';
import { cn } from '@pelis/ui/utils';
import { getTabIndex, TAB_ROUTES } from '@/lib/tab-navigation';

const tabs = [
  { href: TAB_ROUTES[0], label: 'Inicio', icon: Home, exact: true },
  { href: TAB_ROUTES[1], label: 'Buscar', icon: Search },
  { href: TAB_ROUTES[2], label: 'Anime', icon: Sparkles },
  { href: TAB_ROUTES[3], label: 'TV', icon: Radio },
  { href: TAB_ROUTES[4], label: 'Perfil', icon: User },
] as const;

export function BottomTabBar() {
  const pathname = usePathname();
  const activeIndex = getTabIndex(pathname);

  return (
    <nav
      className="fixed bottom-0 inset-x-0 z-50 md:hidden border-t border-cinema-border/80 bg-cinema-bg/95 backdrop-blur-xl pb-[env(safe-area-inset-bottom)]"
      aria-label="Navegación principal"
    >
      <div className="flex items-center justify-around h-[4.25rem] max-w-lg mx-auto px-1">
        {tabs.map((tab, index) => {
          const Icon = tab.icon;
          const isActive = activeIndex === index;

          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                'relative flex flex-1 flex-col items-center justify-center gap-0.5 h-14 transition-colors duration-200',
                isActive
                  ? 'text-cinema-accent'
                  : 'text-cinema-ash active:scale-95 hover:text-cinema-muted'
              )}
              aria-label={tab.label}
              aria-current={isActive ? 'page' : undefined}
            >
              {isActive && (
                <span
                  className="absolute top-0 inset-x-4 h-0.5 rounded-full bg-cinema-accent"
                  aria-hidden
                />
              )}
              <Icon className="relative w-[22px] h-[22px]" aria-hidden />
              <span className="text-[10px] font-medium leading-none">{tab.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
