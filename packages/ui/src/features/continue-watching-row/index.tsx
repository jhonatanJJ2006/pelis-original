'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useCallback } from 'react';
import { ContinueWatchingCard } from '../continue-watching-card';
import { SectionHeader } from '../section-header';
import { useDragScroll } from '../../shared/hooks/use-drag-scroll';
import type { MediaItem } from '../../shared/types';
import { cn } from '../../shared/utils';

interface ContinueWatchingItem {
  _id: string;
  progress: number;
  duration: number;
  movie: MediaItem;
}

interface ContinueWatchingRowProps {
  items: ContinueWatchingItem[];
  className?: string;
}

export function ContinueWatchingRow({ items, className }: ContinueWatchingRowProps) {
  const { setRef, getEl } = useDragScroll();

  const scrollBy = useCallback((dir: 1 | -1) => {
    const el = getEl();
    if (!el) return;
    el.scrollBy({ left: dir * el.clientWidth * 0.8 });
  }, [getEl]);

  if (items.length === 0) {
    return (
      <section className={cn('relative', className)} aria-busy="true">
        <SectionHeader title="Continuar viendo" subtitle="Retoma donde lo dejaste" href="/history" />
        <div className="no-scrollbar flex gap-4 overflow-x-auto px-1 py-1">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="w-[280px] sm:w-[320px] md:w-[360px] shrink-0">
              <div className="aspect-video rounded-2xl bg-cinema-elevated animate-pulse" />
            </div>
          ))}
        </div>
      </section>
    );
  }

  return (
    <section className={cn('relative', className)}>
      <SectionHeader title="Continuar viendo" subtitle="Retoma donde lo dejaste" href="/history" />
      <div className="relative group/row">
        <button
          type="button"
          onClick={() => scrollBy(-1)}
          className="absolute -left-1 top-1/2 -translate-y-1/2 z-10 p-2.5 rounded-full bg-cinema-elevated/95 border border-cinema-border text-white hidden md:flex items-center justify-center opacity-0 group-hover/row:opacity-100 focus-visible:opacity-100"
          aria-label="Anterior"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <button
          type="button"
          onClick={() => scrollBy(1)}
          className="absolute -right-1 top-1/2 -translate-y-1/2 z-10 p-2.5 rounded-full bg-cinema-elevated/95 border border-cinema-border text-white hidden md:flex items-center justify-center opacity-0 group-hover/row:opacity-100 focus-visible:opacity-100"
          aria-label="Siguiente"
        >
          <ChevronRight className="w-5 h-5" />
        </button>

        <div
          ref={setRef}
          className="no-scrollbar flex gap-4 overflow-x-auto px-1 py-1 cursor-grab active:cursor-grabbing select-none"
        >
          {items.map((item) => (
            <div key={item._id} className="w-[280px] sm:w-[320px] md:w-[360px] h-auto shrink-0">
              <ContinueWatchingCard
                movie={item.movie}
                progress={item.progress}
                duration={item.duration}
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
