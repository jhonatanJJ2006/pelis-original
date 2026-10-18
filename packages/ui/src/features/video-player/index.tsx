'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useMutation, useQueryResult } from '@pelis/db/client';
import Hls from 'hls.js';
import { AlertCircle, Play } from 'lucide-react';
import { api } from '@pelis/db/api';
import { cn } from '../../shared/utils';
import {
  PlayerChrome,
  playerVideoFilter,
  usePlayerKeyboard,
  usePlayerSettings,
} from './player-chrome';
import { PlayerGestureHud, usePlayerSurfaceGestures } from './player-gestures';
import { PlayerLoadingOverlay } from './player-loading';
import { isMobilePlayerViewport, useMobileLandscapePlayer } from './player-landscape';
import { createVodHlsConfig } from './hls-config';
import { attachHlsSeekWatchdog } from './hls-seek-watchdog';
import { QualityMenu } from './quality-menu';
import {
  hlsQualityOptions,
  shouldShowQualitySelector,
  type QualityLevelOption,
} from './quality-levels';
import { resumeSeekSeconds, shouldWritePlaybackProgress } from './resume';

export {
  PlayerChrome,
  formatPlayerTime,
  playerVideoFilter,
  usePlayerKeyboard,
  usePlayerSettings,
  BRIGHTNESS_DEFAULT,
  BRIGHTNESS_MAX,
  BRIGHTNESS_MIN,
} from './player-chrome';
export {
  PlayerGestureHud,
  applyVerticalDrag,
  classifySurfaceDrag,
  gesturePercent,
  usePlayerSurfaceGestures,
} from './player-gestures';
export { PlayerLoadingOverlay } from './player-loading';
export { createVodHlsConfig, HLS_TARGET_FORWARD_BUFFER_SECONDS } from './hls-config';
export { attachHlsSeekWatchdog } from './hls-seek-watchdog';
export { QualityMenu } from './quality-menu';
export {
  hlsQualityOptions,
  qualityButtonLabel,
  shouldShowQualitySelector,
  type QualityLevelOption,
} from './quality-levels';
export {
  useMobileLandscapePlayer,
  isMobilePlayerViewport,
  pickLandscapeFallback,
  PLAYER_LANDSCAPE_COVER_CLASS,
} from './player-landscape';

/** The real cause when the stream API refuses a playlist/segment mid-playback. */
export function hlsFailureMessage(status?: number): string {
  if (status === 401) return 'Tu sesión expiró. Inicia sesión de nuevo para seguir viendo.';
  if (status === 403) return 'Necesitas un plan activo para reproducir este contenido.';
  if (status === 404) return 'Este video no está disponible en el servidor.';
  if (status === 503) {
    return 'El almacenamiento de video no está disponible ahora. Vuelve a intentarlo en unos minutos.';
  }
  return 'Error de conexión al cargar el video. Revisa tu conexión e intenta de nuevo.';
}

const DEMO_VIDEO =
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4';

interface VideoPlayerProps {
  videoUrl?: string;
  poster: string;
  title: string;
  userId: string;
  movieId: string;
  autoPlay?: boolean;
}

export function VideoPlayer({
  videoUrl,
  poster,
  title,
  userId,
  movieId,
  autoPlay = false,
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const upsertHistory = useMutation(api.history.upsert);
  const [playing, setPlaying] = useState(autoPlay);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [showControls, setShowControls] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mediaReady, setMediaReady] = useState(false);
  const [buffering, setBuffering] = useState(false);
  const [bufferedPercent, setBufferedPercent] = useState(0);
  const [fullscreen, setFullscreen] = useState(false);
  const [metadataTick, setMetadataTick] = useState(0);
  /** Bumped by "Reintentar" to rebuild the hls.js pipeline. */
  const [reloadKey, setReloadKey] = useState(0);
  const hlsRef = useRef<Hls | null>(null);
  const [qualityOptions, setQualityOptions] = useState<QualityLevelOption[]>([]);
  const [selectedLevel, setSelectedLevel] = useState(-1);
  const [playingLevel, setPlayingLevel] = useState(-1);
  const [qualityMenuOpen, setQualityMenuOpen] = useState(false);
  const lastSaved = useRef(0);
  const resumeSettledRef = useRef(false);
  const resumeTargetRef = useRef<number | null>(null);
  const didResumeRef = useRef(false);
  const metadataSrcRef = useRef<string | null>(null);
  const savedHistory = useQueryResult<{ progress: number; duration: number } | null>(
    api.history.getByUserAndMovie,
    userId && movieId ? { movieId } : 'skip'
  );
  const { brightness, setBrightness, volume, setVolume, muted, setMuted, toggleMute } =
    usePlayerSettings();

  const src = videoUrl || DEMO_VIDEO;
  const isHls = src.includes('.m3u8');
  const useHlsJs = isHls && Hls.isSupported();

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    setError(null);
    setMediaReady(false);
    setBuffering(false);
    setBufferedPercent(0);
    setQualityOptions([]);
    setSelectedLevel(-1);
    setPlayingLevel(-1);
    setQualityMenuOpen(false);

    if (!isHls) {
      video.src = src;
      return;
    }

    if (useHlsJs) {
      const hls = new Hls(createVodHlsConfig());
      const stopSeekWatchdog = attachHlsSeekWatchdog(hls, video);
      hlsRef.current = hls;
      // Single-rendition playlists give one level (selector hidden); a
      // master.m3u8 with variants lists them all.
      hls.on(Hls.Events.MANIFEST_PARSED, (_event, data) => {
        setQualityOptions(hlsQualityOptions(data.levels));
      });
      hls.on(Hls.Events.LEVEL_SWITCHED, (_event, data) => {
        setPlayingLevel(data.level);
      });
      hls.loadSource(src);
      hls.attachMedia(video);

      let networkRetries = 0;
      let mediaRetries = 0;
      const failLoad = (status?: number) => {
        setError(hlsFailureMessage(status));
        setPlaying(false);
        setBuffering(false);
      };
      hls.on(Hls.Events.ERROR, (_, data) => {
        if (!data.fatal) {
          // Do not startLoad() on BUFFER_STALLED. That stops the loader and
          // aborts the fragment already in flight, so a healthy VOD never
          // reaches loadedmetadata and the overlay stays at 0:00. hls.js
          // nudges buffer holes itself. Fatal network errors still retry once.
          return;
        }
        switch (data.type) {
          case Hls.ErrorTypes.NETWORK_ERROR: {
            // One retry for a fatal network error, then a visible error.
            // An uncapped startLoad() never reaches loadedmetadata, so the
            // overlay spins at 0:00 forever.
            const manifestDead =
              data.details === Hls.ErrorDetails.MANIFEST_LOAD_ERROR ||
              data.details === Hls.ErrorDetails.MANIFEST_LOAD_TIMEOUT ||
              data.details === Hls.ErrorDetails.MANIFEST_PARSING_ERROR;
            if (manifestDead || networkRetries >= 1) {
              failLoad(data.response?.code);
            } else {
              networkRetries += 1;
              hls.startLoad();
            }
            break;
          }
          case Hls.ErrorTypes.MEDIA_ERROR:
            // recoverMediaError() re-fires a fatal error when it cannot repair
            // the pipeline. One attempt, then surface the failure.
            if (mediaRetries >= 1) {
              failLoad();
            } else {
              mediaRetries += 1;
              hls.recoverMediaError();
            }
            break;
          default:
            failLoad();
        }
      });

      return () => {
        stopSeekWatchdog();
        hlsRef.current = null;
        hls.destroy();
      };
    }

    if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.preload = 'auto';
      video.src = src;
    }
  }, [src, isHls, useHlsJs, reloadKey]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.volume = volume;
    video.muted = muted;
  }, [volume, muted]);

  const saveProgress = async (current: number, total: number) => {
    if (
      !userId ||
      !shouldWritePlaybackProgress({
        current,
        total,
        resumeSettled: resumeSettledRef.current,
        resumeTarget: resumeTargetRef.current,
      })
    ) {
      return;
    }
    const now = Date.now();
    if (now - lastSaved.current < 5000 && current < total * 0.95) return;
    lastSaved.current = now;
    await upsertHistory({
      userId: userId as any,
      movieId: movieId as any,
      progress: current,
      duration: total,
    });
  };

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !autoPlay || error) return;
    video.play().catch(() => setPlaying(false));
  }, [autoPlay, error]);

  useEffect(() => {
    didResumeRef.current = false;
    resumeSettledRef.current = false;
    resumeTargetRef.current = null;
  }, [movieId, src]);

  useEffect(() => {
    // Only seek once metadata belongs to this src. A previous file's
    // duration is still on the element until loadedmetadata fires again.
    if (savedHistory.isLoading || didResumeRef.current) return;
    if (metadataSrcRef.current !== src) return;
    const video = videoRef.current;
    if (!video) return;
    const target = resumeSeekSeconds(savedHistory.data ?? null, video.duration);
    resumeTargetRef.current = target;
    if (target != null && Number.isFinite(video.duration) && video.duration > 0) {
      const next = Math.min(target, Math.max(0, video.duration - 0.25));
      if (Math.abs(video.currentTime - next) > 0.75) {
        setProgress(next);
        setBuffering(true);
        video.currentTime = next;
      }
    }
    didResumeRef.current = true;
    resumeSettledRef.current = true;
  }, [savedHistory.isLoading, savedHistory.data, movieId, src, metadataTick]);

  const {
    landscapeActive,
    enter: enterLandscape,
    exit: exitLandscape,
    surfaceClassName: landscapeClassName,
    surfaceStyle: landscapeStyle,
  } = useMobileLandscapePlayer({
    containerRef,
    videoRef,
    enterOnMount: autoPlay,
  });

  const { hud, hudVisible, didGesture } = usePlayerSurfaceGestures({
    containerRef,
    brightness,
    setBrightness,
    volume,
    setVolume,
    enabled: landscapeActive,
  });

  const togglePlay = useCallback(() => {
    const video = videoRef.current;
    if (!video || error) return;
    if (video.paused) {
      void video.play();
      setPlaying(true);
      void enterLandscape();
    } else {
      video.pause();
      setPlaying(false);
    }
  }, [error, enterLandscape]);

  const seek = useCallback((seconds: number) => {
    const video = videoRef.current;
    if (!video || !Number.isFinite(video.duration)) return;
    const next = Math.min(Math.max(0, seconds), Math.max(0, video.duration - 0.25));
    setProgress(next);
    setBuffering(true);
    video.currentTime = next;
  }, []);

  const toggleFullscreen = useCallback(() => {
    if (isMobilePlayerViewport()) {
      if (landscapeActive) void exitLandscape();
      else void enterLandscape();
      return;
    }
    if (document.fullscreenElement) {
      void document.exitFullscreen();
    } else {
      containerRef.current?.requestFullscreen().catch(() => {});
    }
  }, [enterLandscape, exitLandscape, landscapeActive]);

  const togglePip = useCallback(async () => {
    const video = videoRef.current;
    if (!video) return;
    try {
      if (document.pictureInPictureElement) await document.exitPictureInPicture();
      else await video.requestPictureInPicture();
    } catch {
      // not supported
    }
  }, []);

  useEffect(() => {
    const onFs = () => setFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', onFs);
    return () => document.removeEventListener('fullscreenchange', onFs);
  }, []);

  const bumpControls = useCallback(() => {
    setShowControls(true);
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    hideTimerRef.current = setTimeout(() => {
      if (!videoRef.current?.paused) setShowControls(false);
    }, 3200);
  }, []);

  useEffect(() => {
    bumpControls();
    return () => {
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    };
  }, [bumpControls]);

  usePlayerKeyboard({
    enabled: !error,
    onTogglePlay: togglePlay,
    onSeekDelta: (delta) => seek((videoRef.current?.currentTime ?? 0) + delta),
    onVolumeDelta: (delta) => setVolume(volume + delta),
    onToggleMute: toggleMute,
    onToggleFullscreen: toggleFullscreen,
    onBrightnessDelta: (delta) => setBrightness(brightness + delta),
  });

  return (
    <div
      ref={containerRef}
      className={cn(
        'group relative overflow-hidden bg-cinema-bg shadow-[0_8px_40px_rgba(229,194,118,0.10)]',
        landscapeActive
          ? 'aspect-auto [touch-action:none]'
          : 'aspect-video touch-pan-y rounded-2xl border border-cinema-border',
        landscapeClassName
      )}
      style={landscapeStyle}
      onMouseMove={bumpControls}
      onFocus={bumpControls}
    >
      <video
        ref={videoRef}
        src={useHlsJs ? undefined : src}
        poster={poster}
        className="h-full w-full object-contain"
        style={{ filter: playerVideoFilter(brightness) }}
        playsInline
        preload="auto"
        muted={muted}
        onLoadedMetadata={(e) => {
          metadataSrcRef.current = src;
          setDuration(e.currentTarget.duration);
          setMediaReady(true);
          setMetadataTick((tick) => tick + 1);
        }}
        onCanPlay={() => {
          setMediaReady(true);
          setBuffering(false);
        }}
        onCanPlayThrough={() => setBuffering(false)}
        onWaiting={() => setBuffering(true)}
        onSeeking={() => setBuffering(true)}
        onSeeked={(e) => {
          const v = e.currentTarget;
          setProgress(v.currentTime);
          // HAVE_CURRENT_DATA+ : frame available; otherwise waiting/canplay will clear.
          if (v.readyState >= 2) setBuffering(false);
        }}
        onPlaying={() => {
          setPlaying(true);
          setBuffering(false);
        }}
        onPause={() => setPlaying(false)}
        onProgress={(e) => {
          const v = e.currentTarget;
          if (!v.duration || v.buffered.length === 0) return;
          try {
            const end = v.buffered.end(v.buffered.length - 1);
            setBufferedPercent(Math.min(100, (end / v.duration) * 100));
          } catch {
            // TimeRanges can throw while regenerating after seek
          }
        }}
        onTimeUpdate={(e) => {
          const v = e.currentTarget;
          if (!v.seeking) setProgress(v.currentTime);
          if (v.buffered.length > 0 && v.duration > 0) {
            try {
              const end = v.buffered.end(v.buffered.length - 1);
              setBufferedPercent(Math.min(100, (end / v.duration) * 100));
            } catch {
              // ignore transient TimeRanges errors
            }
          }
          void saveProgress(v.currentTime, v.duration);
        }}
        onEnded={(e) => {
          setPlaying(false);
          setBuffering(false);
          void saveProgress(e.currentTarget.duration, e.currentTarget.duration);
        }}
        onError={() => {
          if (!useHlsJs) {
            setError('No se pudo reproducir el video.');
            setPlaying(false);
            setBuffering(false);
          }
        }}
        onClick={() => {
          if (didGesture()) return;
          togglePlay();
        }}
        aria-label={`Reproducir ${title}`}
      />
      {(!mediaReady || buffering) && !error && (
        <PlayerLoadingOverlay
          poster={poster}
          message={mediaReady && buffering ? 'Buscando…' : 'Cargando…'}
          opaque={!mediaReady}
        />
      )}
      {landscapeActive && hud && (
        <PlayerGestureHud kind={hud.kind} value={hud.value} visible={hudVisible} />
      )}
      {error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-cinema-bg/90 p-6 text-center">
          <AlertCircle className="mb-3 h-10 w-10 text-cinema-danger" aria-hidden />
          <p className="text-sm text-cinema-chalk">{error}</p>
          <button
            type="button"
            onClick={() => setReloadKey((value) => value + 1)}
            className="mt-4 rounded-full bg-cinema-accent px-5 py-2 text-sm font-medium text-cinema-bg"
          >
            Reintentar
          </button>
        </div>
      )}
      <PlayerChrome
        playing={playing}
        onTogglePlay={togglePlay}
        currentTime={progress}
        duration={duration}
        onSeek={seek}
        bufferedPercent={bufferedPercent}
        volume={volume}
        muted={muted}
        onVolumeChange={(value) => {
          setVolume(value);
          setMuted(value === 0);
        }}
        onToggleMute={() => {
          const video = videoRef.current;
          toggleMute();
          if (video) video.muted = !muted;
        }}
        brightness={brightness}
        onBrightnessChange={setBrightness}
        fullscreen={fullscreen || landscapeActive}
        onToggleFullscreen={toggleFullscreen}
        onTogglePip={() => void togglePip()}
        visible={showControls}
        title={title}
        onRewind={() => seek(Math.max(0, progress - 10))}
        trailingExtras={
          shouldShowQualitySelector(qualityOptions) ? (
            <QualityMenu
              options={qualityOptions}
              selected={selectedLevel}
              playingLevel={playingLevel}
              open={qualityMenuOpen}
              onOpenChange={setQualityMenuOpen}
              onSelect={(index) => {
                const hls = hlsRef.current;
                // -1 hands control back to ABR (still capped to the player size).
                if (hls) hls.currentLevel = index;
                setSelectedLevel(index);
                setQualityMenuOpen(false);
              }}
            />
          ) : undefined
        }
      />
      {!playing && !error && mediaReady && !buffering && (
        <button
          type="button"
          onClick={() => {
            if (didGesture()) return;
            togglePlay();
          }}
          className={cn(
            'absolute inset-0 z-20 flex items-center justify-center bg-cinema-bg/35 transition-opacity',
            'focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-cinema-accent/60'
          )}
          aria-label="Reproducir"
        >
          <div className="rounded-full bg-cinema-accent p-5 text-cinema-bg shadow-glow">
            <Play className="h-8 w-8" fill="currentColor" />
          </div>
        </button>
      )}
    </div>
  );
}
