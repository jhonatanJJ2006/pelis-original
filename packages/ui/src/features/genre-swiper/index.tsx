'use client';

import Link from 'next/link';
import { useRef, type ReactNode } from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { FreeMode } from 'swiper/modules';
import { cn } from '../../shared/utils';

import 'swiper/css';
import 'swiper/css/free-mode';

interface GenreSwiperProps {
  children: ReactNode[];
  className?: string;
}

export function GenreSwiper({ children, className }: GenreSwiperProps) {
  const swiperRef = useRef(null);

  if (children.length === 0) return null;

  return (
    <div className={cn('relative', className)} ref={swiperRef}>
      <Swiper
        modules={[FreeMode]}
        freeMode={{ enabled: true, momentum: true }}
        slidesPerView="auto"
        spaceBetween={10}
        grabCursor
        className="genre-swiper"
      >
        {children.map((child, i) => (
          <SwiperSlide key={i} className="!w-auto">
            {child}
          </SwiperSlide>
        ))}
      </Swiper>
    </div>
  );
}

interface GenreChipProps {
  href: string;
  label: string;
  gradient?: string;
}

export function GenreChip({ href, label, gradient }: GenreChipProps) {
  const grad = gradient || 'from-cinema-violet/25 to-cinema-teal/10';
  return (
    <Link
      href={href}
      className="group relative overflow-hidden px-5 py-3 bg-cinema-surface border border-cinema-border hover:border-cinema-violet/50 rounded-full text-sm text-cinema-muted hover:text-white whitespace-nowrap motion-safe:transition-[transform,border-color,color] motion-safe:duration-fast active:scale-95 [@media(hover:hover)_and_(pointer:fine)]:hover:scale-105"
    >
      <span
        className={`absolute inset-0 bg-gradient-to-r opacity-0 group-hover:opacity-100 motion-safe:transition-opacity motion-safe:duration-fast ${grad}`}
      />
      <span className="relative z-10">{label}</span>
    </Link>
  );
}
