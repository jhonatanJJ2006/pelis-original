'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Hls from 'hls.js';
import { AlertCircle, Play } from 'lucide-react';
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
import { buildTvProxyUrl } from '@/lib/tv-stream-proxy';

interface TVPlayerProps {
  channelId: string;
  channelName: string;
}

export default function TVPlayer({ channelId, channelName }: TVPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hlsRef = useRef<Hls | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [playbackHelp, setPlaybackHelp] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
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

    const isHls = streamUrl.includes('.m3u8') || streamUrl.includes('/api/tv/stream/');

    const onFatalError = (message: string) => {
      setError(message);
      setLoading(false);
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

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        startOrExplain();
      });

      hls.on(Hls.Events.ERROR, (_, data) => {
        if (!data.fatal) return;

        if (data.response?.code === 504 || data.response?.code === 502) {
          onFatalError(
            'Este canal no está disponible en este momento. El proveedor del stream no responde. Prueba otro canal o vuelve más tarde.'
          );
          return;
        }

        onFatalError('Error al cargar el stream. Intenta con otro canal.');
      });

      return () => {
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
  }, [streamUrl]);

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
      {loading && !error && !playbackHelp && (
        <PlayerLoadingOverlay message={`Conectando con ${channelName}…`} />
      )}
      {landscapeActive && hud && (
        <PlayerGestureHud kind={hud.kind} value={hud.value} visible={hudVisible} />
      )}

      {error && (
        <div className="absolute inset-0 z-10 flex items-center justify-center">
          <div className="max-w-md px-6 text-center">
            <AlertCircle className="mx-auto mb-4 h-12 w-12 text-cinema-danger" />
            <p className="text-sm text-cinema-muted">{error}</p>
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
