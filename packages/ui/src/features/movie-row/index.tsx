'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useCallback } from 'react';
import { MovieCard } from '../movie-card';
import { SectionHeader } from '../section-header';
import { useDragScroll } from '../../shared/hooks/use-drag-scroll';
import type { MediaItem } from '../../shared/types';
import { cn } from '../../shared/utils';
import { MovieRowSkeleton } from './movie-row-skeleton';

interface MovieRowProps {
  title: string;
  subtitle?: string;
  movies: MediaItem[] | undefined;
  href?: string;
  linkLabel?: string;
  className?: string;
  isLoading?: boolean;
}

export function MovieRow({
  title,
  subtitle,
  movies,
  href,
  linkLabel,
  className,
  isLoading = false,
}: MovieRowProps) {
  const { setRef, getEl } = useDragScroll();

  const scrollBy = useCallback(
    (dir: 1 | -1) => {
      const el = getEl();
      if (!el) return;
      el.scrollBy({ left: dir * el.clientWidth * 0.8 });
    },
    [getEl]
  );

  if (isLoading || movies === undefined) {
    return <MovieRowSkeleton className={className} showHeader={Boolean(title)} />;
  }

  if (movies.length === 0) {
    return null;
  }

  return (
    <section className={cn('relative', className)}>
      <SectionHeader title={title} subtitle={subtitle} href={href} linkLabel={linkLabel} />
      <div className="relative group/row">
        <button
          type="button"
          onClick={() => scrollBy(-1)}
          className="absolute left-0 top-1/2 -translate-y-1/2 z-10 p-2.5 rounded-full bg-cinema-elevated/95 border border-cinema-border text-cinema-chalk motion-safe:transition-[opacity,background-color,border-color] motion-safe:duration-fast motion-safe:ease-out-expo hover:bg-cinema-accent hover:text-cinema-bg hover:border-cinema-accent hidden md:flex items-center justify-center opacity-0 group-hover/row:opacity-100 focus-visible:opacity-100 active:scale-95"
          aria-label="Anterior"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <button
          type="button"
          onClick={() => scrollBy(1)}
          className="absolute right-0 top-1/2 -translate-y-1/2 z-10 p-2.5 rounded-full bg-cinema-elevated/95 border border-cinema-border text-cinema-chalk motion-safe:transition-[opacity,background-color,border-color] motion-safe:duration-fast motion-safe:ease-out-expo hover:bg-cinema-accent hover:text-cinema-bg hover:border-cinema-accent hidden md:flex items-center justify-center opacity-0 group-hover/row:opacity-100 focus-visible:opacity-100 active:scale-95"
          aria-label="Siguiente"
        >
          <ChevronRight className="w-5 h-5" />
        </button>

        <div
          ref={setRef}
          className="no-scrollbar flex gap-2.5 md:gap-3 overflow-x-auto px-1 py-3 cursor-grab active:cursor-grabbing select-none"
        >
          {movies.map((movie, index) => (
            <div
              key={movie._id}
              className="w-[110px] sm:w-[140px] md:w-[170px] lg:w-[185px] shrink-0"
            >
              <MovieCard
                movie={movie}
                showFavorite={false}
                posterLoading={index === 0 ? 'eager' : 'lazy'}
                posterFetchPriority={index === 0 ? 'high' : 'auto'}
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export { MovieRowSkeleton } from './movie-row-skeleton';
