'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useRef } from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation, FreeMode, Autoplay } from 'swiper/modules';
import { MovieCard } from '../movie-card';
import { SectionHeader } from '../section-header';
import { ScrollReveal } from '../scroll-reveal';
import type { MediaItem } from '../../shared/types';
import { cn } from '../../shared/utils';

import 'swiper/css';
import 'swiper/css/free-mode';
import 'swiper/css/navigation';

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
  const prevRef = useRef<HTMLButtonElement>(null);
  const nextRef = useRef<HTMLButtonElement>(null);

  if (movies.length === 0) return null;

  return (
    <ScrollReveal as="section" className={cn('relative', className)}>
      <SectionHeader
        title={title}
        subtitle={subtitle}
        href={href}
        linkLabel={linkLabel}
      />
      <div className="relative group/row">
        <button
          ref={prevRef}
          type="button"
          className="absolute -left-1 top-1/2 -translate-y-1/2 z-10 p-2.5 rounded-full bg-cinema-elevated/95 border border-cinema-border text-white motion-safe:transition-[opacity,background-color,border-color] motion-safe:duration-fast motion-safe:ease-out-expo hover:bg-cinema-violet/30 hover:border-cinema-violet/50 hidden md:flex items-center justify-center opacity-0 group-hover/row:opacity-100 focus-visible:opacity-100 active:scale-95"
          aria-label="Anterior"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <button
          ref={nextRef}
          type="button"
          className="absolute -right-1 top-1/2 -translate-y-1/2 z-10 p-2.5 rounded-full bg-cinema-elevated/95 border border-cinema-border text-white motion-safe:transition-[opacity,background-color,border-color] motion-safe:duration-fast motion-safe:ease-out-expo hover:bg-cinema-violet/30 hover:border-cinema-violet/50 hidden md:flex items-center justify-center opacity-0 group-hover/row:opacity-100 focus-visible:opacity-100 active:scale-95"
          aria-label="Siguiente"
        >
          <ChevronRight className="w-5 h-5" />
        </button>

        <Swiper
          modules={[Navigation, FreeMode, Autoplay]}
          navigation={{
            prevEl: prevRef.current,
            nextEl: nextRef.current,
          }}
          onInit={(swiper) => {
            if (swiper.params.navigation && typeof swiper.params.navigation === 'object') {
              swiper.params.navigation.prevEl = prevRef.current;
              swiper.params.navigation.nextEl = nextRef.current;
              swiper.navigation.init();
              swiper.navigation.update();
            }
          }}
          autoplay={{
            delay: 5000,
            disableOnInteraction: false,
            pauseOnMouseEnter: true,
          }}
          freeMode={{
            enabled: true,
            momentum: true,
            momentumRatio: 0.8,
            momentumVelocityRatio: 0.6,
          }}
          slidesPerView="auto"
          spaceBetween={12}
          grabCursor
          touchRatio={1.5}
          resistanceRatio={0.6}
          speed={400}
          watchSlidesProgress
          className="movie-row-swiper"
        >
          {movies.map((movie) => (
            <SwiperSlide
              key={movie._id}
              className="!w-[140px] sm:!w-[160px] md:!w-[180px] movie-row-slide"
            >
              <MovieCard movie={movie} />
            </SwiperSlide>
          ))}
        </Swiper>
      </div>
    </ScrollReveal>
  );
}
