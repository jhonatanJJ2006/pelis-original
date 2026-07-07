'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useRef } from 'react';
import { MovieCard } from '../movie-card';
import { SectionHeader } from '../section-header';
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

export function MovieRow({
  title,
  subtitle,
  movies,
  href,
  linkLabel,
  className,
}: MovieRowProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  if (movies.length === 0) return null;

  const scroll = (direction: 'left' | 'right') => {
    const el = scrollRef.current;
    if (!el) return;
    const amount = el.clientWidth * 0.8;
    el.scrollBy({ left: direction === 'left' ? -amount : amount, behavior: 'smooth' });
  };

  return (
    <section className={cn('relative group/row', className)}>
      <SectionHeader
        title={title}
        subtitle={subtitle}
        href={href}
        linkLabel={linkLabel}
      />
      <div className="relative">
        <button
          type="button"
          onClick={() => scroll('left')}
          className="absolute left-0 top-1/2 -translate-y-1/2 z-10 p-2 rounded-full bg-black/70 border border-white/10 text-white opacity-0 group-hover/row:opacity-100 transition-opacity hover:bg-black/90 hidden md:flex"
          aria-label="Anterior"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <button
          type="button"
          onClick={() => scroll('right')}
          className="absolute right-0 top-1/2 -translate-y-1/2 z-10 p-2 rounded-full bg-black/70 border border-white/10 text-white opacity-0 group-hover/row:opacity-100 transition-opacity hover:bg-black/90 hidden md:flex"
          aria-label="Siguiente"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
        <div
          ref={scrollRef}
          className="flex gap-4 overflow-x-auto pb-2 scroll-smooth snap-x snap-mandatory scrollbar-hide -mx-1 px-1"
        >
          {movies.map((movie) => (
            <div
              key={movie._id}
              className="w-[140px] sm:w-[160px] md:w-[180px] shrink-0 snap-start"
            >
              <MovieCard movie={movie} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
