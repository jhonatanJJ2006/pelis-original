'use client';

import Link from 'next/link';
import { Play, Info, Sparkles } from 'lucide-react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Autoplay, EffectCreative, Pagination } from 'swiper/modules';
import { MoviePoster } from '@pelis/ui/features/movie-poster';
import type { MediaItem } from '@pelis/ui/types';

import 'swiper/css';
import 'swiper/css/effect-creative';
import 'swiper/css/pagination';

const genreColors: Record<string, string> = {
  Acción: 'from-red-500/25 to-transparent',
  Comedia: 'from-yellow-400/20 to-transparent',
  Drama: 'from-blue-500/30 to-transparent',
  Terror: 'from-emerald-500/20 to-transparent',
  Romance: 'from-pink-500/20 to-transparent',
  Ciencia: 'from-cyan-500/25 to-transparent',
  Suspenso: 'from-orange-500/20 to-transparent',
  Aventura: 'from-teal-500/25 to-transparent',
  Animación: 'from-blue-400/30 to-transparent',
};

function getGenreGradient(genre?: string): string {
  if (!genre) return 'from-cinema-violet/20 to-transparent';
  for (const [key, val] of Object.entries(genreColors)) {
    if (genre?.includes(key)) return val;
  }
  return 'from-cinema-violet/15 to-transparent';
}

interface HeroCarouselProps {
  movies: MediaItem[];
}

export function HeroCarousel({ movies }: HeroCarouselProps) {
  if (movies.length === 0) return null;

  return (
    <section
      className="relative h-[75vh] min-h-[400px] sm:min-h-[500px] max-h-[900px] overflow-hidden"
      aria-label="Destacados"
    >
      <Swiper
        modules={[Autoplay, EffectCreative, Pagination]}
        effect="creative"
        creativeEffect={{
          limitProgress: 2,
          shadowPerProgress: true,
          progressMultiplier: 1.2,
          prev: {
            translate: [0, 0, -500],
            scale: 0.85,
            opacity: 0,
          },
          next: {
            translate: ['120%', 0, -250],
            scale: 0.88,
            opacity: 0.25,
          },
        }}
        autoplay={{
          delay: 7000,
          disableOnInteraction: false,
          pauseOnMouseEnter: true,
        }}
        pagination={{
          clickable: true,
          dynamicBullets: true,
        }}
        speed={700}
        grabCursor
        loop
        watchSlidesProgress
        className="hero-swiper h-full"
      >
        {movies.map((movie) => {
          const genreGrad = getGenreGradient(movie.genre);
          return (
            <SwiperSlide key={movie._id}>
              {({ isActive }) => (
                <div className="relative h-full overflow-hidden">
                  <div className="absolute inset-0">
                    <MoviePoster
                      src={movie.image}
                      alt=""
                      className="w-full h-full object-cover"
                      loading="eager"
                    />
                  </div>
                  <div
                    className={`absolute inset-0 hero-gradient-right bg-gradient-to-r ${genreGrad}`}
                  />
                  <div className="absolute inset-0 hero-gradient-bottom" />
                  <div className="absolute inset-0 hero-gradient-accent" />

                  <div className="absolute inset-0 flex items-center">
                    <div className="container mx-auto px-6 sm:px-8 md:px-14 lg:px-20">
                      <div className="max-w-3xl">
                        <div
                          className={`flex items-center gap-3 mb-4 transition-all duration-500 ease-out ${
                            isActive ? 'translate-y-0 opacity-100' : 'translate-y-6 opacity-0'
                          }`}
                        >
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-cinema-violet text-white text-xs font-semibold rounded-full uppercase tracking-wide shadow-glow-violet">
                            <Sparkles className="w-3.5 h-3.5" aria-hidden />
                            Destacado
                          </span>
                          <span className="text-sm text-cinema-muted">
                            {movie.genre} &middot; {movie.releaseYear}
                          </span>
                        </div>
                        <h1
                          className={`font-display text-3xl sm:text-5xl md:text-7xl lg:text-8xl tracking-wide text-white uppercase leading-[0.95] mb-5 transition-all duration-500 ease-out delay-75 break-words ${
                            isActive ? 'translate-y-0 opacity-100' : 'translate-y-6 opacity-0'
                          }`}
                        >
                          {movie.name}
                        </h1>
                        <p
                          className={`text-cinema-muted text-base md:text-lg mb-8 max-w-xl line-clamp-3 leading-relaxed transition-all duration-500 ease-out delay-150 ${
                            isActive ? 'translate-y-0 opacity-100' : 'translate-y-6 opacity-0'
                          }`}
                        >
                          {movie.synopsis}
                        </p>
                        <div
                          className={`flex flex-wrap items-center gap-3 transition-all duration-500 ease-out delay-200 ${
                            isActive ? 'translate-y-0 opacity-100' : 'translate-y-6 opacity-0'
                          }`}
                        >
                          <Link
                            href={`/movies/${movie._id}?play=true`}
                            className="btn-primary-glow inline-flex items-center gap-2 px-7 py-3.5 text-base"
                          >
                            <Play className="w-5 h-5" fill="currentColor" aria-hidden />
                            Reproducir
                          </Link>
                          <Link
                            href={`/movies/${movie._id}`}
                            className="btn-secondary inline-flex items-center gap-2 px-7 py-3.5 text-base"
                          >
                            <Info className="w-5 h-5" aria-hidden />
                            Más info
                          </Link>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </SwiperSlide>
          );
        })}
      </Swiper>
    </section>
  );
}
