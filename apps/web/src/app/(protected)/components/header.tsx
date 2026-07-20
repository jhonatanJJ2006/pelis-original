'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Home,
  Film,
  Heart,
  History,
  User,
  Menu,
  X,
  LogOut,
  Crown,
  Search,
  Tv,
  Radio,
  Clapperboard,
} from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { toast } from 'sonner';
import { useUser } from '@pelis/auth/hooks';
import { Button } from '@pelis/ui/components';
import { cn } from '@pelis/ui/utils';

const navItems = [
  { href: '/', label: 'Inicio', icon: Home, exact: true },
  { href: '/movies', label: 'Películas', icon: Film },
  { href: '/series', label: 'Series', icon: Tv },
  { href: '/tv', label: 'TV', icon: Radio },
  { href: '/anime', label: 'Anime', icon: Clapperboard },
  { href: '/favorites', label: 'Favoritos', icon: Heart },
  { href: '/history', label: 'Historial', icon: History },
];

interface HeaderProps {
  sticky?: boolean;
}

export function Header({ sticky = true }: HeaderProps) {
  const { user, logout } = useUser();
  const router = useRouter();
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const searchRef = useRef<HTMLInputElement>(null);

  const hasActivePlan = user?.planExpiresAt && user.planExpiresAt > Date.now();

  const handleLogout = () => {
    logout();
    toast.success('Sesión cerrada correctamente');
    router.push('/login');
  };

  useEffect(() => {
    if (searchOpen && searchRef.current) {
      searchRef.current.focus();
    }
  }, [searchOpen]);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

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
        sticky && 'sticky top-0 z-50',
        'glass-strong border-b border-cinema-border/50'
      )}
    >
      <nav className="container mx-auto px-4" aria-label="Principal">
        <div className="flex items-center justify-between h-16">
          <Link href="/" className="flex items-center gap-2.5 shrink-0 group">
            <div className="w-9 h-9 rounded bg-gradient-to-br from-cinema-violet to-cinema-teal flex items-center justify-center shadow-glow-violet group-hover:scale-105 transition-transform duration-200">
              <Film className="w-5 h-5 text-white" />
            </div>
            <span className="font-display text-2xl tracking-widest text-gradient-accent uppercase">
              Pelis
            </span>
          </Link>

          <div className="hidden lg:flex items-center gap-1 flex-1 max-w-md mx-8">
            <form onSubmit={handleSearch} className="w-full relative" role="search">
              <label htmlFor="header-search" className="sr-only">
                Buscar películas y series
              </label>
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-cinema-ash"
                aria-hidden
              />
              <input
                id="header-search"
                type="search"
                placeholder="Buscar películas y series..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-cinema-surface/80 border border-cinema-border rounded py-2.5 pl-10 pr-4 text-sm text-white placeholder-cinema-ash focus:outline-none focus:ring-2 focus:ring-cinema-accent/50 focus:border-cinema-accent/40 transition-all"
              />
            </form>
          </div>

          <div className="hidden md:flex items-center gap-0.5">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-2 rounded text-sm font-medium transition-all duration-200',
                  isActive(item.href, item.exact)
                    ? 'bg-cinema-violet/20 text-cinema-violet-light'
                    : 'text-cinema-silver hover:text-white hover:bg-cinema-elevated/50'
                )}
              >
                <item.icon className="w-4 h-4" aria-hidden />
                <span className="hidden xl:inline">{item.label}</span>
              </Link>
            ))}
          </div>

          <div className="hidden md:flex items-center gap-3">
            {!hasActivePlan && user && (
              <Link href="/subscribe">
                <button
                  type="button"
                  className="flex items-center gap-1.5 px-3 py-2 bg-gradient-to-r from-cinema-gold to-cinema-gold-light text-black rounded text-sm font-bold transition-all duration-200 hover:brightness-110 shadow-[0_4px_16px_rgba(245,200,66,0.25)]"
                >
                  <Crown className="w-4 h-4" aria-hidden />
                  <span className="hidden lg:inline">Premium</span>
                </button>
              </Link>
            )}

            {user ? (
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-2">
                  {user.image ? (
                    <img
                      src={user.image}
                      alt=""
                      className="w-8 h-8 rounded-full ring-2 ring-cinema-violet/50"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cinema-accent to-cinema-violet flex items-center justify-center">
                      <User className="w-4 h-4 text-white" aria-hidden />
                    </div>
                  )}
                  <span className="text-sm text-cinema-muted hidden lg:inline max-w-[120px] truncate">
                    {user.name}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="p-2 text-cinema-silver hover:text-cinema-accent transition-colors rounded hover:bg-cinema-elevated/50"
                  aria-label="Cerrar sesión"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <Link href="/login">
                <Button size="sm">Iniciar sesión</Button>
              </Link>
            )}
          </div>

          <div className="flex md:hidden items-center gap-2">
            <button
              type="button"
              onClick={() => setSearchOpen(!searchOpen)}
              className="p-2 text-cinema-silver hover:text-white transition-colors rounded"
              aria-label="Buscar"
              aria-expanded={searchOpen}
            >
              <Search className="w-5 h-5" />
            </button>
            <button
              type="button"
              className="p-2 text-cinema-silver hover:text-white rounded"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label={mobileMenuOpen ? 'Cerrar menú' : 'Abrir menú'}
              aria-expanded={mobileMenuOpen}
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {searchOpen && (
          <div className="lg:hidden pb-4 animate-slide-down">
            <form onSubmit={handleSearch} role="search">
              <label htmlFor="mobile-search" className="sr-only">
                Buscar
              </label>
              <input
                ref={searchRef}
                id="mobile-search"
                type="search"
                placeholder="Buscar películas y series..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="input-field"
              />
            </form>
          </div>
        )}

        {mobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-cinema-border animate-slide-up">
            <div className="flex flex-col gap-1">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'flex items-center gap-3 px-4 py-3 rounded-xl transition-colors',
                    isActive(item.href, item.exact)
                      ? 'bg-cinema-accent/15 text-cinema-accent-light'
                      : 'text-cinema-silver hover:text-white hover:bg-cinema-elevated/50'
                  )}
                >
                  <item.icon className="w-5 h-5" aria-hidden />
                  {item.label}
                </Link>
              ))}

              {!hasActivePlan && user && (
                <Link
                  href="/subscribe"
                  className="flex items-center gap-3 px-4 py-3 text-cinema-gold font-semibold"
                >
                  <Crown className="w-5 h-5" aria-hidden />
                  Premium
                </Link>
              )}

              <div className="border-t border-cinema-border mt-2 pt-2">
                {user ? (
                  <div className="px-4 py-3">
                    <div className="flex items-center gap-3 mb-2">
                      {user.image ? (
                        <img src={user.image} alt="" className="w-8 h-8 rounded-full" />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-cinema-accent flex items-center justify-center">
                          <User className="w-4 h-4 text-white" aria-hidden />
                        </div>
                      )}
                      <span className="text-sm text-cinema-muted">{user.name}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        handleLogout();
                        setMobileMenuOpen(false);
                      }}
                      className="flex items-center gap-3 px-4 py-3 text-cinema-silver hover:text-red-400 w-full text-left rounded-lg hover:bg-cinema-elevated/50"
                    >
                      <LogOut className="w-5 h-5" aria-hidden />
                      Cerrar sesión
                    </button>
                  </div>
                ) : (
                  <Link
                    href="/login"
                    className="flex items-center justify-center gap-3 px-4 py-3 bg-cinema-accent text-white rounded-xl mx-4 font-medium"
                  >
                    Iniciar sesión
                  </Link>
                )}
              </div>
            </div>
          </div>
        )}
      </nav>
    </header>
  );
}
