'use client';

import { useQuery } from 'convex/react';
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Tv,
  Monitor,
  Radio,
  Globe,
  Gamepad,
  Music,
  Loader2,
  Search,
  X,
  Star,
  RefreshCw,
} from 'lucide-react';
import { api } from '@pelis/convex';
import { TvChannelGridSkeleton } from '@pelis/ui/features/tv-channel-grid-skeleton';
import { EmptyState } from '@pelis/ui/features/empty-state';
import { ScrollReveal } from '@pelis/ui/features/scroll-reveal';
import { Input } from '@pelis/ui/components';
import { cn } from '@pelis/ui/utils';

const categoryIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  General: Tv,
  Entretenimiento: Monitor,
  Noticias: Radio,
  Deportes: Globe,
  Infantil: Gamepad,
  Música: Music,
};

const categoryLabels: Record<string, string> = {
  General: 'General',
  Entretenimiento: 'Entretenimiento',
  Noticias: 'Noticias',
  Deportes: 'Deportes',
  Infantil: 'Infantil',
  Música: 'Música',
  Películas: 'Películas',
  Series: 'Series',
  Documentales: 'Documentales',
  Cultura: 'Cultura',
  Religión: 'Religión',
};

interface TVChannel {
  _id: string;
  name: string;
  logo: string;
  category: string;
  country?: string;
  language?: string;
  streamUrl: string;
  source: string;
  isActive: boolean;
  isPopular?: boolean;
  sortOrder?: number;
  streamStatus?: 'online' | 'offline' | 'unknown';
  lastStreamError?: string;
}

const PAGE_SIZE = 48;

function useDebounced<T>(value: T, ms: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return debounced;
}

export default function TVPage() {
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedCountry, setSelectedCountry] = useState<string>('');
  const [selectedLanguage, setSelectedLanguage] = useState<string>('');
  const [search, setSearch] = useState('');
  const [popularOnly, setPopularOnly] = useState(false);
  const debouncedSearch = useDebounced(search, 300);

  const filtersArgs = {
    category: selectedCategory || undefined,
    country: selectedCountry || undefined,
    language: selectedLanguage || undefined,
    search: debouncedSearch.trim() || undefined,
    popularOnly: popularOnly || undefined,
  } as const;

  const result = useQuery(api.tv.list, {
    ...filtersArgs,
    limit: PAGE_SIZE,
    offset: 0,
  }) as
    | { items: TVChannel[]; total: number; hasMore: boolean; offset: number; limit: number }
    | undefined;

  const categories = (useQuery(api.tv.getCategories, {
    popularOnly: popularOnly || undefined,
  }) as string[] | undefined) ?? [];
  const countries = (useQuery(api.tv.getCountries, {
    popularOnly: popularOnly || undefined,
  }) as string[] | undefined) ?? [];
  const languages = (useQuery(api.tv.getLanguages, {
    popularOnly: popularOnly || undefined,
  }) as string[] | undefined) ?? [];

  const channels = result?.items;
  const total = result?.total ?? 0;
  const isLoading = result === undefined;

  const grouped = useMemo(() => {
    if (!channels) return {};
    return channels.reduce<Record<string, TVChannel[]>>((acc, ch) => {
      const key = ch.category || 'General';
      if (!acc[key]) acc[key] = [];
      acc[key].push(ch);
      return acc;
    }, {});
  }, [channels]);

  const sortedCategories = Object.keys(grouped).sort();
  const hasFilters = Boolean(
    selectedCategory || selectedCountry || selectedLanguage || search || popularOnly
  );

  return (
    <div className="page-shell">
      <ScrollReveal className="mb-8">
        <p className="text-cinema-violet-light text-sm font-medium uppercase tracking-widest mb-2">
          Canales
        </p>
        <h1 className="font-display text-4xl md:text-5xl tracking-wide text-white uppercase">
          TV en vivo
        </h1>
        <p className="text-cinema-muted mt-3 max-w-2xl">
          {result ? (
            <>
              <span className="text-white font-medium">{total}</span>{' '}
              {total === 1 ? 'canal disponible' : 'canales disponibles'}
              {hasFilters && channels && (
                <>
                  {' · mostrando '}
                  <span className="text-white font-medium">{channels.length}</span>
                </>
              )}
            </>
          ) : (
            'Cargando...'
          )}
        </p>
      </ScrollReveal>

      <ScrollReveal className="mb-6">
        <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_auto] gap-3 max-w-4xl">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar canal por nombre o palabra clave..."
            iconLeft={<Search className="w-4 h-4" />}
            clearable={Boolean(search)}
            onClear={() => setSearch('')}
          />
          <button
            type="button"
            onClick={() => setPopularOnly((v) => !v)}
            className={cn(
              'inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors border',
              popularOnly
                ? 'bg-cinema-gold/20 text-cinema-gold border-cinema-gold/40'
                : 'bg-cinema-elevated text-cinema-silver border-cinema-border hover:text-white hover:border-cinema-silver/40'
            )}
          >
            <Star className={cn('w-4 h-4', popularOnly && 'fill-cinema-gold')} />
            Populares
          </button>
          {hasFilters && (
            <button
              type="button"
              onClick={() => {
                setSelectedCategory('');
                setSelectedCountry('');
                setSelectedLanguage('');
                setSearch('');
                setPopularOnly(false);
              }}
              className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm text-cinema-silver border border-cinema-border hover:text-white hover:border-cinema-violet/40 transition-colors"
            >
              <X className="w-4 h-4" />
              Limpiar filtros
            </button>
          )}
        </div>
      </ScrollReveal>

      {(categories.length > 0 || countries.length > 0 || languages.length > 0) && (
        <ScrollReveal className="mb-8 space-y-4">
          {categories.length > 0 && (
            <div>
              <p className="text-xs text-cinema-ash uppercase tracking-wider mb-2">Categoría</p>
              <div className="flex flex-wrap gap-2">
                <FilterPill
                  active={!selectedCategory}
                  onClick={() => setSelectedCategory('')}
                >
                  Todas
                </FilterPill>
                {categories.map((cat) => (
                  <FilterPill
                    key={cat}
                    active={selectedCategory === cat}
                    onClick={() => setSelectedCategory(cat)}
                  >
                    {categoryLabels[cat] || cat}
                  </FilterPill>
                ))}
              </div>
            </div>
          )}

          {(countries.length > 0 || languages.length > 0) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {countries.length > 0 && (
                <div>
                  <p className="text-xs text-cinema-ash uppercase tracking-wider mb-2">País</p>
                  <div className="flex flex-wrap gap-2">
                    <FilterPill
                      active={!selectedCountry}
                      onClick={() => setSelectedCountry('')}
                      small
                    >
                      Todos
                    </FilterPill>
                    {countries.map((c) => (
                      <FilterPill
                        key={c}
                        active={selectedCountry === c}
                        onClick={() => setSelectedCountry(c)}
                        small
                      >
                        {c}
                      </FilterPill>
                    ))}
                  </div>
                </div>
              )}
              {languages.length > 0 && (
                <div>
                  <p className="text-xs text-cinema-ash uppercase tracking-wider mb-2">Idioma</p>
                  <div className="flex flex-wrap gap-2">
                    <FilterPill
                      active={!selectedLanguage}
                      onClick={() => setSelectedLanguage('')}
                      small
                    >
                      Todos
                    </FilterPill>
                    {languages.map((l) => (
                      <FilterPill
                        key={l}
                        active={selectedLanguage === l}
                        onClick={() => setSelectedLanguage(l)}
                        small
                      >
                        {l === 'es' ? 'Español' : l === 'en' ? 'Inglés' : l === 'pt' ? 'Portugués' : l}
                      </FilterPill>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </ScrollReveal>
      )}

      {isLoading ? (
        <TvChannelGridSkeleton />
      ) : channels?.length === 0 ? (
        <EmptyState
          icon={Tv}
          title="Sin canales disponibles"
          description={
            hasFilters
              ? 'Probá quitar algunos filtros.'
              : 'Pronto añadiremos canales de TV en vivo.'
          }
          actionLabel={hasFilters ? undefined : 'Ver películas'}
          actionHref={hasFilters ? undefined : '/movies'}
        />
      ) : (
        <>
          {popularOnly && sortedCategories.length > 0 && (
            <ScrollReveal className="mb-6">
              <div className="flex items-center gap-2 text-sm text-cinema-gold">
                <Star className="w-4 h-4 fill-cinema-gold" />
                <span className="font-display uppercase tracking-widest">
                  Canales populares
                </span>
              </div>
            </ScrollReveal>
          )}
          <div className="space-y-10">
            {sortedCategories.map((category) => (
              <ScrollReveal key={category}>
                <div className="flex items-baseline gap-3 mb-5">
                  <h2 className="font-display text-2xl tracking-wide text-white uppercase">
                    {categoryLabels[category] || category}
                  </h2>
                  <span className="text-xs text-cinema-ash ml-auto">
                    {grouped[category].length} canales
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 md:gap-4">
                  {grouped[category].map((channel) => (
                    <ChannelCard key={channel._id} channel={channel} />
                  ))}
                </div>
              </ScrollReveal>
            ))}
          </div>

          {result?.hasMore && (
            <div className="mt-10 flex justify-center">
              <p className="text-xs text-cinema-ash">
                Mostrando {channels?.length} de {total}. Refiná los filtros para ver más
                coincidencias relevantes.
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function ChannelCard({ channel }: { channel: TVChannel }) {
  const Icon = categoryIcons[channel.category] || Tv;
  const isOffline = channel.streamStatus === 'offline';
  return (
    <Link
      href={`/tv/${channel._id}`}
      className={cn(
        'group relative flex flex-col items-center gap-3 p-4 rounded-2xl border transition-all hover:-translate-y-1',
        isOffline
          ? 'bg-cinema-surface/40 border-cinema-border/40 opacity-60'
          : 'bg-cinema-surface border-cinema-border hover:border-cinema-violet/40'
      )}
    >
      {channel.isPopular && (
        <Star
          className="absolute top-2 right-2 w-3.5 h-3.5 text-cinema-gold fill-cinema-gold"
          aria-label="Canal popular"
        />
      )}
      <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-cinema-elevated to-cinema-surface border border-cinema-border flex items-center justify-center overflow-hidden">
        {channel.logo ? (
          <img
            src={channel.logo}
            alt={channel.name}
            className="w-12 h-12 object-contain"
            loading="lazy"
            decoding="async"
          />
        ) : (
          <Icon className="w-7 h-7 text-cinema-silver" />
        )}
      </div>
      <span className="text-sm text-center text-cinema-silver group-hover:text-white transition-colors line-clamp-2">
        {channel.name}
      </span>
      <div className="flex items-center gap-1.5 flex-wrap justify-center">
        {isOffline ? (
          <span className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-red-400 font-semibold">
            <RefreshCw className="w-3 h-3" />
            No disponible
          </span>
        ) : (
          <span className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-red-400 font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
            EN VIVO
          </span>
        )}
        {channel.country ? (
          <span className="text-[9px] uppercase tracking-wider text-cinema-ash bg-cinema-elevated px-1.5 py-0.5 rounded">
            {channel.country}
          </span>
        ) : null}
      </div>
    </Link>
  );
}

function FilterPill({
  active,
  onClick,
  children,
  small = false,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  small?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'rounded-full font-medium transition-all',
        small ? 'px-3 py-1.5 text-xs' : 'px-4 py-2 text-sm',
        active
          ? 'bg-cinema-violet text-white'
          : 'bg-cinema-elevated text-cinema-silver hover:text-white border border-cinema-border'
      )}
    >
      {children}
    </button>
  );
}