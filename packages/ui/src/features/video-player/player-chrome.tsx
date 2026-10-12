'use client';

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from 'react';
import {
  Maximize,
  Minimize,
  Pause,
  PictureInPicture2,
  Play,
  RotateCcw,
  Sun,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { cn } from '../../shared/utils';

export const PLAYER_BRIGHTNESS_KEY = 'pelis:player:brightness';
export const PLAYER_VOLUME_KEY = 'pelis:player:volume';
export const PLAYER_MUTED_KEY = 'pelis:player:muted';

export const BRIGHTNESS_MIN = 0.3;
export const BRIGHTNESS_MAX = 1.7;
export const BRIGHTNESS_DEFAULT = 1;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function readNumber(key: string, fallback: number, min: number, max: number): number {
  try {
    const raw = localStorage.getItem(key);
    if (raw == null) return fallback;
    const n = Number(raw);
    return Number.isFinite(n) ? clamp(n, min, max) : fallback;
  } catch {
    return fallback;
  }
}

function writeNumber(key: string, value: number): void {
  try {
    localStorage.setItem(key, String(value));
  } catch {
    // private mode / quota
  }
}

export function usePlayerSettings() {
  const [brightness, setBrightnessState] = useState(BRIGHTNESS_DEFAULT);
  const [volume, setVolumeState] = useState(1);
  const [muted, setMutedState] = useState(false);
  const hydrated = useRef(false);

  useEffect(() => {
    setBrightnessState(
      readNumber(PLAYER_BRIGHTNESS_KEY, BRIGHTNESS_DEFAULT, BRIGHTNESS_MIN, BRIGHTNESS_MAX)
    );
    setVolumeState(readNumber(PLAYER_VOLUME_KEY, 1, 0, 1));
    try {
      setMutedState(localStorage.getItem(PLAYER_MUTED_KEY) === '1');
    } catch {
      // ignore
    }
    hydrated.current = true;
  }, []);

  const setBrightness = useCallback((value: number) => {
    const next = clamp(value, BRIGHTNESS_MIN, BRIGHTNESS_MAX);
    setBrightnessState(next);
    if (hydrated.current) writeNumber(PLAYER_BRIGHTNESS_KEY, next);
  }, []);

  const setVolume = useCallback((value: number) => {
    const next = clamp(value, 0, 1);
    setVolumeState(next);
    if (next > 0) setMutedState(false);
    if (hydrated.current) {
      writeNumber(PLAYER_VOLUME_KEY, next);
      try {
        localStorage.setItem(PLAYER_MUTED_KEY, next === 0 ? '1' : '0');
      } catch {
        // ignore
      }
    }
  }, []);

  const setMuted = useCallback((value: boolean) => {
    setMutedState(value);
    if (hydrated.current) {
      try {
        localStorage.setItem(PLAYER_MUTED_KEY, value ? '1' : '0');
      } catch {
        // ignore
      }
    }
  }, []);

  const toggleMute = useCallback(() => {
    setMutedState((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(PLAYER_MUTED_KEY, next ? '1' : '0');
      } catch {
        // ignore
      }
      return next;
    });
  }, []);

  return {
    brightness,
    setBrightness,
    volume,
    setVolume,
    muted,
    setMuted,
    toggleMute,
  };
}

export function playerVideoFilter(brightness: number): string {
  return brightness === 1 ? 'none' : `brightness(${brightness})`;
}

export function formatPlayerTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${m}:${String(s).padStart(2, '0')}`;
}

interface PlayerKeyboardOptions {
  enabled?: boolean;
  onTogglePlay: () => void;
  onSeekDelta?: (delta: number) => void;
  onVolumeDelta: (delta: number) => void;
  onToggleMute: () => void;
  onToggleFullscreen?: () => void;
  onBrightnessDelta: (delta: number) => void;
}

export function usePlayerKeyboard({
  enabled = true,
  onTogglePlay,
  onSeekDelta,
  onVolumeDelta,
  onToggleMute,
  onToggleFullscreen,
  onBrightnessDelta,
}: PlayerKeyboardOptions) {
  useEffect(() => {
    if (!enabled) return;
    const onKey = (event: globalThis.KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)
      ) {
        return;
      }
      const key = event.key;
      if (key === ' ' || key === 'k' || key === 'K') {
        event.preventDefault();
        onTogglePlay();
        return;
      }
      if (key === 'm' || key === 'M') {
        event.preventDefault();
        onToggleMute();
        return;
      }
      if (key === 'f' || key === 'F') {
        event.preventDefault();
        onToggleFullscreen?.();
        return;
      }
      if (key === 'ArrowLeft') {
        event.preventDefault();
        onSeekDelta?.(-10);
        return;
      }
      if (key === 'ArrowRight') {
        event.preventDefault();
        onSeekDelta?.(10);
        return;
      }
      if (key === 'ArrowUp') {
        event.preventDefault();
        if (event.shiftKey) onBrightnessDelta(0.1);
        else onVolumeDelta(0.1);
        return;
      }
      if (key === 'ArrowDown') {
        event.preventDefault();
        if (event.shiftKey) onBrightnessDelta(-0.1);
        else onVolumeDelta(-0.1);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [
    enabled,
    onTogglePlay,
    onSeekDelta,
    onVolumeDelta,
    onToggleMute,
    onToggleFullscreen,
    onBrightnessDelta,
  ]);
}

const sliderClass =
  'h-1 w-16 cursor-pointer appearance-none rounded-full bg-white/20 accent-cinema-accent md:w-20';

export interface PlayerChromeProps {
  playing: boolean;
  onTogglePlay: () => void;
  currentTime?: number;
  duration?: number;
  onSeek?: (seconds: number) => void;
  bufferedPercent?: number;
  volume: number;
  muted: boolean;
  onVolumeChange: (value: number) => void;
  onToggleMute: () => void;
  brightness: number;
  onBrightnessChange: (value: number) => void;
  fullscreen?: boolean;
  onToggleFullscreen?: () => void;
  onTogglePip?: () => void;
  visible: boolean;
  title?: string;
  subtitle?: string;
  trailingExtras?: ReactNode;
  hideSeek?: boolean;
  hidePlayback?: boolean;
  hideVolume?: boolean;
  hideBrightness?: boolean;
  live?: boolean;
  onRewind?: () => void;
}

export function PlayerChrome({
  playing,
  onTogglePlay,
  currentTime = 0,
  duration = 0,
  onSeek,
  bufferedPercent = 0,
  volume,
  muted,
  onVolumeChange,
  onToggleMute,
  brightness,
  onBrightnessChange,
  fullscreen,
  onToggleFullscreen,
  onTogglePip,
  visible,
  title,
  subtitle,
  trailingExtras,
  hideSeek,
  hidePlayback,
  hideVolume,
  hideBrightness,
  live,
  onRewind,
}: PlayerChromeProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [scrubbing, setScrubbing] = useState(false);
  const [scrubTime, setScrubTime] = useState(0);
  const scrubbingRef = useRef(false);
  const durationRef = useRef(duration);
  const onSeekRef = useRef(onSeek);
  durationRef.current = duration;
  onSeekRef.current = onSeek;

  const displayTime = scrubbing ? scrubTime : currentTime;
  const progressPercent = duration > 0 ? (displayTime / duration) * 100 : 0;

  const timeFromClientX = useCallback((clientX: number) => {
    const el = trackRef.current;
    const total = durationRef.current;
    if (!el || !total) return 0;
    const rect = el.getBoundingClientRect();
    const ratio = rect.width > 0 ? (clientX - rect.left) / rect.width : 0;
    return clamp(ratio * total, 0, Math.max(0, total - 0.25));
  }, []);

  const beginScrub = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (!onSeekRef.current || !durationRef.current) return;
      if (event.button !== 0 && event.pointerType === 'mouse') return;
      event.preventDefault();
      event.stopPropagation();
      const next = timeFromClientX(event.clientX);
      scrubbingRef.current = true;
      setScrubbing(true);
      setScrubTime(next);
      try {
        event.currentTarget.setPointerCapture(event.pointerId);
      } catch {
        // Safari can throw if the element is gone
      }
    },
    [timeFromClientX]
  );

  const moveScrub = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (!scrubbingRef.current) return;
      event.preventDefault();
      setScrubTime(timeFromClientX(event.clientX));
    },
    [timeFromClientX]
  );

  const endScrub = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (!scrubbingRef.current) return;
      scrubbingRef.current = false;
      const next = timeFromClientX(event.clientX);
      setScrubTime(next);
      setScrubbing(false);
      onSeekRef.current?.(next);
      try {
        event.currentTarget.releasePointerCapture(event.pointerId);
      } catch {
        // already released
      }
    },
    [timeFromClientX]
  );

  const onSeekKey = (event: KeyboardEvent<HTMLDivElement>) => {
    if (!onSeek || !duration) return;
    if (event.key === 'ArrowRight') onSeek(Math.min(currentTime + 10, duration));
    if (event.key === 'ArrowLeft') onSeek(Math.max(currentTime - 10, 0));
  };

  return (
    <div
      data-player-chrome
      className={cn(
        'absolute inset-x-0 bottom-0 z-30 bg-gradient-to-t from-cinema-bg via-cinema-bg/80 to-transparent pt-14 transition-opacity duration-normal ease-out-expo',
        'pl-[max(0.75rem,env(safe-area-inset-left,0px))] pr-[max(0.75rem,env(safe-area-inset-right,0px))] pb-[max(0.75rem,env(safe-area-inset-bottom,0px))]',
        visible || !playing || scrubbing ? 'opacity-100' : 'pointer-events-none opacity-0'
      )}
    >
      {(title || subtitle) && (
        <div className="mb-3 px-0.5">
          {title && <p className="font-display text-base text-cinema-chalk md:text-lg">{title}</p>}
          {subtitle && <p className="text-xs text-cinema-muted">{subtitle}</p>}
        </div>
      )}

      {!hideSeek && (
        <div className="relative mb-2 h-5 cursor-pointer touch-none md:h-4">
          <div className="absolute top-1/2 h-1 w-full -translate-y-1/2 rounded-full bg-white/15">
            <div
              className="absolute h-full rounded-full bg-white/25"
              style={{ width: `${bufferedPercent}%` }}
            />
            <div
              className="absolute h-full rounded-full bg-cinema-accent"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <div
            className="absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-cinema-accent-light shadow-glow"
            style={{ left: `${progressPercent}%` }}
          >
            {scrubbing && (
              <div
                className="pointer-events-none absolute bottom-full left-1/2 mb-2 -translate-x-1/2 whitespace-nowrap rounded-md border border-cinema-accent/30 bg-cinema-bg/95 px-2 py-1 font-display text-xs tabular-nums text-cinema-chalk shadow-[0_8px_24px_rgba(19,19,21,0.55)]"
                role="status"
                aria-live="polite"
              >
                {formatPlayerTime(scrubTime)}
              </div>
            )}
          </div>
          <div
            ref={trackRef}
            role="slider"
            aria-label="Progreso de reproducción"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={duration ? Math.round(progressPercent) : 0}
            aria-valuetext={formatPlayerTime(displayTime)}
            tabIndex={0}
            className="absolute inset-0"
            onPointerDown={beginScrub}
            onPointerMove={moveScrub}
            onPointerUp={endScrub}
            onPointerCancel={endScrub}
            onKeyDown={onSeekKey}
          />
        </div>
      )}

      <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-cinema-chalk md:flex-nowrap md:gap-2">
        {!hidePlayback && (
          <button
            type="button"
            onClick={onTogglePlay}
            className="rounded-full bg-cinema-accent p-2.5 text-cinema-bg transition-colors hover:bg-cinema-accent-light focus-visible:ring-cinema-accent md:p-2"
            aria-label={playing ? 'Pausar' : 'Reproducir'}
          >
            {playing ? (
              <Pause className="h-4 w-4 fill-current" aria-hidden />
            ) : (
              <Play className="ml-0.5 h-4 w-4 fill-current" aria-hidden />
            )}
          </button>
        )}

        {onRewind && !hidePlayback && (
          <button
            type="button"
            onClick={onRewind}
            className="rounded-full p-2.5 hover:bg-white/10 md:p-2"
            aria-label="Retroceder 10 segundos"
          >
            <RotateCcw className="h-4 w-4" aria-hidden />
          </button>
        )}

        {!hideVolume && (
          <div className="hidden items-center gap-1.5 md:flex">
            <button
              type="button"
              onClick={onToggleMute}
              className="rounded-full p-2.5 hover:bg-white/10 md:p-2"
              aria-label={muted || volume === 0 ? 'Activar sonido' : 'Silenciar'}
            >
              {muted || volume === 0 ? (
                <VolumeX className="h-5 w-5" aria-hidden />
              ) : (
                <Volume2 className="h-5 w-5" aria-hidden />
              )}
            </button>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={muted ? 0 : volume}
              onChange={(event) => onVolumeChange(Number(event.target.value))}
              className={sliderClass}
              aria-label="Volumen"
            />
          </div>
        )}

        {live ? (
          <span className="ml-1 inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-widest text-cinema-danger">
            <span className="h-1.5 w-1.5 rounded-full bg-cinema-danger" aria-hidden />
            En vivo
          </span>
        ) : !hideSeek ? (
          <span className="ml-1 text-xs tabular-nums text-cinema-chalk/85">
            {formatPlayerTime(displayTime)}{' '}
            <span className="text-cinema-muted">/ {formatPlayerTime(duration)}</span>
          </span>
        ) : null}

        <div className="ml-auto flex shrink-0 items-center gap-1">
          {!hideBrightness && (
            <div className="hidden items-center gap-1.5 md:flex">
              <Sun className="h-4 w-4 text-cinema-accent" aria-hidden />
              <input
                type="range"
                min={BRIGHTNESS_MIN}
                max={BRIGHTNESS_MAX}
                step={0.05}
                value={brightness}
                onChange={(event) => onBrightnessChange(Number(event.target.value))}
                className={sliderClass}
                aria-label="Brillo"
              />
            </div>
          )}

          {trailingExtras}

          {onTogglePip && (
            <button
              type="button"
              onClick={onTogglePip}
              className="hidden rounded-full p-2.5 hover:bg-white/10 md:inline-flex md:p-2"
              aria-label="Picture in picture"
            >
              <PictureInPicture2 className="h-5 w-5" aria-hidden />
            </button>
          )}

          {onToggleFullscreen && (
            <button
              type="button"
              onClick={onToggleFullscreen}
              className="rounded-full p-2.5 hover:bg-white/10 md:p-2"
              aria-label={fullscreen ? 'Salir de pantalla completa' : 'Pantalla completa'}
            >
              {fullscreen ? (
                <Minimize className="h-5 w-5" aria-hidden />
              ) : (
                <Maximize className="h-5 w-5" aria-hidden />
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
