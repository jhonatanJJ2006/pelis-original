'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, ChevronRight, Search, Star, Tv } from 'lucide-react';
import { useQueryResult } from '@pelis/db/client';
import { api } from '@pelis/db/api';
import { cn } from '@pelis/ui/utils';
import { ChannelRow } from './channel-row';

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
  streamKind?: 'hls' | 'native' | 'mpegts';
}

const CHIPS = [
  { id: '', label: 'Todos' },
  { id: '__popular', label: 'Populares' },
  { id: 'Fútbol', label: 'Fútbol' },
  { id: 'Infantil', label: 'Infantil' },
  { id: 'Fórmula 1', label: 'F1' },
  { id: 'Lucha libre', label: 'Lucha' },
] as const;

const CHANNEL_PAGE_SIZE = 40;

interface ChannelPage {
  items: SidebarChannel[];
  total: number;
}

interface ChannelSidebarProps {
  channels: SidebarChannel[];
  currentId?: string;
  isLoading?: boolean;
  /** Phone: list is an overlay. Desktop ignores this and stays in the column. */
  mobileOpen?: boolean;
  onNavigate?: () => void;
}

export function ChannelSidebar({
  channels,
  currentId,
  isLoading = false,
  mobileOpen = false,
  onNavigate,
}: ChannelSidebarProps) {
  const [search, setSearch] = useState('');
  const [chip, setChip] = useState<string>('');
  const router = useRouter();

  const [page, setPage] = useState(1);
  const [debounced, setDebounced] = useState('');
  useEffect(() => {
    const t = setTimeout(() => setDebounced(search.trim()), 250);
    return () => clearTimeout(t);
  }, [search]);
  useEffect(() => setPage(1), [debounced, chip]);

  // Paginación en servidor (antes: 200 canales de golpe y el resto no aparecía).
  const { data: remote, isLoading: pageLoading } = useQueryResult<ChannelPage>(api.tv.list, {
    search: debounced || undefined,
    category: chip && chip !== '__popular' ? chip : undefined,
    popularOnly: chip === '__popular' ? true : undefined,
    limit: CHANNEL_PAGE_SIZE,
    offset: (page - 1) * CHANNEL_PAGE_SIZE,
  });
  const filtered = remote?.items ?? (page === 1 && !debounced && !chip ? channels : []);
  const total = remote?.total ?? filtered.length;
  const pageCount = Math.max(1, Math.ceil(total / CHANNEL_PAGE_SIZE));
  const loading = isLoading || pageLoading;

  const grouped = useMemo(() => {
    const groups: Record<string, SidebarChannel[]> = {};
    for (const c of filtered) {
      const key = c.category || 'General';
      if (!groups[key]) groups[key] = [];
      groups[key].push(c);
    }
    return Object.entries(groups).sort((a, b) => a[0].localeCompare(b[0], 'es'));
  }, [filtered]);

  const handleSelect = useCallback(
    (id: string) => {
      if (id !== currentId) router.push(`/tv/${id}`);
      onNavigate?.();
    },
    [currentId, onNavigate, router]
  );

  return (
    <aside
      className={cn(
        'h-full w-[min(18rem,85vw)] shrink-0 flex-col bg-cinema-bg border-r border-cinema-border',
        'md:static md:flex md:w-72 md:max-w-none',
        'max-md:absolute max-md:inset-y-0 max-md:left-0 max-md:z-30',
        mobileOpen ? 'flex' : 'hidden md:flex'
      )}
      aria-label="Lista de canales"
    >
      <div className="px-3 pt-3 pb-2 border-b border-cinema-border">
        <p className="font-display text-2xl text-cinema-chalk mb-2">TV en vivo</p>
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-cinema-ash pointer-events-none" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar canal..."
            className="w-full h-9 pl-8 pr-3 rounded-[2px] bg-cinema-elevated border border-cinema-border text-sm text-cinema-chalk placeholder:text-cinema-ash focus:outline-none focus:border-cinema-accent/50"
          />
        </div>
        <div className="flex gap-1.5 overflow-x-auto mt-2 pb-1 -mx-1 px-1 scrollbar-none">
          {CHIPS.map((item) => (
            <button
              key={item.id || 'all'}
              type="button"
              onClick={() => setChip(item.id)}
              className={cn(
                'shrink-0 px-2.5 py-1 rounded-[2px] text-[11px] font-medium transition-colors tv-focus',
                chip === item.id
                  ? 'bg-cinema-accent text-cinema-bg'
                  : 'bg-cinema-elevated text-cinema-silver border border-cinema-border'
              )}
            >
              {item.id === '__popular' && <Star className="w-3 h-3 inline mr-1 -mt-0.5" />}
              {item.label}
            </button>
          ))}
        </div>
        <p className="text-[10px] text-cinema-ash mt-2 uppercase tracking-wider">
          {total} {total === 1 ? 'canal' : 'canales'}
        </p>
      </div>

      <nav className="flex-1 overflow-y-auto overscroll-contain">
        {grouped.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-center px-4 py-12">
            <Tv className="w-8 h-8 text-cinema-muted/30 mb-2" />
            <p className="text-xs text-cinema-muted">
              {loading ? 'Cargando canales…' : 'Sin resultados.'}
            </p>
          </div>
        ) : (
          grouped.map(([category, items]) => (
            <section key={category} className="py-1">
              <h3 className="sticky top-0 z-10 px-3 py-1.5 bg-cinema-bg/95 text-[10px] uppercase tracking-widest text-cinema-ash font-semibold">
                {category}
                <span className="ml-1.5 text-cinema-accent/80">{items.length}</span>
              </h3>
              <ul className="px-1.5">
                {items.map((c) => (
                  <ChannelRow
                    key={c._id}
                    channel={c}
                    active={c._id === currentId}
                    onSelect={handleSelect}
                  />
                ))}
              </ul>
            </section>
          ))
        )}
      </nav>
      {pageCount > 1 && (
        <nav
          aria-label="Páginas de canales"
          className="flex items-center justify-between gap-2 border-t border-cinema-border px-3 py-2 text-xs text-cinema-muted"
        >
          <button
            type="button"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            aria-label="Página anterior"
            className="inline-flex h-8 w-8 items-center justify-center rounded-[6px] border border-cinema-border disabled:opacity-40 tv-focus"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span>
            Página {page} de {pageCount}
          </span>
          <button
            type="button"
            onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
            disabled={page >= pageCount}
            aria-label="Página siguiente"
            className="inline-flex h-8 w-8 items-center justify-center rounded-[6px] border border-cinema-border disabled:opacity-40 tv-focus"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </nav>
      )}
    </aside>
  );
}
