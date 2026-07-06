'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
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
} from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { useUser } from '@pelis/auth/hooks';
import { Button } from '@pelis/ui/components';

export function Header() {
  const { user, logout } = useUser();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const searchRef = useRef<HTMLInputElement>(null);

  const navItems = [
    { href: '/', label: 'Inicio', icon: Home },
    { href: '/movies', label: 'Pel&iacute;culas', icon: Film },
    { href: '/favorites', label: 'Favoritos', icon: Heart },
    { href: '/history', label: 'Historial', icon: History },
  ];

  const hasActivePlan = user?.planExpiresAt && user.planExpiresAt > Date.now();

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

  return (
    <header className="sticky top-0 z-50 bg-dark-300/95 backdrop-blur-md border-b border-slate-800/50">
      <nav className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <Link href="/" className="flex items-center gap-2 shrink-0">
            <div className="w-9 h-9 bg-gradient-to-br from-primary-500 to-purple-600 rounded-xl flex items-center justify-center">
              <Film className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold bg-gradient-to-r from-primary-400 to-purple-500 bg-clip-text text-transparent">
              Pelis
            </span>
          </Link>

          <div className="hidden md:flex items-center gap-1 flex-1 max-w-md mx-8">
            <form onSubmit={handleSearch} className="w-full relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar pel&iacute;culas..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-dark-200/80 border border-slate-700/50 rounded-lg py-2 pl-10 pr-4 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-transparent transition-all"
              />
            </form>
          </div>

          <div className="hidden md:flex items-center gap-3">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors hover:bg-dark-100 text-slate-300 hover:text-white"
              >
                <item.icon className="w-4 h-4" />
                <span className="hidden lg:inline">{item.label}</span>
              </Link>
            ))}
          </div>

          <div className="hidden md:flex items-center gap-3">
            {!hasActivePlan && user && (
              <Link href="/subscribe">
                <button className="flex items-center gap-1.5 px-3 py-2 bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-400 hover:to-orange-400 text-black rounded-lg text-sm font-semibold transition-all hover:scale-105">
                  <Crown className="w-4 h-4" />
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
                      alt={user.name}
                      className="w-8 h-8 rounded-full ring-2 ring-primary-500/30"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-primary-600 flex items-center justify-center">
                      <User className="w-4 h-4 text-white" />
                    </div>
                  )}
                  <span className="text-sm text-slate-300 hidden lg:inline">{user.name}</span>
                </div>
                <button
                  onClick={logout}
                  className="p-2 text-slate-400 hover:text-red-400 transition-colors rounded-lg hover:bg-dark-100"
                  title="Cerrar sesi&oacute;n"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <Link href="/auth/login">
                <Button size="sm">Iniciar sesi&oacute;n</Button>
              </Link>
            )}
          </div>

          <div className="flex md:hidden items-center gap-2">
            <button
              onClick={() => setSearchOpen(!searchOpen)}
              className="p-2 text-slate-400 hover:text-white transition-colors"
            >
              <Search className="w-5 h-5" />
            </button>
            <button
              className="p-2 text-slate-400 hover:text-white"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {searchOpen && (
          <div className="md:hidden pb-4">
            <form onSubmit={handleSearch}>
              <input
                ref={searchRef}
                type="text"
                placeholder="Buscar pel&iacute;culas..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-dark-200 border border-slate-700 rounded-lg py-2.5 px-4 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </form>
          </div>
        )}

        {mobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-slate-800 animate-slide-up">
            <div className="flex flex-col gap-1">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-3 px-4 py-3 rounded-lg transition-colors hover:bg-dark-100 text-slate-300 hover:text-white"
                >
                  <item.icon className="w-5 h-5" />
                  {item.label}
                </Link>
              ))}

              {!hasActivePlan && user && (
                <Link
                  href="/subscribe"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-3 px-4 py-3 text-yellow-400 font-medium"
                >
                  <Crown className="w-5 h-5" />
                  Premium
                </Link>
              )}

              <div className="border-t border-slate-800 mt-2 pt-2">
                {user ? (
                  <div className="px-4 py-3">
                    <div className="flex items-center gap-3 mb-2">
                      {user.image ? (
                        <img src={user.image} alt={user.name} className="w-8 h-8 rounded-full" />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-primary-600 flex items-center justify-center">
                          <User className="w-4 h-4 text-white" />
                        </div>
                      )}
                      <span className="text-sm text-slate-300">{user.name}</span>
                    </div>
                    <button
                      onClick={() => {
                        logout();
                        setMobileMenuOpen(false);
                      }}
                      className="flex items-center gap-3 px-4 py-3 text-slate-400 hover:text-red-400 w-full text-left"
                    >
                      <LogOut className="w-5 h-5" />
                      Cerrar sesi&oacute;n
                    </button>
                  </div>
                ) : (
                  <Link
                    href="/auth/login"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center gap-3 px-4 py-3 bg-primary-600 text-white rounded-lg mx-4"
                  >
                    Iniciar sesi&oacute;n
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
