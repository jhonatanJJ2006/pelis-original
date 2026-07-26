'use client';

import { useQuery } from 'convex/react';
import { useState } from 'react';
import Link from 'next/link';
import { Tv, Monitor, Radio, Globe, Gamepad, Music, Loader2 } from 'lucide-react';
import { api } from '@pelis/convex';
import { Spinner } from '@pelis/ui/components';
import { EmptyState } from '@pelis/ui/features/empty-state';
import { ScrollReveal } from '@pelis/ui/features/scroll-reveal';
import { cn } from '@pelis/ui/utils';

const categoryIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  General: Tv,
  Entertainment: Monitor,
  News: Radio,
  Sports: Globe,
  Kids: Gamepad,
  Music: Music,
};

const categoryLabels: Record<string, string> = {
  General: 'General',
  Entertainment: 'Entretenimiento',
  News: 'Noticias',
  Sports: 'Deportes',
  Kids: 'Infantil',
  Music: 'Música',
};

interface TVChannel {
  _id: string;
  name: string;
  logo: string;
  category: string;
  streamUrl: string;
  source: string;
  language: string;
  isActive: boolean;
}

export default function TVPage() {
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const channels = useQuery(api.tv.list, {
    category: selectedCategory || undefined,
  }) as TVChannel[] | undefined;
  const categories = (useQuery(api.tv.getCategories, {}) as string[] | undefined) ?? [];

  const isLoading = channels === undefined;

  const grouped = channels
    ? channels.reduce<Record<string, TVChannel[]>>((acc, ch) => {
        const key = ch.category || 'General';
        if (!acc[key]) acc[key] = [];
        acc[key].push(ch);
        return acc;
      }, {})
    : {};

  const sortedCategories = Object.keys(grouped).sort();

  return (
    <div className="page-shell">
      <ScrollReveal className="mb-10">
        <p className="text-cinema-violet-light text-sm font-medium uppercase tracking-widest mb-2">
          Canales
        </p>
        <h1 className="font-display text-4xl md:text-5xl tracking-wide text-white uppercase">
          TV en vivo
        </h1>
        <p className="text-cinema-muted mt-3 max-w-2xl">
          {channels ? `${channels.length} canales disponibles` : 'Cargando...'}
        </p>
      </ScrollReveal>

      {categories.length > 0 && (
        <ScrollReveal className="mb-8">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setSelectedCategory('')}
              className={cn(
                'px-4 py-2 rounded-full text-sm font-medium transition-all',
                !selectedCategory
                  ? 'bg-cinema-violet text-white'
                  : 'bg-cinema-elevated text-cinema-silver hover:text-white border border-cinema-border'
              )}
            >
              Todas
            </button>
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={cn(
                  'px-4 py-2 rounded-full text-sm font-medium transition-all',
                  selectedCategory === cat
                    ? 'bg-cinema-violet text-white'
                    : 'bg-cinema-elevated text-cinema-silver hover:text-white border border-cinema-border'
                )}
              >
                {categoryLabels[cat] || cat}
              </button>
            ))}
          </div>
        </ScrollReveal>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-24" role="status" aria-label="Cargando">
          <Spinner size="lg" />
        </div>
      ) : channels?.length === 0 ? (
        <EmptyState
          icon={Tv}
          title="Sin canales disponibles"
          description="Pronto añadiremos canales de TV en vivo."
          actionLabel="Ver películas"
          actionHref="/movies"
        />
      ) : (
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
                {grouped[category].map((channel) => {
                  const Icon = categoryIcons[channel.category] || Tv;
                  return (
                    <Link
                      key={channel._id}
                      href={`/tv/${channel._id}`}
                      className="group flex flex-col items-center gap-3 p-4 rounded-2xl bg-cinema-surface border border-cinema-border hover:border-cinema-violet/40 transition-all hover:-translate-y-1"
                    >
                      <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-cinema-elevated to-cinema-surface border border-cinema-border flex items-center justify-center overflow-hidden">
                        {channel.logo ? (
                          <img
                            src={channel.logo}
                            alt={channel.name}
                            className="w-12 h-12 object-contain"
                            loading="lazy"
                          />
                        ) : (
                          <Icon className="w-7 h-7 text-cinema-silver" />
                        )}
                      </div>
                      <span className="text-sm text-center text-cinema-silver group-hover:text-white transition-colors line-clamp-2">
                        {channel.name}
                      </span>
                      <span className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-red-400 font-semibold">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
                        EN VIVO
                      </span>
                    </Link>
                  );
                })}
              </div>
            </ScrollReveal>
          ))}
        </div>
      )}
    </div>
  );
}
