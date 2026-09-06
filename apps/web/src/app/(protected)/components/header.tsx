'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Home, Film, User, Crown, Search, Tv, Radio, Clapperboard } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { useUser } from '@pelis/auth/hooks';
import { Button } from '@pelis/ui/components';
import { cn } from '@pelis/ui/utils';
import { SearchDropdown } from './search-dropdown';

const navItems = [
  { href: '/', label: 'Inicio', icon: Home, exact: true },
  { href: '/movies', label: 'Películas', icon: Film },
  { href: '/series', label: 'Series', icon: Tv },
  { href: '/tv', label: 'TV', icon: Radio },
  { href: '/anime', label: 'Anime', icon: Clapperboard },
];

interface HeaderProps {
  sticky?: boolean;
  minimalNav?: boolean;
  tvMode?: boolean;
}

export function Header({ sticky = true, minimalNav = false, tvMode = false }: HeaderProps) {
  const { user } = useUser();
  const router = useRouter();
  const pathname = usePathname();
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const searchRef = useRef<HTMLInputElement>(null);

  const hasActivePlan = !!(user?.planExpiresAt && user.planExpiresAt > Date.now());

  useEffect(() => {
    if (searchOpen && searchRef.current) {
      searchRef.current.focus();
    }
  }, [searchOpen]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/movies?search=${encodeURIComponent(searchQuery.trim())}`);
      setSearchOpen(false);
      setSearchQuery('');
    }
  };

  const isActive = (href: string, exact?: boolean) => {
    if (exact) return pathname === href;
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  return (
    <header
      className={cn(
        sticky ? 'sticky top-0 z-50' : 'relative z-50',
        'glass-strong border-b border-cinema-border/50'
      )}
    >
      <nav className="container mx-auto px-4" aria-label="Principal">
        <div className="flex items-center justify-between h-16">
          <Link
            href={tvMode ? '/tv' : '/'}
            className="flex items-center gap-2.5 shrink-0 group tv-focus"
          >
            <div className="w-9 h-9 rounded bg-gradient-to-br from-cinema-accent to-cinema-gold flex items-center justify-center shadow-glow group-hover:scale-105 transition-transform duration-200">
              <Film className="w-5 h-5 text-cinema-bg" />
            </div>
            <span className="font-display text-2xl tracking-tight text-cinema-chalk">Pelis</span>
          </Link>

          <div
            className={cn(
              'hidden lg:flex items-center gap-1 flex-1 max-w-md mx-8',
              (minimalNav || tvMode) && 'lg:hidden'
            )}
          >
            <SearchDropdown
              value={searchQuery}
              onChange={setSearchQuery}
              onSubmit={handleSearch}
              id="header-search"
            />
          </div>

          {minimalNav && (
            <div className="hidden md:flex flex-1 max-w-md mx-3">
              <SearchDropdown
                value={searchQuery}
                onChange={setSearchQuery}
                onSubmit={handleSearch}
                id="header-search-mobile-pwa"
              />
            </div>
          )}

          {!minimalNav && (
            <div className="hidden md:flex items-center gap-0.5">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-2 rounded text-sm font-medium transition-all duration-200 tv-focus',
                    tvMode && 'px-4 py-3 text-base',
                    isActive(item.href, item.exact)
                      ? 'bg-cinema-accent/15 text-cinema-accent-light'
                      : 'text-cinema-silver hover:text-cinema-chalk hover:bg-cinema-elevated/50'
                  )}
                >
                  <item.icon className="w-4 h-4" aria-hidden />
                  <span className="hidden xl:inline">{item.label}</span>
                </Link>
              ))}
            </div>
          )}

          <div className={cn('hidden md:flex items-center gap-3', minimalNav && 'hidden')}>
            {user && (
              <Link href="/subscribe">
                <button
                  type="button"
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-2 rounded text-sm font-bold transition-all duration-200',
                    hasActivePlan
                      ? 'bg-cinema-elevated border border-cinema-gold/40 text-cinema-gold hover:bg-cinema-gold/10'
                      : 'bg-gradient-to-r from-cinema-gold to-cinema-gold-light text-black hover:brightness-110 shadow-[0_4px_16px_rgba(245,200,66,0.25)]'
                  )}
                >
                  <Crown className="w-4 h-4" aria-hidden />
                  <span className="hidden lg:inline">
                    {hasActivePlan ? 'Suscripción' : 'Premium'}
                  </span>
                </button>
              </Link>
            )}

            {user ? (
              <Link
                href="/profile"
                className={cn(
                  'flex items-center gap-2 rounded-full p-0.5 transition-all',
                  'hover:ring-2 hover:ring-cinema-accent/50',
                  isActive('/profile') && 'ring-2 ring-cinema-accent/60'
                )}
                aria-label="Ir a mi perfil"
              >
                {user.image ? (
                  <img
                    src={user.image}
                    alt=""
                    className="w-9 h-9 rounded-full ring-2 ring-cinema-accent/50"
                  />
                ) : (
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-cinema-accent to-cinema-gold flex items-center justify-center ring-2 ring-cinema-accent/50">
                    <User className="w-4 h-4 text-cinema-bg" aria-hidden />
                  </div>
                )}
                <span className="text-sm text-cinema-muted hidden lg:inline max-w-[120px] truncate pr-1">
                  {user.name}
                </span>
              </Link>
            ) : (
              <Link href="/login">
                <Button size="sm">Iniciar sesión</Button>
              </Link>
            )}
          </div>

          <div className={cn('flex md:hidden items-center gap-1 shrink-0', tvMode && 'hidden')}>
            {user && (
              <Link
                href="/subscribe"
                className={cn(
                  'p-2.5 rounded-xl transition-colors',
                  hasActivePlan
                    ? 'text-cinema-gold hover:bg-cinema-gold/10'
                    : 'text-cinema-gold hover:bg-cinema-elevated/50'
                )}
                aria-label="Suscripciones"
              >
                <Crown className="w-5 h-5" />
              </Link>
            )}
            <button
              type="button"
              onClick={() => setSearchOpen(!searchOpen)}
              className="p-2.5 text-cinema-silver hover:text-white transition-colors rounded-xl"
              aria-label="Buscar"
              aria-expanded={searchOpen}
            >
              <Search className="w-5 h-5" />
            </button>
          </div>
        </div>

        {searchOpen && (
          <div className="md:hidden pb-4 animate-slide-down px-1">
            <SearchDropdown
              value={searchQuery}
              onChange={setSearchQuery}
              onSubmit={handleSearch}
              inputRef={searchRef}
              id="mobile-search"
            />
          </div>
        )}

        {searchOpen && !minimalNav && (
          <div className="hidden md:block lg:hidden pb-4 animate-slide-down">
            <SearchDropdown
              value={searchQuery}
              onChange={setSearchQuery}
              onSubmit={handleSearch}
              inputRef={searchRef}
              id="tablet-search"
            />
          </div>
        )}
      </nav>
    </header>
  );
}
