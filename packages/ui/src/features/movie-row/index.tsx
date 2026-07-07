'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useRef, useEffect, useState } from 'react';
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
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  if (movies.length === 0) return null;

  const updateScrollState = () => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 0);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 10);
    const cardWidth = 180 + 16;
    const idx = Math.round(el.scrollLeft / cardWidth);
    setActiveIndex(Math.min(idx, movies.length - 1));
  };

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
          className={cn(
            'absolute -left-0 top-1/2 -translate-y-1/2 z-10 p-2.5 rounded-full bg-black/80 border border-white/10 text-white transition-all duration-300 hover:bg-black hover:scale-110 hidden md:flex items-center justify-center shadow-lg',
            canScrollLeft ? 'opacity-100' : 'opacity-0 pointer-events-none'
          )}
          aria-label="Anterior"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <button
          type="button"
          onClick={() => scroll('right')}
          className={cn(
            'absolute -right-0 top-1/2 -translate-y-1/2 z-10 p-2.5 rounded-full bg-black/80 border border-white/10 text-white transition-all duration-300 hover:bg-black hover:scale-110 hidden md:flex items-center justify-center shadow-lg',
            canScrollRight ? 'opacity-100' : 'opacity-0 pointer-events-none'
          )}
          aria-label="Siguiente"
        >
          <ChevronRight className="w-5 h-5" />
        </button>

        <div
          ref={scrollRef}
          onScroll={updateScrollState}
          className="flex gap-4 overflow-x-auto pb-2 scroll-smooth snap-x snap-mandatory scrollbar-hide -mx-1 px-1"
        >
          {movies.map((movie, i) => (
            <div
              key={movie._id}
              className="w-[140px] sm:w-[160px] md:w-[180px] shrink-0 snap-start"
              style={{
                animation: `slideUpFade 0.6s cubic-bezier(0.16, 1, 0.3, 1) ${Math.min(i, 12) * 0.06}s forwards`,
                opacity: 0,
              }}
            >
              <MovieCard movie={movie} />
            </div>
          ))}
        </div>

        {movies.length > 4 && (
          <div className="hidden md:flex items-center justify-center gap-1.5 mt-3">
            {movies.slice(0, Math.min(movies.length, 20)).map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => {
                  const el = scrollRef.current;
                  if (!el) return;
                  el.scrollTo({ left: i * (180 + 16), behavior: 'smooth' });
                }}
                className={`rounded-full transition-all duration-300 ${
                  i === activeIndex
                    ? 'w-5 h-1.5 bg-cinema-accent'
                    : 'w-1.5 h-1.5 bg-zinc-700 hover:bg-zinc-500'
                }`}
                aria-label={`Ir a ${i + 1}`}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
