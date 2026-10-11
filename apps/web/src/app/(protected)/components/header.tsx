'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { User, Crown, Search } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { useUser } from '@pelis/auth/hooks';
import { Button } from '@pelis/ui/components';
import { cn } from '@pelis/ui/utils';
import { SearchDropdown } from './search-dropdown';

const navItems = [
  { href: '/', label: 'Inicio', exact: true },
  { href: '/movies', label: 'Películas' },
  { href: '/series', label: 'Series' },
  { href: '/tv', label: 'TV en vivo' },
  { href: '/anime', label: 'Anime' },
  { href: '/favorites', label: 'Mi lista' },
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

  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

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
        'transition-[background-color,border-color,backdrop-filter] duration-normal',
        scrolled || searchOpen
          ? 'bg-cinema-bg/92 backdrop-blur-xl border-b border-cinema-border/60'
          : 'bg-gradient-to-b from-cinema-bg/90 via-cinema-bg/50 to-transparent border-b border-transparent'
      )}
    >
      <nav className="container mx-auto px-4" aria-label="Principal">
        <div className="flex items-center justify-between h-16">
          <Link
            href={tvMode ? '/tv' : '/'}
            className="flex items-center gap-2.5 shrink-0 group tv-focus"
          >
            <span className="font-display text-2xl font-semibold tracking-[0.12em] text-cinema-accent group-hover:text-cinema-accent-light transition-colors">
              PELIS
            </span>
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
                    'relative flex items-center gap-1.5 px-3 py-2 text-sm font-medium transition-colors duration-200 tv-focus',
                    tvMode && 'px-4 py-3 text-base',
                    isActive(item.href, item.exact)
                      ? 'text-cinema-chalk after:absolute after:inset-x-3 after:-bottom-0.5 after:h-0.5 after:rounded-full after:bg-cinema-accent'
                      : 'text-cinema-muted hover:text-cinema-chalk'
                  )}
                >
                  <span>{item.label}</span>
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
                      ? 'border border-cinema-accent/40 text-cinema-accent hover:bg-cinema-accent/10'
                      : 'bg-cinema-accent text-cinema-bg hover:bg-cinema-accent-light'
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
