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
  heroSynopsis,
  heroTitle,
  isFeaturedTitle,
  isTooDark,
  nextImageWidth,
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

/** Luminancia media (0–255) de una imagen, muestreada a 32×18. Null si el navegador no puede. */
async function meanLuma(blob: Blob): Promise<number | null> {
  try {
    if (typeof createImageBitmap !== 'function') return null;
    const bitmap = await createImageBitmap(blob, { resizeWidth: 32, resizeHeight: 18 });
    const canvas = document.createElement('canvas');
    canvas.width = 32;
    canvas.height = 18;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return null;
    ctx.drawImage(bitmap, 0, 0, 32, 18);
    bitmap.close?.();
    const data = ctx.getImageData(0, 0, 32, 18).data;
    let sum = 0;
    for (let i = 0; i < data.length; i += 4) {
      sum += 0.299 * data[i]! + 0.587 * data[i + 1]! + 0.114 * data[i + 2]!;
    }
    return sum / (data.length / 4);
  } catch {
    return null;
  }
}

type StillState = { key: string; src: string | null; usable: boolean };

/**
 * Carga el fondo al tamaño de la pantalla y cancela la petición si el foco se va.
 * `usable` es falso si no hay fondo, si falla o si es casi negro: entonces el hero
 * se pinta con el póster.
 */
function useHeroStill(raw: string | null | undefined) {
  const [state, setState] = useState<StillState | null>(null);
  const hasShown = useRef(false);
  const key = raw?.trim() ?? '';
  useEffect(() => {
    const width = heroRequestWidth(window.innerWidth, window.devicePixelRatio || 1);
    const next = heroBackdropSrc(raw, width);
    if (!next) {
      setState({ key, src: null, usable: false });
      return;
    }
    const ac = new AbortController();
    const delay = hasShown.current ? HERO_IMAGE_DEBOUNCE_MS : 0;
    const timer = window.setTimeout(() => {
      void fetch(next, { signal: ac.signal })
        .then((res) => {
          if (!res.ok) throw new Error('hero');
          return res.blob();
        })
        .then(async (blob) => {
          const luma = await meanLuma(blob);
          if (ac.signal.aborted) return;
          hasShown.current = true;
          if (isTooDark(luma)) {
            setState({ key, src: null, usable: false });
            return;
          }
          setState({ key, src: URL.createObjectURL(blob), usable: true });
        })
        .catch(() => {
          if (!ac.signal.aborted) {
            hasShown.current = true;
            setState({ key, src: null, usable: false });
          }
        });
    }, delay);
    return () => {
      window.clearTimeout(timer);
      ac.abort();
    };
  }, [raw, key]);
  const src = state?.src;
  useEffect(
    () => () => {
      if (src?.startsWith('blob:')) URL.revokeObjectURL(src);
    },
    [src]
  );
  if (!state) return { src: null, settled: false, usable: false };
  // Mientras llega el fondo nuevo se deja el anterior (sin parpadeo a negro).
  return { src: state.src, settled: state.key === key, usable: state.usable };
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
  const poster = heroBackdropSrc(movie.image, nextImageWidth(384));
  const posterHero = still.settled && !still.usable;
  const synopsis = heroSynopsis(movie.synopsis);
  const featured = isFeaturedTitle(movie);
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
      {poster ? (
        // Base siempre presente: el póster difuminado. Así el hero nunca queda negro.
        <img
          src={poster}
          alt=""
          aria-hidden
          className="absolute inset-0 h-full w-full scale-110 object-cover object-center opacity-60 blur-2xl"
        />
      ) : null}
      {still.src && !posterHero ? (
        <img
          src={still.src}
          alt=""
          className="absolute inset-0 h-full w-full object-cover object-center"
        />
      ) : null}
      {posterHero && poster ? (
        <img
          src={poster}
          alt=""
          aria-hidden
          data-testid="hero-poster-fallback"
          className="absolute right-[8%] top-1/2 hidden h-[78%] -translate-y-1/2 rounded-md object-cover shadow-2xl ring-1 ring-white/10 lg:block"
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
            {featured ? (
              <p className="mb-3 flex items-center gap-2 text-xs font-semibold text-cinema-accent">
                <span className="h-1.5 w-1.5 rounded-full bg-cinema-accent" aria-hidden />
                Estreno destacado
              </p>
            ) : null}
            <h2 className="font-display text-4xl font-semibold tracking-tight text-cinema-chalk md:text-5xl lg:text-6xl leading-[1.05]">
              {title}
            </h2>
            {meta ? <p className="mt-3 text-sm text-cinema-chalk/80">{meta}</p> : null}
            {!playing && synopsis ? (
              <p className="mt-3 line-clamp-3 max-w-xl text-sm leading-relaxed text-cinema-muted md:text-base">
                {synopsis}
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
