'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useRef, type ReactNode } from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation, FreeMode } from 'swiper/modules';
import { MovieCard } from '../movie-card';
import type { MediaItem } from '../../shared/types';
import { cn } from '../../shared/utils';

import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/free-mode';

type SlideWidth = 'sm' | 'md' | 'lg';

const widthClasses: Record<SlideWidth, string> = {
  sm: '!w-[140px] sm:!w-[160px] md:!w-[180px]',
  md: '!w-[160px] sm:!w-[180px] md:!w-[200px] lg:!w-[220px]',
  lg: '!w-[180px] sm:!w-[200px] md:!w-[240px] lg:!w-[260px]',
};

interface MovieSwiperProps {
  movies: MediaItem[];
  slideWidth?: SlideWidth;
  className?: string;
  autoplay?: boolean;
  renderSlide?: (movie: MediaItem) => ReactNode;
}

export function MovieSwiper({
  movies,
  slideWidth = 'md',
  className,
  autoplay = false,
  renderSlide,
}: MovieSwiperProps) {
  const prevRef = useRef<HTMLButtonElement>(null);
  const nextRef = useRef<HTMLButtonElement>(null);

  if (movies.length === 0) return null;

  return (
    <div className={cn('relative group/swiper', className)}>
      <button
        ref={prevRef}
        type="button"
        className="absolute -left-1 top-1/2 -translate-y-1/2 z-10 p-2.5 rounded-full bg-cinema-elevated/95 border border-cinema-border text-cinema-chalk motion-safe:transition-[opacity,background-color,border-color] motion-safe:duration-fast hover:bg-cinema-accent/30 hover:border-cinema-accent/50 hidden md:flex items-center justify-center opacity-0 group-hover/swiper:opacity-100 focus-visible:opacity-100 active:scale-95"
        aria-label="Anterior"
      >
        <ChevronLeft className="w-5 h-5" />
      </button>
      <button
        ref={nextRef}
        type="button"
        className="absolute -right-1 top-1/2 -translate-y-1/2 z-10 p-2.5 rounded-full bg-cinema-elevated/95 border border-cinema-border text-cinema-chalk motion-safe:transition-[opacity,background-color,border-color] motion-safe:duration-fast hover:bg-cinema-accent/30 hover:border-cinema-accent/50 hidden md:flex items-center justify-center opacity-0 group-hover/swiper:opacity-100 focus-visible:opacity-100 active:scale-95"
        aria-label="Siguiente"
      >
        <ChevronRight className="w-5 h-5" />
      </button>

      <Swiper
        modules={[Navigation, FreeMode]}
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
        autoplay={
          autoplay ? { delay: 5000, disableOnInteraction: false, pauseOnMouseEnter: true } : false
        }
        freeMode={{
          enabled: true,
          momentum: true,
          momentumRatio: 0.85,
        }}
        slidesPerView="auto"
        spaceBetween={14}
        grabCursor
        speed={400}
        watchSlidesProgress
        className="movie-row-swiper movie-catalog-swiper"
      >
        {movies.map((movie) => (
          <SwiperSlide
            key={movie._id}
            className={cn(widthClasses[slideWidth], 'movie-row-slide h-auto')}
          >
            {renderSlide ? renderSlide(movie) : <MovieCard movie={movie} />}
          </SwiperSlide>
        ))}
      </Swiper>
    </div>
  );
}
