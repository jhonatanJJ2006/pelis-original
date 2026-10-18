'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Hls from 'hls.js';
import { AlertCircle, Play, RotateCcw } from 'lucide-react';
import {
  PlayerChrome,
  PlayerGestureHud,
  PlayerLoadingOverlay,
  isMobilePlayerViewport,
  playerVideoFilter,
  useMobileLandscapePlayer,
  usePlayerKeyboard,
  usePlayerSettings,
  usePlayerSurfaceGestures,
} from '@pelis/ui/features/video-player';
import { cn } from '@pelis/ui/utils';
import type { TvStreamKind } from '@pelis/db/tv-stream-kind';
import { buildTvProxyUrl } from '@/lib/tv-stream-proxy';
import {
  tvRecoveryDelayMs,
  TV_MAX_MEDIA_RECOVERIES,
  TV_MAX_NETWORK_RECOVERIES,
} from '@/lib/tv-recovery';

interface TVPlayerProps {
  channelId: string;
  channelName: string;
  /** How the channel must be played (from the public channel shape). Defaults to HLS. */
  streamKind?: TvStreamKind;
}

export default function TVPlayer({ channelId, channelName, streamKind = 'hls' }: TVPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hlsRef = useRef<Hls | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [playbackHelp, setPlaybackHelp] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [reconnecting, setReconnecting] = useState(false);
  /** Bumped by the Reintentar button: tears the player down and starts over. */
  const [attempt, setAttempt] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [controlsVisible, setControlsVisible] = useState(true);
  const { brightness, setBrightness, volume, setVolume, muted, setMuted, toggleMute } =
    usePlayerSettings();

  const streamUrl =
    typeof window !== 'undefined'
      ? buildTvProxyUrl(channelId, undefined, window.location.origin)
      : buildTvProxyUrl(channelId);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.volume = volume;
    video.muted = muted;
  }, [volume, muted]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    setError(null);
    setPlaybackHelp(null);
    setLoading(true);
    setReconnecting(false);

    if (streamKind === 'mpegts') {
      setError(
        'Este canal transmite en un formato (MPEG-TS directo) que el reproductor web no soporta. Prueba otro canal.'
      );
      setLoading(false);
      return;
    }

    // The proxy URL has no extension; the channel shape says what it serves.
    const isHls = streamKind === 'hls';

    const onFatalError = (message: string) => {
      setError(message);
      setLoading(false);
      setReconnecting(false);
    };

    const PLAY_BLOCKED =
      'El navegador bloqueó la reproducción automática. Pulsa reproducir para ver el canal.';
    const NO_FRAME = 'El canal no muestra imagen. Pulsa reproducir para reintentar.';

    const beginPlayback = () => {
      const pending = video.play();
      if (pending && typeof pending.catch === 'function') {
        pending.catch(() => {
          setPlaybackHelp(PLAY_BLOCKED);
          setLoading(false);
        });
      }
    };

    // Normal live playlists are not LL-HLS. lowLatencyMode waits for parts
    // that never arrive and the <video> stays black with no frame.
    let stallTimer: ReturnType<typeof setTimeout> | null = null;
    const clearStall = () => {
      if (stallTimer) {
        clearTimeout(stallTimer);
        stallTimer = null;
      }
    };
    const hasFrame = () => video.readyState >= 2 || video.videoWidth > 0;
    const clearHelpIfPlaying = () => {
      if (!video.paused && hasFrame()) {
        clearStall();
        setPlaybackHelp(null);
      }
    };
    const armNoFrameWatch = () => {
      clearStall();
      stallTimer = setTimeout(() => {
        // play() can hang or leave the element paused with readyState < 2.
        // Keep an autoplay message if one is already showing.
        if (!hasFrame()) {
          setPlaybackHelp((current) => current ?? NO_FRAME);
          setLoading(false);
        }
      }, 6000);
    };
    video.addEventListener('playing', clearHelpIfPlaying);
    video.addEventListener('loadeddata', clearHelpIfPlaying);
    video.addEventListener('resize', clearHelpIfPlaying);

    const startOrExplain = () => {
      setLoading(false);
      beginPlayback();
      armNoFrameWatch();
    };

    if (isHls && Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: false,
        manifestLoadingMaxRetry: 6,
        levelLoadingMaxRetry: 6,
        fragLoadingMaxRetry: 6,
        liveSyncDurationCount: 3,
      });
      hlsRef.current = hls;
      hls.loadSource(streamUrl);
      hls.attachMedia(video);

      let manifestParsed = false;
      let networkRecoveries = 0;
      let mediaRecoveries = 0;
      let recoveryTimer: ReturnType<typeof setTimeout> | null = null;
      const clearRecovery = () => {
        if (recoveryTimer) {
          clearTimeout(recoveryTimer);
          recoveryTimer = null;
        }
      };

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        manifestParsed = true;
        startOrExplain();
      });

      // A fragment made it into the buffer: the connection is healthy again.
      hls.on(Hls.Events.FRAG_BUFFERED, () => {
        networkRecoveries = 0;
        mediaRecoveries = 0;
        setReconnecting(false);
      });

      const unavailableMessage = (code: number | undefined) => {
        if (code === 401) return 'Tu sesión expiró. Inicia sesión de nuevo para ver TV.';
        if (code === 403) return 'Necesitas un plan activo para ver este canal.';
        if (code === 404) return 'Este canal no está disponible ahora. Prueba otro de la lista.';
        if (code === 502 || code === 504) {
          return 'Este canal no está disponible en este momento. El proveedor del stream no responde. Prueba otro canal o vuelve más tarde.';
        }
        return 'Se perdió la conexión con el canal.';
      };

      hls.on(Hls.Events.ERROR, (_, data) => {
        if (!data.fatal) return;
        const code = data.response?.code;

        if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
          // Access/missing channel will not fix itself with a retry.
          if (code === 401 || code === 403 || code === 404) {
            onFatalError(unavailableMessage(code));
            return;
          }
          if (networkRecoveries >= TV_MAX_NETWORK_RECOVERIES) {
            onFatalError(unavailableMessage(code));
            return;
          }
          const delay = tvRecoveryDelayMs(networkRecoveries);
          networkRecoveries += 1;
          setReconnecting(true);
          clearRecovery();
          recoveryTimer = setTimeout(() => {
            recoveryTimer = null;
            // Before the first manifest there is nothing to resume: load it again.
            if (!manifestParsed) hls.loadSource(streamUrl);
            else hls.startLoad();
          }, delay);
          return;
        }

        if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
          if (mediaRecoveries >= TV_MAX_MEDIA_RECOVERIES) {
            onFatalError('El canal envió video que no se puede reproducir. Prueba otro canal.');
            return;
          }
          mediaRecoveries += 1;
          setReconnecting(true);
          // Second attempt: some live channels flip the audio codec mid-stream.
          if (mediaRecoveries === 2) hls.swapAudioCodec();
          hls.recoverMediaError();
          return;
        }

        onFatalError('Error al cargar el stream. Intenta con otro canal.');
      });

      return () => {
        clearRecovery();
        clearStall();
        video.removeEventListener('playing', clearHelpIfPlaying);
        video.removeEventListener('loadeddata', clearHelpIfPlaying);
        video.removeEventListener('resize', clearHelpIfPlaying);
        hls.destroy();
        hlsRef.current = null;
      };
    }

    if (isHls) {
      const canPlay = video.canPlayType('application/vnd.apple.mpegurl');
      if (canPlay) {
        video.src = streamUrl;
        const onLoaded = () => {
          startOrExplain();
        };
        const onNativeError = () => {
          onFatalError('Error al reproducir el stream.');
        };
        video.addEventListener('loadedmetadata', onLoaded);
        video.addEventListener('error', onNativeError);
        return () => {
          clearStall();
          video.removeEventListener('playing', clearHelpIfPlaying);
          video.removeEventListener('loadeddata', clearHelpIfPlaying);
          video.removeEventListener('resize', clearHelpIfPlaying);
          video.removeEventListener('loadedmetadata', onLoaded);
          video.removeEventListener('error', onNativeError);
          video.src = '';
          video.load();
        };
      }
      onFatalError('Tu navegador no soporta este tipo de stream.');
      return () => {
        clearStall();
        video.removeEventListener('playing', clearHelpIfPlaying);
        video.removeEventListener('loadeddata', clearHelpIfPlaying);
        video.removeEventListener('resize', clearHelpIfPlaying);
      };
    }

    video.src = streamUrl;
    const onLoaded = () => {
      startOrExplain();
    };
    const onNativeError = () => {
      onFatalError('Error al reproducir el stream.');
    };
    video.addEventListener('loadedmetadata', onLoaded);
    video.addEventListener('error', onNativeError);

    return () => {
      clearStall();
      video.removeEventListener('playing', clearHelpIfPlaying);
      video.removeEventListener('loadeddata', clearHelpIfPlaying);
      video.removeEventListener('resize', clearHelpIfPlaying);
      video.removeEventListener('loadedmetadata', onLoaded);
      video.removeEventListener('error', onNativeError);
      video.src = '';
      video.load();
    };
  }, [streamUrl, streamKind, attempt]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    video.addEventListener('play', onPlay);
    video.addEventListener('pause', onPause);
    return () => {
      video.removeEventListener('play', onPlay);
      video.removeEventListener('pause', onPause);
    };
  }, []);

  useEffect(() => {
    const onFs = () => setFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', onFs);
    return () => document.removeEventListener('fullscreenchange', onFs);
  }, []);

  const {
    landscapeActive,
    enter: enterLandscape,
    exit: exitLandscape,
    surfaceClassName: landscapeClassName,
    surfaceStyle: landscapeStyle,
  } = useMobileLandscapePlayer({
    containerRef,
    videoRef,
    enterOnMount: true,
  });

  const restartPlayer = useCallback(() => {
    setError(null);
    setAttempt((value) => value + 1);
  }, []);

  const retryPlayback = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    setPlaybackHelp(null);
    // Keep the current stream URL. startLoad resumes the attached source.
    hlsRef.current?.startLoad();
    video.play().catch(() => {
      setPlaybackHelp(
        'El navegador bloqueó la reproducción automática. Pulsa reproducir para ver el canal.'
      );
    });
  }, []);

  const togglePlay = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      retryPlayback();
      void enterLandscape();
    } else video.pause();
  }, [enterLandscape, retryPlayback]);

  const toggleFullscreen = useCallback(() => {
    if (isMobilePlayerViewport()) {
      if (landscapeActive) void exitLandscape();
      else void enterLandscape();
      return;
    }
    if (document.fullscreenElement) void document.exitFullscreen();
    else containerRef.current?.requestFullscreen().catch(() => {});
  }, [enterLandscape, exitLandscape, landscapeActive]);

  const bumpControls = useCallback(() => {
    setControlsVisible(true);
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    hideTimerRef.current = setTimeout(() => {
      if (!videoRef.current?.paused) setControlsVisible(false);
    }, 3200);
  }, []);

  useEffect(() => {
    bumpControls();
    return () => {
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    };
  }, [bumpControls]);

  const { hud, hudVisible, didGesture } = usePlayerSurfaceGestures({
    containerRef,
    brightness,
    setBrightness,
    volume,
    setVolume,
    enabled: landscapeActive,
  });

  usePlayerKeyboard({
    enabled: !error,
    onTogglePlay: togglePlay,
    onVolumeDelta: (delta) => setVolume(volume + delta),
    onToggleMute: toggleMute,
    onToggleFullscreen: toggleFullscreen,
    onBrightnessDelta: (delta) => setBrightness(brightness + delta),
  });

  return (
    <div
      ref={containerRef}
      className={cn(
        'relative h-full w-full bg-cinema-bg',
        landscapeActive ? '[touch-action:none]' : 'touch-pan-y',
        landscapeClassName
      )}
      style={landscapeStyle}
      onMouseMove={bumpControls}
    >
      {(loading || reconnecting) && !error && !playbackHelp && (
        <PlayerLoadingOverlay
          message={
            reconnecting ? `Reconectando con ${channelName}…` : `Conectando con ${channelName}…`
          }
        />
      )}
      {landscapeActive && hud && (
        <PlayerGestureHud kind={hud.kind} value={hud.value} visible={hudVisible} />
      )}

      {error && (
        <div className="absolute inset-0 z-10 flex items-center justify-center">
          <div className="max-w-md px-6 text-center">
            <AlertCircle className="mx-auto mb-4 h-12 w-12 text-cinema-danger" />
            <p className="text-sm text-cinema-muted">{error}</p>
            {streamKind !== 'mpegts' && (
              <button
                type="button"
                onClick={restartPlayer}
                className="mt-4 inline-flex items-center gap-2 rounded-full bg-white px-5 py-2 text-sm font-medium text-black"
              >
                <RotateCcw className="h-4 w-4" aria-hidden />
                Reintentar
              </button>
            )}
          </div>
        </div>
      )}

      {playbackHelp && !error && (
        <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/75">
          <div className="max-w-md px-6 text-center">
            <p className="text-sm text-cinema-chalk">{playbackHelp}</p>
            <button
              type="button"
              onClick={retryPlayback}
              className="mt-4 inline-flex items-center gap-2 rounded-full bg-white px-5 py-2 text-sm font-medium text-black"
            >
              <Play className="h-4 w-4" aria-hidden />
              Reproducir
            </button>
          </div>
        </div>
      )}

      <video
        ref={videoRef}
        className="h-full w-full object-contain"
        style={{ filter: playerVideoFilter(brightness) }}
        playsInline
        muted={muted}
        autoPlay
        onClick={() => {
          if (didGesture()) return;
          togglePlay();
        }}
        aria-label={channelName}
      />

      <PlayerChrome
        playing={playing}
        onTogglePlay={togglePlay}
        volume={volume}
        muted={muted}
        onVolumeChange={(value) => {
          setVolume(value);
          setMuted(value === 0);
        }}
        onToggleMute={toggleMute}
        brightness={brightness}
        onBrightnessChange={setBrightness}
        fullscreen={fullscreen || landscapeActive}
        onToggleFullscreen={toggleFullscreen}
        visible={controlsVisible}
        title={channelName}
        hideSeek
        live
      />
    </div>
  );
}
