'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { Clapperboard, Play, Plus } from 'lucide-react';
import type { MediaItem } from '@pelis/ui/types';
import { cn } from '@pelis/ui/utils';
import {
  HERO_IMAGE_DEBOUNCE_MS,
  HERO_TRAILER_REST_MS,
  heroBackdropSrc,
  heroDurationFromSeconds,
  heroDurationLabel,
  heroMetaLine,
  heroRequestWidth,
  heroTitle,
  shouldPlayTrailer,
} from '@/lib/hero-home';

interface DynamicHeroProps {
  movie: MediaItem;
  /** Duración real del archivo (seguir viendo), en segundos. */
  playbackSeconds?: number | null;
  runtimeMinutes?: number | null;
  youtubeKey?: string | null;
  /** La búsqueda del tráiler de este título ya terminó. */
  extrasReady: boolean;
  inList: boolean;
  onToggleList: () => void;
}

type YtPlayer = {
  destroy: () => void;
  mute: () => void;
  playVideo: () => void;
  getCurrentTime: () => number;
  getDuration: () => number;
};

type YtWindow = Window & {
  YT?: {
    Player: new (
      id: string,
      options: {
        width?: string;
        height?: string;
        videoId: string;
        playerVars?: Record<string, number | string>;
        events?: { onReady?: (event: { target: YtPlayer }) => void };
      }
    ) => YtPlayer;
  };
  onYouTubeIframeAPIReady?: () => void;
};

function useReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const apply = () => setReduced(mq.matches);
    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, []);
  return reduced;
}

/** Carga el fondo al tamaño de la pantalla y cancela la petición si el foco se va. */
function useHeroStill(raw: string | null | undefined) {
  const [src, setSrc] = useState<string | null>(null);
  const hasShown = useRef(false);
  useEffect(() => {
    const width = heroRequestWidth(window.innerWidth, window.devicePixelRatio || 1);
    const next = heroBackdropSrc(raw, width);
    if (!next) return;
    const ac = new AbortController();
    const delay = hasShown.current ? HERO_IMAGE_DEBOUNCE_MS : 0;
    const timer = window.setTimeout(() => {
      void fetch(next, { signal: ac.signal })
        .then((res) => {
          if (!res.ok) throw new Error('hero');
          return res.blob();
        })
        .then((blob) => {
          if (ac.signal.aborted) return;
          const url = URL.createObjectURL(blob);
          hasShown.current = true;
          setSrc(url);
        })
        .catch(() => {
          if (!ac.signal.aborted) {
            hasShown.current = true;
            setSrc(next);
          }
        });
    }, delay);
    return () => {
      window.clearTimeout(timer);
      ac.abort();
    };
  }, [raw]);
  useEffect(
    () => () => {
      if (src?.startsWith('blob:')) URL.revokeObjectURL(src);
    },
    [src]
  );
  return src;
}

function loadYoutubeApi(): Promise<void> {
  const w = window as YtWindow;
  if (w.YT?.Player) return Promise.resolve();
  return new Promise((resolve) => {
    const previous = w.onYouTubeIframeAPIReady;
    w.onYouTubeIframeAPIReady = () => {
      previous?.();
      resolve();
    };
    if (!document.querySelector('script[data-pelis-yt]')) {
      const script = document.createElement('script');
      script.src = 'https://www.youtube.com/iframe_api';
      script.async = true;
      script.dataset.pelisYt = '1';
      document.head.appendChild(script);
    }
  });
}

function MutedTrailer({
  videoKey,
  onProgress,
}: {
  videoKey: string;
  onProgress: (ratio: number) => void;
}) {
  const domId = 'pelis-hero-trailer';
  const report = useRef(onProgress);
  report.current = onProgress;
  useEffect(() => {
    let player: YtPlayer | null = null;
    let timer = 0;
    let cancelled = false;
    void loadYoutubeApi().then(() => {
      const YT = (window as YtWindow).YT;
      if (cancelled || !YT?.Player) return;
      player = new YT.Player(domId, {
        width: '100%',
        height: '100%',
        videoId: videoKey,
        playerVars: {
          autoplay: 1,
          mute: 1,
          controls: 0,
          rel: 0,
          modestbranding: 1,
          playsinline: 1,
          disablekb: 1,
          fs: 0,
        },
        events: {
          onReady: (event) => {
            event.target.mute();
            event.target.playVideo();
          },
        },
      });
      timer = window.setInterval(() => {
        const duration = player?.getDuration?.() ?? 0;
        const current = player?.getCurrentTime?.() ?? 0;
        if (duration > 0) report.current(Math.min(1, current / duration));
      }, 400);
    });
    return () => {
      cancelled = true;
      window.clearInterval(timer);
      player?.destroy?.();
    };
  }, [videoKey]);

  return (
    <div className="absolute inset-0 overflow-hidden bg-cinema-bg">
      <div className="absolute left-1/2 top-1/2 h-[56.25vw] min-h-full w-[177.78vh] min-w-full -translate-x-1/2 -translate-y-1/2 [&_iframe]:pointer-events-none [&_iframe]:h-full [&_iframe]:w-full">
        <div id={domId} className="h-full w-full" />
      </div>
    </div>
  );
}

export function DynamicHero({
  movie,
  playbackSeconds,
  runtimeMinutes,
  youtubeKey,
  extrasReady,
  inList,
  onToggleList,
}: DynamicHeroProps) {
  const reduced = useReducedMotion();
  const still = useHeroStill(movie.backdropImage);
  const [rested, setRested] = useState(false);
  const [forced, setForced] = useState(false);
  const [armed, setArmed] = useState(false);
  const [miss, setMiss] = useState(false);
  const [progress, setProgress] = useState(0);
  const onProgress = useRef(setProgress);
  onProgress.current = setProgress;

  useEffect(() => {
    setRested(false);
    setForced(false);
    setArmed(false);
    setMiss(false);
    setProgress(0);
    const timer = window.setTimeout(() => setRested(true), HERO_TRAILER_REST_MS);
    return () => window.clearTimeout(timer);
  }, [movie._id]);

  useEffect(() => {
    if (!armed) return;
    if (youtubeKey) {
      setForced(true);
      setMiss(false);
    } else if (extrasReady) {
      setMiss(true);
    }
  }, [armed, youtubeKey, extrasReady]);

  const playing = shouldPlayTrailer({
    rested,
    forced,
    youtubeKey,
    reducedMotion: reduced,
  });

  const duration =
    heroDurationFromSeconds(playbackSeconds) ?? heroDurationLabel(runtimeMinutes ?? null);
  const meta = heroMetaLine([movie.releaseYear, duration, movie.classification, movie.genre]);
  const title = heroTitle(movie.name);
  const playHref = movie.comingSoon ? `/movies/${movie._id}` : `/movies/${movie._id}?play=true`;

  const onTrailer = () => {
    if (youtubeKey) {
      setForced(true);
      setMiss(false);
      return;
    }
    if (extrasReady) setMiss(true);
    else setArmed(true);
  };

  return (
    <section
      className="relative h-[62vh] min-h-[460px] max-h-[720px] w-full overflow-hidden bg-cinema-bg"
      aria-label="Destacado"
    >
      <h1 className="sr-only">Inicio</h1>
      {still ? (
        <img
          src={still}
          alt=""
          className="absolute inset-0 h-full w-full object-cover object-center"
        />
      ) : null}
      {playing && youtubeKey ? (
        <MutedTrailer videoKey={youtubeKey} onProgress={(ratio) => onProgress.current(ratio)} />
      ) : null}
      <div className="absolute inset-0 hero-gradient-right" />
      <div className="absolute inset-0 hero-gradient-bottom" />
      <div className="absolute inset-0 bg-gradient-to-r from-cinema-bg via-cinema-bg/75 to-transparent" />

      {playing ? (
        <div className="absolute right-6 top-4 z-20 flex items-center gap-3 text-cinema-chalk">
          <span className="text-xs font-semibold">Tráiler</span>
          <div
            className="h-1 w-28 overflow-hidden rounded-full bg-white/25"
            role="progressbar"
            aria-label="Avance del tráiler"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(progress * 100)}
          >
            <div
              className="h-full bg-cinema-accent"
              style={{ width: `${Math.round(progress * 100)}%` }}
            />
          </div>
        </div>
      ) : null}

      <div className="absolute inset-0 flex items-end pb-8 md:pb-12">
        <div className="container mx-auto px-4">
          <div className="max-w-2xl">
            <p className="mb-3 flex items-center gap-2 text-xs font-semibold text-cinema-accent">
              <span className="h-1.5 w-1.5 rounded-full bg-cinema-accent" aria-hidden />
              Estreno destacado
            </p>
            <h2 className="font-display text-4xl font-semibold tracking-tight text-cinema-chalk md:text-5xl lg:text-6xl leading-[1.05]">
              {title}
            </h2>
            {meta ? <p className="mt-3 text-sm text-cinema-chalk/80">{meta}</p> : null}
            {!playing && movie.synopsis ? (
              <p className="mt-3 line-clamp-3 max-w-xl text-sm leading-relaxed text-cinema-muted md:text-base">
                {movie.synopsis}
              </p>
            ) : null}
            {miss ? (
              <p className="mt-3 text-sm text-cinema-silver">Este título no tiene tráiler.</p>
            ) : null}
            <div className="mt-5 flex flex-wrap items-center gap-3">
              <Link
                href={playHref}
                className="btn-base inline-flex h-11 items-center gap-2 bg-cinema-accent px-5 text-[15px] text-cinema-bg hover:bg-cinema-accent-light"
              >
                <Play className="h-5 w-5" fill="currentColor" aria-hidden />
                Reproducir
              </Link>
              <button
                type="button"
                onClick={onTrailer}
                className="btn-base inline-flex h-11 items-center gap-2 border border-cinema-chalk/40 bg-cinema-bg/45 px-5 text-[15px] text-cinema-chalk hover:border-cinema-accent hover:text-cinema-accent"
              >
                <Clapperboard className="h-4 w-4" aria-hidden />
                Tráiler
              </button>
              <button
                type="button"
                onClick={onToggleList}
                aria-pressed={inList}
                className={cn(
                  'btn-base inline-flex h-11 items-center gap-2 border bg-cinema-bg/45 px-5 text-[15px] hover:border-cinema-accent',
                  inList
                    ? 'border-cinema-accent text-cinema-accent'
                    : 'border-cinema-chalk/40 text-cinema-chalk'
                )}
              >
                <Plus className="h-4 w-4" aria-hidden />
                Mi lista
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
