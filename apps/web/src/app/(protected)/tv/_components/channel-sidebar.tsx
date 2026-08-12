'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Search, Tv, X } from 'lucide-react';
import { cn } from '@pelis/ui/utils';

export interface SidebarChannel {
  _id: string;
  name: string;
  logo: string;
  category: string;
  country?: string;
  language?: string;
  source?: string;
}

interface ChannelSidebarProps {
  channels: SidebarChannel[];
  currentId?: string;
  onClose: () => void;
}

export function ChannelSidebar({ channels, currentId, onClose }: ChannelSidebarProps) {
  const [search, setSearch] = useState('');
  const router = useRouter();

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return channels;
    return channels.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.category.toLowerCase().includes(q) ||
        (c.country || '').toLowerCase().includes(q)
    );
  }, [channels, search]);

  const grouped = useMemo(() => {
    const groups: Record<string, SidebarChannel[]> = {};
    for (const c of filtered) {
      const key = c.category || 'General';
      if (!groups[key]) groups[key] = [];
      groups[key].push(c);
    }
    return Object.entries(groups).sort((a, b) => a[0].localeCompare(b[0]));
  }, [filtered]);

  // Cerrar con tecla Escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const handleSelect = (id: string) => {
    onClose();
    if (id !== currentId) {
      router.push(`/tv/${id}`);
    }
  };

  return (
    <>
      <div
        className="fixed inset-0 z-[60] bg-black/70 backdrop-blur-sm animate-in fade-in"
        onClick={onClose}
        aria-hidden="true"
      />
      <aside
        className={cn(
          'fixed inset-y-0 right-0 z-[70] w-full sm:w-96 md:w-[26rem]',
          'bg-cinema-bg border-l border-cinema-border shadow-2xl',
          'flex flex-col',
          'animate-in slide-in-from-right'
        )}
        role="dialog"
        aria-label="Lista de canales"
      >
        <header className="flex items-center gap-3 px-5 py-4 border-b border-cinema-border">
          <div className="flex-1 min-w-0">
            <p className="text-[10px] uppercase tracking-widest text-cinema-violet-light font-medium">
              Canales
            </p>
            <h2 className="font-display text-xl text-white uppercase tracking-wide truncate">
              TV en vivo
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 w-9 h-9 rounded-full bg-cinema-elevated hover:bg-cinema-violet/20 border border-cinema-border flex items-center justify-center transition-colors"
            aria-label="Cerrar lista de canales"
          >
            <X className="w-4 h-4 text-cinema-silver" />
          </button>
        </header>

        <div className="px-5 py-3 border-b border-cinema-border">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-cinema-ash pointer-events-none" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar canal, categoría o país..."
              className="w-full h-10 pl-10 pr-4 rounded-[10px] bg-cinema-elevated border border-cinema-border text-sm text-white placeholder:text-cinema-ash focus:outline-none focus:border-cinema-violet focus:ring-2 focus:ring-cinema-violet/30 transition-colors"
              autoFocus
            />
          </div>
          <p className="text-[11px] text-cinema-ash mt-2 uppercase tracking-wider">
            {filtered.length} {filtered.length === 1 ? 'canal' : 'canales'}
            {search && ` para "${search}"`}
          </p>
        </div>

        <nav className="flex-1 overflow-y-auto overscroll-contain pb-4">
          {grouped.length === 0 ? (
            <div className="flex flex-col items-center justify-center text-center px-6 py-16">
              <Tv className="w-10 h-10 text-cinema-muted/30 mb-3" />
              <p className="text-sm text-cinema-muted">
                {channels.length === 0 ? 'Cargando canales...' : 'Sin resultados.'}
              </p>
            </div>
          ) : (
            grouped.map(([category, items]) => (
              <section key={category} className="py-2">
                <h3 className="sticky top-0 z-10 px-5 py-2 bg-cinema-bg/95 backdrop-blur-sm text-[11px] uppercase tracking-widest text-cinema-ash font-semibold border-b border-cinema-border/50">
                  {category}
                  <span className="ml-2 text-cinema-violet-light">{items.length}</span>
                </h3>
                <ul className="px-2">
                  {items.map((c) => {
                    const active = c._id === currentId;
                    return (
                      <li key={c._id}>
                        <Link
                          href={`/tv/${c._id}`}
                          onClick={(e) => {
                            e.preventDefault();
                            handleSelect(c._id);
                          }}
                          className={cn(
                            'flex items-center gap-3 px-3 py-2.5 rounded-xl my-0.5 transition-colors',
                            'hover:bg-cinema-elevated',
                            active && 'bg-cinema-violet/15 ring-1 ring-cinema-violet/40'
                          )}
                          aria-current={active ? 'true' : undefined}
                        >
                          <div className="shrink-0 w-10 h-10 rounded-lg bg-cinema-elevated border border-cinema-border flex items-center justify-center overflow-hidden">
                            {c.logo ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={c.logo}
                                alt=""
                                className="w-7 h-7 object-contain"
                                loading="lazy"
                              />
                            ) : (
                              <Tv className="w-4 h-4 text-cinema-silver" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-white truncate">{c.name}</p>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              {active && (
                                <span className="flex items-center gap-1 text-[9px] uppercase tracking-wider text-red-400 font-semibold">
                                  <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
                                  Viendo
                                </span>
                              )}
                              {c.country && (
                                <span className="text-[10px] uppercase tracking-wider text-cinema-ash">
                                  {c.country}
                                </span>
                              )}
                            </div>
                          </div>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </section>
            ))
          )}
        </nav>
      </aside>
    </>
  );
}
