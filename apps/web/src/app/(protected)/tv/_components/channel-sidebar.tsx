'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Search, Star, Tv } from 'lucide-react';
import { cn } from '@pelis/ui/utils';

export interface SidebarChannel {
  _id: string;
  name: string;
  logo: string;
  category: string;
  country?: string;
  language?: string;
  source?: string;
  isPopular?: boolean;
  streamStatus?: 'online' | 'offline' | 'unknown';
}

const CHIPS = [
  { id: '', label: 'Todos' },
  { id: '__popular', label: 'Populares' },
  { id: 'Fútbol', label: 'Fútbol' },
  { id: 'Infantil', label: 'Infantil' },
  { id: 'Fórmula 1', label: 'F1' },
  { id: 'Lucha libre', label: 'Lucha' },
] as const;

interface ChannelSidebarProps {
  channels: SidebarChannel[];
  currentId?: string;
}

export function ChannelSidebar({ channels, currentId }: ChannelSidebarProps) {
  const [search, setSearch] = useState('');
  const [chip, setChip] = useState<string>('');
  const router = useRouter();

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return channels.filter((c) => {
      if (chip === '__popular' && !c.isPopular) return false;
      if (chip && chip !== '__popular' && c.category !== chip) return false;
      if (!q) return true;
      return (
        c.name.toLowerCase().includes(q) ||
        c.category.toLowerCase().includes(q) ||
        (c.country || '').toLowerCase().includes(q)
      );
    });
  }, [channels, search, chip]);

  const grouped = useMemo(() => {
    const groups: Record<string, SidebarChannel[]> = {};
    for (const c of filtered) {
      const key = c.category || 'General';
      if (!groups[key]) groups[key] = [];
      groups[key].push(c);
    }
    return Object.entries(groups).sort((a, b) => a[0].localeCompare(b[0], 'es'));
  }, [filtered]);

  const handleSelect = (id: string) => {
    if (id !== currentId) router.push(`/tv/${id}`);
  };

  return (
    <aside
      className="h-full w-[42%] max-w-[18rem] md:w-72 md:max-w-none shrink-0 bg-cinema-bg border-r border-cinema-border flex flex-col"
      aria-label="Lista de canales"
    >
      <div className="px-3 pt-3 pb-2 border-b border-cinema-border">
        <p className="text-[10px] uppercase tracking-widest text-cinema-gold font-medium mb-1">
          TV en vivo
        </p>
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-cinema-ash pointer-events-none" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar canal..."
            className="w-full h-9 pl-8 pr-3 rounded-lg bg-cinema-elevated border border-cinema-border text-sm text-white placeholder:text-cinema-ash focus:outline-none focus:border-cinema-gold/50"
          />
        </div>
        <div className="flex gap-1.5 overflow-x-auto mt-2 pb-1 -mx-1 px-1 scrollbar-none">
          {CHIPS.map((item) => (
            <button
              key={item.id || 'all'}
              type="button"
              onClick={() => setChip(item.id)}
              className={cn(
                'shrink-0 px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors',
                chip === item.id
                  ? 'bg-cinema-gold text-cinema-bg'
                  : 'bg-cinema-elevated text-cinema-silver border border-cinema-border'
              )}
            >
              {item.id === '__popular' && <Star className="w-3 h-3 inline mr-1 -mt-0.5" />}
              {item.label}
            </button>
          ))}
        </div>
        <p className="text-[10px] text-cinema-ash mt-2 uppercase tracking-wider">
          {filtered.length} {filtered.length === 1 ? 'canal' : 'canales'}
        </p>
      </div>

      <nav className="flex-1 overflow-y-auto overscroll-contain">
        {grouped.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-center px-4 py-12">
            <Tv className="w-8 h-8 text-cinema-muted/30 mb-2" />
            <p className="text-xs text-cinema-muted">
              {channels.length === 0 ? 'Cargando canales...' : 'Sin resultados.'}
            </p>
          </div>
        ) : (
          grouped.map(([category, items]) => (
            <section key={category} className="py-1">
              <h3 className="sticky top-0 z-10 px-3 py-1.5 bg-cinema-bg/95 text-[10px] uppercase tracking-widest text-cinema-ash font-semibold">
                {category}
                <span className="ml-1.5 text-cinema-gold/80">{items.length}</span>
              </h3>
              <ul className="px-1.5">
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
                          'flex items-center gap-2 px-2 py-2 rounded-lg my-0.5 transition-colors',
                          'hover:bg-cinema-elevated',
                          active && 'bg-cinema-gold/10 ring-1 ring-cinema-gold/35'
                        )}
                        aria-current={active ? 'true' : undefined}
                      >
                        <div className="shrink-0 w-8 h-8 rounded-md bg-cinema-elevated border border-cinema-border flex items-center justify-center overflow-hidden">
                          {c.logo ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={c.logo}
                              alt=""
                              className="w-6 h-6 object-contain"
                              loading="lazy"
                            />
                          ) : (
                            <Tv className="w-3.5 h-3.5 text-cinema-silver" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs md:text-sm text-white truncate">{c.name}</p>
                          <div className="flex items-center gap-1 mt-0.5">
                            {active && (
                              <span className="flex items-center gap-1 text-[9px] uppercase tracking-wider text-red-400 font-semibold">
                                <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
                                Viendo
                              </span>
                            )}
                            {c.streamStatus === 'offline' && (
                              <span className="text-[9px] uppercase tracking-wider text-cinema-ash">
                                No disponible
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
  );
}
