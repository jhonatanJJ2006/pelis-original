'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useRef } from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation, FreeMode } from 'swiper/modules';
import { ContinueWatchingCard } from '../continue-watching-card';
import { SectionHeader } from '../section-header';
import { ScrollReveal } from '../scroll-reveal';
import type { MediaItem } from '../../shared/types';
import { cn } from '../../shared/utils';

import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/free-mode';

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
  const prevRef = useRef<HTMLButtonElement>(null);
  const nextRef = useRef<HTMLButtonElement>(null);

  if (items.length === 0) return null;

  return (
    <ScrollReveal as="section" className={cn('relative', className)}>
      <SectionHeader title="Continuar viendo" subtitle="Retoma donde lo dejaste" href="/history" />
      <div className="relative group/row">
        <button
          ref={prevRef}
          type="button"
          className="absolute -left-1 top-1/2 -translate-y-1/2 z-10 p-2.5 rounded-full bg-cinema-elevated/95 border border-cinema-border text-white hidden md:flex items-center justify-center opacity-0 group-hover/row:opacity-100 focus-visible:opacity-100"
          aria-label="Anterior"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <button
          ref={nextRef}
          type="button"
          className="absolute -right-1 top-1/2 -translate-y-1/2 z-10 p-2.5 rounded-full bg-cinema-elevated/95 border border-cinema-border text-white hidden md:flex items-center justify-center opacity-0 group-hover/row:opacity-100 focus-visible:opacity-100"
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
          {items.map((item) => (
            <SwiperSlide key={item._id} className="!w-[280px] sm:!w-[320px] md:!w-[360px] h-auto">
              <ContinueWatchingCard
                movie={item.movie}
                progress={item.progress}
                duration={item.duration}
              />
            </SwiperSlide>
          ))}
        </Swiper>
      </div>
    </ScrollReveal>
  );
}
