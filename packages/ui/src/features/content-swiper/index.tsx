'use client';

import { useRef } from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation, FreeMode } from 'swiper/modules';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '../../shared/utils';
import type { ReactNode } from 'react';

import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/free-mode';

interface ContentSwiperProps {
  children: ReactNode[];
  slideClassName?: string;
  className?: string;
}

export function ContentSwiper({ children, slideClassName, className }: ContentSwiperProps) {
  const prevRef = useRef<HTMLButtonElement>(null);
  const nextRef = useRef<HTMLButtonElement>(null);

  if (children.length === 0) return null;

  return (
    <div className={cn('relative group/swiper', className)}>
      <button
        ref={prevRef}
        type="button"
        className="absolute -left-1 top-1/2 -translate-y-1/2 z-10 p-2.5 rounded-full bg-cinema-elevated/95 border border-cinema-border text-white hidden md:flex items-center justify-center opacity-0 group-hover/swiper:opacity-100 focus-visible:opacity-100"
        aria-label="Anterior"
      >
        <ChevronLeft className="w-5 h-5" />
      </button>
      <button
        ref={nextRef}
        type="button"
        className="absolute -right-1 top-1/2 -translate-y-1/2 z-10 p-2.5 rounded-full bg-cinema-elevated/95 border border-cinema-border text-white hidden md:flex items-center justify-center opacity-0 group-hover/swiper:opacity-100 focus-visible:opacity-100"
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
        freeMode={{ enabled: true, momentum: true }}
        slidesPerView="auto"
        spaceBetween={16}
        grabCursor
        speed={400}
        className="movie-row-swiper"
      >
        {children.map((child, i) => (
          <SwiperSlide
            key={i}
            className={cn('!w-[300px] sm:!w-[340px] md:!w-[380px] h-auto', slideClassName)}
          >
            {child}
          </SwiperSlide>
        ))}
      </Swiper>
    </div>
  );
}
