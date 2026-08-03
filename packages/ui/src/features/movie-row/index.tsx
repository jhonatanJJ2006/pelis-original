'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useCallback } from 'react';
import { MovieCard } from '../movie-card';
import { SectionHeader } from '../section-header';
import { useDragScroll } from '../../shared/hooks/use-drag-scroll';
import type { MediaItem } from '../../shared/types';
import { cn } from '../../shared/utils';

interface MovieRowProps {
  title: string;
  subtitle?: string;
  movies: MediaItem[];
  href?: string;
  linkLabel?: string;
  className?: string;
}

export function MovieRow({ title, subtitle, movies, href, linkLabel, className }: MovieRowProps) {
  const { setRef, getEl } = useDragScroll();

  const scrollBy = useCallback((dir: 1 | -1) => {
    const el = getEl();
    if (!el) return;
    el.scrollBy({ left: dir * el.clientWidth * 0.8 });
  }, [getEl]);

  if (movies.length === 0) {
    return (
      <section className={cn('relative', className)} aria-busy="true">
        <SectionHeader title={title} subtitle={subtitle} href={href} linkLabel={linkLabel} />
        <div className="no-scrollbar flex gap-3 overflow-x-auto px-1 py-1">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="w-[150px] sm:w-[160px] md:w-[180px] shrink-0">
              <div className="aspect-[2/3] rounded-2xl bg-cinema-elevated animate-pulse" />
            </div>
          ))}
        </div>
      </section>
    );
  }

  return (
    <section className={cn('relative', className)}>
      <SectionHeader title={title} subtitle={subtitle} href={href} linkLabel={linkLabel} />
      <div className="relative group/row">
        <button
          type="button"
          onClick={() => scrollBy(-1)}
          className="absolute left-0 top-1/2 -translate-y-1/2 z-10 p-2.5 rounded-full bg-cinema-elevated/95 border border-cinema-border text-white motion-safe:transition-[opacity,background-color,border-color] motion-safe:duration-fast motion-safe:ease-out-expo hover:bg-cinema-violet/30 hover:border-cinema-violet/50 hidden md:flex items-center justify-center opacity-0 group-hover/row:opacity-100 focus-visible:opacity-100 active:scale-95"
          aria-label="Anterior"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <button
          type="button"
          onClick={() => scrollBy(1)}
          className="absolute right-0 top-1/2 -translate-y-1/2 z-10 p-2.5 rounded-full bg-cinema-elevated/95 border border-cinema-border text-white motion-safe:transition-[opacity,background-color,border-color] motion-safe:duration-fast motion-safe:ease-out-expo hover:bg-cinema-violet/30 hover:border-cinema-violet/50 hidden md:flex items-center justify-center opacity-0 group-hover/row:opacity-100 focus-visible:opacity-100 active:scale-95"
          aria-label="Siguiente"
        >
          <ChevronRight className="w-5 h-5" />
        </button>

        <div
          ref={setRef}
          className="no-scrollbar flex gap-3 overflow-x-auto px-1 py-1 cursor-grab active:cursor-grabbing select-none"
        >
          {movies.map((movie) => (
            <div
              key={movie._id}
              className="w-[150px] sm:w-[160px] md:w-[180px] shrink-0"
            >
              <MovieCard movie={movie} showFavorite={false} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
