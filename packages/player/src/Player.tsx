'use client';

/**
 * Componente Player — reproductor HTML5 propio para Pelis.
 *
 * - hls.js (lazy) con fallback HLS nativo Safari/iOS y archivos directos.
 * - Chromecast (Cast Web Sender, carga lazy).
 * - AirPlay / Remote Playback API (selector del sistema).
 * - Picture-in-Picture, subtítulos WebVTT, velocidad.
 * - Mando a distancia / teclado (D-pad, Enter, Media*).
 *
 * No sustituye al reproductor de producción
 * (`@pelis/ui/features/video-player`); ver
 * `decisions/0001-player-native-cast-dlna.md`.
 *
 * @module @pelis/player/Player
 */

import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react';
import {
  Cast,
  Maximize,
  Minimize,
  Pause,
  PictureInPicture2,
  Play,
  Settings,
  Subtitles,
  Volume2,
  VolumeX,
  Wifi,
} from 'lucide-react';

import { formatTime, nextCaptionId } from './captions';
import { setupCast, type CastHandle } from './cast';
import { createDlnaHandle, type DlnaHandle } from './dlna';
import { attachHls, detachHls, type AttachResult } from './hls';
import { throttle, type ThrottledSaver } from './progress';
import { applyRemoteAction, attachRemote } from './remote';
import type { CaptionTrack, PlayerError, PlayerProps } from './types';

type Speed = 0.5 | 0.75 | 1 | 1.25 | 1.5 | 2;
type CastState = 'idle' | 'loading' | 'ready' | 'unavailable';

const SPEEDS: ReadonlyArray<Speed> = [0.5, 0.75, 1, 1.25, 1.5, 2];
const SEEK_STEP = 10;
const PROGRESS_INTERVAL_MS = 5000;
const CONTROLS_IDLE_MS = 3000;

// Maison Noir por defecto; sobrescribible con las variables --pelis-player-*.
const BG = 'var(--pelis-player-bg, #0B0B0D)';
const SURFACE = 'var(--pelis-player-surface, rgba(28,27,29,0.92))';
const BORDER = 'var(--pelis-player-border, #353437)';
const ACCENT = 'var(--pelis-player-accent, #E5C276)';
const TEXT = 'var(--pelis-player-text, #F2EEE6)';

const playerStyles: CSSProperties = {
  position: 'relative',
  width: '100%',
  aspectRatio: '16 / 9',
  background: BG,
  color: TEXT,
  borderRadius: 4,
  overflow: 'hidden',
  border: `1px solid ${BORDER}`,
};

const buttonStyle: CSSProperties = {
  background: SURFACE,
  border: `1px solid ${BORDER}`,
  color: 'inherit',
  borderRadius: 9999,
  padding: 10,
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer',
};

const chipStyle = (active: boolean): CSSProperties => ({
  padding: '4px 10px',
  borderRadius: 9999,
  border: `1px solid ${BORDER}`,
  background: active ? ACCENT : 'transparent',
  color: active ? '#0B0B0D' : 'inherit',
  fontSize: 12,
  cursor: 'pointer',
  textAlign: 'left',
});

/** Ref que siempre apunta al último valor (evita reiniciar efectos por callbacks inline). */
function useLatest<T>(value: T) {
  const ref = useRef(value);
  ref.current = value;
  return ref;
}

function absoluteUrl(url: string): string {
  if (typeof window === 'undefined') return url;
  try {
    return new URL(url, window.location.href).href;
  } catch {
    return url;
  }
}

function errorName(cause: unknown): string | undefined {
  if (cause && typeof cause === 'object' && 'name' in cause) {
    const { name } = cause as { name?: unknown };
    return typeof name === 'string' ? name : undefined;
  }
  return undefined;
}

export function Player({
  src,
  sourceType,
  poster,
  title,
  autoPlay = false,
  startAt,
  captions,
  mediaId,
  hlsConfig,
  onProgress,
  onPlay,
  onPause,
  onEnded,
  onError,
  className,
}: PlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const saverRef = useRef<ThrottledSaver | null>(null);
  const castRef = useRef<CastHandle | null>(null);
  const dlnaRef = useRef<DlnaHandle | null>(null);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handlers = useLatest({ onProgress, onPlay, onPause, onEnded, onError });
  const hlsConfigRef = useLatest(hlsConfig);
  const captionsRef = useLatest(captions);

  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [speed, setSpeed] = useState<number>(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isPip, setIsPip] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [activeCaption, setActiveCaption] = useState<string | null>(null);
  const [castState, setCastState] = useState<CastState>('idle');
  const [controlsVisible, setControlsVisible] = useState(true);

  const emitError = useCallback(
    (error: PlayerError) => handlers.current.onError?.(error),
    [handlers]
  );

  const revealControls = useCallback(() => {
    setControlsVisible(true);
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    hideTimerRef.current = setTimeout(() => {
      const video = videoRef.current;
      if (video && !video.paused) setControlsVisible(false);
    }, CONTROLS_IDLE_MS);
  }, []);

  useEffect(
    () => () => {
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    },
    []
  );

  // Fuente: hls.js / nativo / archivo.
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    let cancelled = false;
    let attached: AttachResult | null = null;
    setProgress(0);
    setDuration(0);

    attachHls({
      video,
      src,
      sourceType,
      hlsConfig: hlsConfigRef.current,
      onError: (e) => emitError({ code: 'hls', message: e.message, cause: e.cause }),
    })
      .then((result) => {
        if (cancelled) detachHls(result);
        else attached = result;
      })
      .catch((cause: unknown) => {
        if (!cancelled) {
          emitError({ code: 'hls', message: 'No se pudo iniciar la reproducción.', cause });
        }
      });

    return () => {
      cancelled = true;
      detachHls(attached);
    };
  }, [src, sourceType, emitError, hlsConfigRef]);

  // Guardado de progreso (uno por fuente; al cambiar/desmontar guarda la última posición).
  useEffect(() => {
    const saver = throttle((current, total) => handlers.current.onProgress?.(current, total), {
      intervalMs: PROGRESS_INTERVAL_MS,
    });
    saverRef.current = saver;
    return () => {
      void saver.flush();
      if (saverRef.current === saver) saverRef.current = null;
    };
  }, [src, handlers]);

  // Posición inicial.
  useEffect(() => {
    const video = videoRef.current;
    if (!video || startAt == null || startAt <= 0) return;
    const apply = () => {
      if (Math.abs(video.currentTime - startAt) > 1) video.currentTime = startAt;
    };
    if (video.readyState >= 1) {
      apply();
      return;
    }
    video.addEventListener('loadedmetadata', apply, { once: true });
    return () => video.removeEventListener('loadedmetadata', apply);
  }, [src, startAt]);

  // Subtítulos: cambiar `default` tras la carga no tiene efecto; hay que fijar `mode`.
  useEffect(() => {
    const tracks = videoRef.current?.textTracks as TextTrackList | undefined;
    if (!tracks) return;
    for (let i = 0; i < tracks.length; i += 1) {
      const track = tracks[i];
      if (track)
        track.mode = activeCaption !== null && track.id === activeCaption ? 'showing' : 'disabled';
    }
  }, [activeCaption, captions]);

  // Si cambian los subtítulos y el activo ya no existe, desactivar.
  useEffect(() => {
    setActiveCaption((current) =>
      current !== null && !captions?.some((c) => c.id === current) ? null : current
    );
  }, [captions]);

  const toggleFullscreen = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    applyRemoteAction('toggle-fullscreen', video, { fullscreenElement: containerRef.current });
  }, []);

  // Mando a distancia / teclado.
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const remote = attachRemote(container, (action) => {
      const video = videoRef.current;
      if (!video) return;
      revealControls();
      if (action === 'subtitle-next') {
        setActiveCaption((current) => nextCaptionId(captionsRef.current, current));
        return;
      }
      if (action === 'toggle-fullscreen') {
        toggleFullscreen();
        return;
      }
      applyRemoteAction(action, video, { seekStep: SEEK_STEP });
    });
    return () => remote.destroy();
  }, [captionsRef, revealControls, toggleFullscreen]);

  // Pantalla completa y PiP.
  useEffect(() => {
    const onChange = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const onEnter = () => setIsPip(true);
    const onLeave = () => setIsPip(false);
    video.addEventListener('enterpictureinpicture', onEnter);
    video.addEventListener('leavepictureinpicture', onLeave);
    return () => {
      video.removeEventListener('enterpictureinpicture', onEnter);
      video.removeEventListener('leavepictureinpicture', onLeave);
    };
  }, []);

  const togglePlay = useCallback(() => {
    const video = videoRef.current;
    if (video) applyRemoteAction('toggle-play', video);
  }, []);

  const toggleMute = useCallback(() => {
    const video = videoRef.current;
    if (video) video.muted = !video.muted;
  }, []);

  const togglePip = useCallback(async () => {
    const video = videoRef.current;
    if (!video) return;
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
      } else if (document.pictureInPictureEnabled && !video.disablePictureInPicture) {
        await video.requestPictureInPicture();
      } else {
        emitError({ code: 'media', message: 'Picture-in-Picture no disponible.' });
      }
    } catch (cause) {
      emitError({ code: 'media', message: 'Picture-in-Picture no disponible.', cause });
    }
  }, [emitError]);

  const changeVolume = useCallback((next: number) => {
    const video = videoRef.current;
    if (!video) return;
    const clamped = Math.max(0, Math.min(1, next));
    video.volume = clamped;
    video.muted = clamped === 0;
  }, []);

  const changeSpeed = useCallback((next: Speed) => {
    const video = videoRef.current;
    if (video) video.playbackRate = next;
  }, []);

  const seekTo = useCallback((ratio: number) => {
    const video = videoRef.current;
    if (!video || !Number.isFinite(video.duration) || video.duration <= 0) return;
    video.currentTime = Math.max(0, Math.min(video.duration, ratio * video.duration));
  }, []);

  const onCast = useCallback(async () => {
    const video = videoRef.current;
    try {
      if (!castRef.current) {
        setCastState('loading');
        castRef.current = await setupCast();
      }
      if (!castRef.current.isAvailable()) {
        castRef.current = null;
        setCastState('unavailable');
        emitError({ code: 'cast', message: 'Chromecast no está disponible en este navegador.' });
        return;
      }
      setCastState('ready');
      await castRef.current.request({
        src: absoluteUrl(src),
        contentType: sourceType === 'hls' ? 'application/x-mpegurl' : undefined,
        title,
        poster: poster ? absoluteUrl(poster) : undefined,
        startTime: video?.currentTime,
      });
      video?.pause();
    } catch (cause) {
      if (cause === 'cancel') return; // el usuario cerró el selector
      setCastState((s) => (s === 'loading' ? 'idle' : s));
      emitError({ code: 'cast', message: 'No se pudo enviar a Chromecast.', cause });
    }
  }, [emitError, poster, sourceType, src, title]);

  const onRemotePlayback = useCallback(async () => {
    const video = videoRef.current;
    if (!video) return;
    dlnaRef.current ??= createDlnaHandle(video);
    if (!dlnaRef.current.supported) {
      emitError({ code: 'dlna', message: 'AirPlay / reproducción remota no soportada aquí.' });
      return;
    }
    try {
      await dlnaRef.current.pick();
    } catch (cause) {
      const name = errorName(cause);
      if (name === 'NotAllowedError' || name === 'AbortError') return; // selector cerrado
      emitError({
        code: 'dlna',
        message:
          name === 'NotSupportedError'
            ? 'Este stream no admite reproducción remota.'
            : 'No se pudo conectar al dispositivo.',
        cause,
      });
    }
  }, [emitError]);

  const classNameResolved = ['pelis-player', className].filter(Boolean).join(' ');

  return (
    <div
      ref={containerRef}
      className={classNameResolved}
      style={playerStyles}
      data-media-id={mediaId}
      data-testid="pelis-player"
      tabIndex={0}
      role="region"
      aria-label={title ? `Reproductor: ${title}` : 'Reproductor de video'}
      onMouseMove={revealControls}
      onFocus={revealControls}
    >
      <video
        ref={videoRef}
        poster={poster}
        playsInline
        autoPlay={autoPlay}
        aria-label={title}
        onPlay={() => {
          setPlaying(true);
          revealControls();
          handlers.current.onPlay?.();
        }}
        onPause={() => {
          setPlaying(false);
          setControlsVisible(true);
          void saverRef.current?.flush();
          handlers.current.onPause?.();
        }}
        onEnded={(e) => {
          setPlaying(false);
          setControlsVisible(true);
          const v = e.currentTarget;
          saverRef.current?.call(v.duration, v.duration);
          void saverRef.current?.flush();
          handlers.current.onEnded?.();
        }}
        onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
        onDurationChange={(e) => setDuration(e.currentTarget.duration)}
        onTimeUpdate={(e) => {
          const v = e.currentTarget;
          setProgress(v.currentTime);
          saverRef.current?.call(v.currentTime, v.duration);
        }}
        onVolumeChange={(e) => {
          setVolume(e.currentTarget.volume);
          setMuted(e.currentTarget.muted);
        }}
        onRateChange={(e) => setSpeed(e.currentTarget.playbackRate)}
        onError={(e) => {
          const message = e.currentTarget.error?.message || 'Error de reproducción.';
          emitError({ code: 'media', message, cause: e.currentTarget.error });
        }}
        onClick={togglePlay}
        style={{ width: '100%', height: '100%', objectFit: 'contain' }}
      >
        {(captions ?? []).map((track) => (
          <track
            key={track.id}
            id={track.id}
            kind="subtitles"
            src={track.src}
            srcLang={track.language}
            label={track.label}
          />
        ))}
      </video>

      <PlayerControlsBar
        visible={controlsVisible || !playing || showSettings}
        playing={playing}
        muted={muted}
        volume={volume}
        progress={progress}
        duration={duration}
        speed={speed}
        isFullscreen={isFullscreen}
        isPip={isPip}
        showSettings={showSettings}
        castState={castState}
        captions={captions}
        activeCaption={activeCaption}
        onTogglePlay={togglePlay}
        onToggleMute={toggleMute}
        onToggleFullscreen={toggleFullscreen}
        onTogglePip={() => void togglePip()}
        onToggleSettings={() => setShowSettings((s) => !s)}
        onCast={() => void onCast()}
        onRemotePlayback={() => void onRemotePlayback()}
        onSeek={seekTo}
        onVolume={changeVolume}
        onSpeed={changeSpeed}
        onSelectCaption={setActiveCaption}
        onCycleCaption={() => setActiveCaption((current) => nextCaptionId(captions, current))}
      />
    </div>
  );
}

type ControlsProps = {
  readonly visible: boolean;
  readonly playing: boolean;
  readonly muted: boolean;
  readonly volume: number;
  readonly progress: number;
  readonly duration: number;
  readonly speed: number;
  readonly isFullscreen: boolean;
  readonly isPip: boolean;
  readonly showSettings: boolean;
  readonly castState: CastState;
  readonly captions: ReadonlyArray<CaptionTrack> | undefined;
  readonly activeCaption: string | null;
  readonly onTogglePlay: () => void;
  readonly onToggleMute: () => void;
  readonly onToggleFullscreen: () => void;
  readonly onTogglePip: () => void;
  readonly onToggleSettings: () => void;
  readonly onCast: () => void;
  readonly onRemotePlayback: () => void;
  readonly onSeek: (ratio: number) => void;
  readonly onVolume: (value: number) => void;
  readonly onSpeed: (value: Speed) => void;
  readonly onSelectCaption: (id: string | null) => void;
  readonly onCycleCaption: () => void;
};

function PlayerControlsBar({
  visible,
  playing,
  muted,
  volume,
  progress,
  duration,
  speed,
  isFullscreen,
  isPip,
  showSettings,
  castState,
  captions,
  activeCaption,
  onTogglePlay,
  onToggleMute,
  onToggleFullscreen,
  onTogglePip,
  onToggleSettings,
  onCast,
  onRemotePlayback,
  onSeek,
  onVolume,
  onSpeed,
  onSelectCaption,
  onCycleCaption,
}: ControlsProps) {
  const safeDuration = Number.isFinite(duration) && duration > 0 ? duration : 0;
  const ratio = safeDuration > 0 ? Math.min(1, progress / safeDuration) : 0;
  const hasCaptions = Boolean(captions && captions.length > 0);

  return (
    <div
      data-testid="pelis-player-controls"
      style={{
        position: 'absolute',
        insetInline: 0,
        bottom: 0,
        padding: 16,
        background: 'linear-gradient(to top, rgba(11,11,13,0.95), transparent)',
        opacity: visible ? 1 : 0,
        transition: 'opacity 200ms',
      }}
    >
      <div
        role="slider"
        aria-label="Progreso"
        aria-valuemin={0}
        aria-valuemax={Math.round(safeDuration)}
        aria-valuenow={Math.round(progress)}
        aria-valuetext={`${formatTime(progress)} de ${formatTime(safeDuration)}`}
        tabIndex={0}
        style={{
          height: 8,
          background: SURFACE,
          borderRadius: 9999,
          marginBottom: 12,
          cursor: 'pointer',
          position: 'relative',
        }}
        onClick={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          if (rect.width > 0) onSeek((e.clientX - rect.left) / rect.width);
        }}
      >
        <div
          style={{
            height: '100%',
            width: `${ratio * 100}%`,
            background: ACCENT,
            borderRadius: 9999,
          }}
        />
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            type="button"
            onClick={onTogglePlay}
            style={buttonStyle}
            aria-label={playing ? 'Pausar' : 'Reproducir'}
          >
            {playing ? <Pause size={20} /> : <Play size={20} fill="currentColor" />}
          </button>
          <button
            type="button"
            onClick={onToggleMute}
            style={buttonStyle}
            aria-label={muted ? 'Activar sonido' : 'Silenciar'}
          >
            {muted || volume === 0 ? <VolumeX size={20} /> : <Volume2 size={20} />}
          </button>
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={muted ? 0 : volume}
            onChange={(e) => onVolume(Number.parseFloat(e.target.value))}
            aria-label="Volumen"
            style={{ width: 90, accentColor: ACCENT }}
          />
          <span style={{ fontSize: 12, fontVariantNumeric: 'tabular-nums', opacity: 0.85 }}>
            {formatTime(progress)} / {formatTime(safeDuration)}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            type="button"
            onClick={onCast}
            style={buttonStyle}
            aria-label="Enviar a Chromecast"
            disabled={castState === 'loading'}
          >
            <Cast size={20} />
          </button>
          <button
            type="button"
            onClick={onRemotePlayback}
            style={buttonStyle}
            aria-label="AirPlay / reproducción remota"
          >
            <Wifi size={20} />
          </button>
          {hasCaptions ? (
            <button
              type="button"
              onClick={onCycleCaption}
              style={buttonStyle}
              aria-label="Subtítulos"
              aria-pressed={activeCaption !== null}
            >
              <Subtitles size={20} />
            </button>
          ) : null}
          <button
            type="button"
            onClick={onTogglePip}
            style={buttonStyle}
            aria-label="Picture-in-Picture"
            aria-pressed={isPip}
          >
            <PictureInPicture2 size={20} />
          </button>
          <button
            type="button"
            onClick={onToggleSettings}
            style={buttonStyle}
            aria-label="Ajustes"
            aria-expanded={showSettings}
          >
            <Settings size={20} />
          </button>
          <button
            type="button"
            onClick={onToggleFullscreen}
            style={buttonStyle}
            aria-label={isFullscreen ? 'Salir de pantalla completa' : 'Pantalla completa'}
          >
            {isFullscreen ? <Minimize size={20} /> : <Maximize size={20} />}
          </button>
        </div>
      </div>

      {showSettings ? (
        <div
          role="group"
          aria-label="Ajustes del reproductor"
          style={{
            position: 'absolute',
            right: 16,
            bottom: 72,
            background: SURFACE,
            border: `1px solid ${BORDER}`,
            borderRadius: 4,
            padding: 12,
            minWidth: 180,
          }}
        >
          <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 4 }}>Velocidad</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 8 }}>
            {SPEEDS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => onSpeed(s)}
                aria-pressed={s === speed}
                style={chipStyle(s === speed)}
              >
                {s}×
              </button>
            ))}
          </div>
          {hasCaptions ? (
            <>
              <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 4 }}>Subtítulos</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <button
                  type="button"
                  onClick={() => onSelectCaption(null)}
                  aria-pressed={activeCaption === null}
                  style={chipStyle(activeCaption === null)}
                >
                  Desactivados
                </button>
                {captions?.map((track) => (
                  <button
                    key={track.id}
                    type="button"
                    onClick={() => onSelectCaption(track.id)}
                    aria-pressed={activeCaption === track.id}
                    style={chipStyle(activeCaption === track.id)}
                  >
                    {track.label}
                  </button>
                ))}
              </div>
            </>
          ) : null}
          {isPip ? (
            <div style={{ marginTop: 8, fontSize: 12, opacity: 0.7 }}>
              Picture-in-Picture activo
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
