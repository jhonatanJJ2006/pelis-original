'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Hls from 'hls.js';
import { AlertCircle } from 'lucide-react';
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
  const [error, setError] = useState<string | null>(null);
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
    setLoading(true);

    const isHls = streamUrl.includes('.m3u8') || streamUrl.includes('/api/tv/stream/');

    const onFatalError = (message: string) => {
      setError(message);
      setLoading(false);
    };

    if (isHls && Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
        manifestLoadingMaxRetry: 6,
        levelLoadingMaxRetry: 6,
        fragLoadingMaxRetry: 6,
        liveSyncDurationCount: 3,
      });
      hls.loadSource(streamUrl);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        setLoading(false);
        video.play().catch(() => {});
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
        hls.destroy();
      };
    }

    if (isHls) {
      const canPlay = video.canPlayType('application/vnd.apple.mpegurl');
      if (canPlay) {
        video.src = streamUrl;
        const onLoaded = () => {
          setLoading(false);
          video.play().catch(() => {});
        };
        video.addEventListener('loadedmetadata', onLoaded);
        video.addEventListener('error', () => {
          onFatalError('Error al reproducir el stream.');
        });
        return () => {
          video.removeEventListener('loadedmetadata', onLoaded);
          video.src = '';
          video.load();
        };
      }
      onFatalError('Tu navegador no soporta este tipo de stream.');
      return;
    }

    video.src = streamUrl;
    const onLoaded = () => {
      setLoading(false);
      video.play().catch(() => {});
    };
    video.addEventListener('loadedmetadata', onLoaded);
    video.addEventListener('error', () => {
      onFatalError('Error al reproducir el stream.');
    });

    return () => {
      video.removeEventListener('loadedmetadata', onLoaded);
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

  const togglePlay = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      video.play().catch(() => {});
      void enterLandscape();
    } else video.pause();
  }, [enterLandscape]);

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
        'relative h-full w-full bg-cinema-bg [touch-action:none]',
        landscapeClassName,
      )}
      style={landscapeStyle}
      onMouseMove={bumpControls}
    >
      {loading && !error && (
        <PlayerLoadingOverlay message={`Conectando con ${channelName}…`} />
      )}
      {landscapeActive && hud && <PlayerGestureHud kind={hud.kind} value={hud.value} visible={hudVisible} />}

      {error && (
        <div className="absolute inset-0 z-10 flex items-center justify-center">
          <div className="max-w-md px-6 text-center">
            <AlertCircle className="mx-auto mb-4 h-12 w-12 text-cinema-danger" />
            <p className="text-sm text-cinema-muted">{error}</p>
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
