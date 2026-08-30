'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Hls from 'hls.js';
import { AlertCircle, SkipForward, Subtitles } from 'lucide-react';
import {
  PlayerChrome,
  PlayerGestureHud,
  PlayerLoadingOverlay,
  attachHlsForwardPrefetch,
  attachNativeHlsPrefetch,
  createVodHlsConfig,
  isMobilePlayerViewport,
  playerVideoFilter,
  useMobileLandscapePlayer,
  usePlayerKeyboard,
  usePlayerSettings,
  usePlayerSurfaceGestures,
} from '@pelis/ui/features/video-player';
import { cn } from '@pelis/ui/utils';

export interface PlayerSource {
  url: string;
  quality?: string;
  isM3U8?: boolean;
}

export interface PlayerSubtitle {
  url: string;
  lang?: string;
}

interface AnimeHlsPlayerProps {
  source: PlayerSource;
  subtitles?: PlayerSubtitle[];
  intro?: { start: number; end: number } | null;
  outro?: { start: number; end: number } | null;
  episodeLabel?: string;
  title?: string;
  /** Called when the stream fails hard, so the parent can suggest other servers. */
  onFatalError?: () => void;
}

const SUBTITLE_LANG_CODES: Array<[RegExp, string]> = [
  [/engl/i, 'en'],
  [/espa|castellano|spanish/i, 'es'],
  [/portu/i, 'pt'],
  [/japo?n|japan|日本語/i, 'ja'],
];

function subtitleLangCode(label: string | undefined, index: number): string {
  if (label) {
    for (const [pattern, code] of SUBTITLE_LANG_CODES) {
      if (pattern.test(label)) return code;
    }
  }
  return index === 0 ? 'es' : 'en';
}

export function AnimeHlsPlayer({
  source,
  subtitles = [],
  intro,
  outro,
  episodeLabel,
  title,
  onFatalError,
}: AnimeHlsPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [buffered, setBuffered] = useState(0);
  const [fullscreen, setFullscreen] = useState(false);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [levels, setLevels] = useState<Array<{ index: number; label: string }>>([]);
  const [activeLevel, setActiveLevel] = useState(-1);
  const [activeSubtitle, setActiveSubtitle] = useState(-1);
  const [subtitleMenuOpen, setSubtitleMenuOpen] = useState(false);
  const [qualityMenuOpen, setQualityMenuOpen] = useState(false);
  const { brightness, setBrightness, volume, setVolume, muted, setMuted, toggleMute } =
    usePlayerSettings();
  const onFatalErrorRef = useRef(onFatalError);
  onFatalErrorRef.current = onFatalError;

  const isHlsSource = useMemo(
    () => Boolean(source.isM3U8) || source.url.includes('.m3u8') || source.url.includes('m3u8'),
    [source.url, source.isM3U8]
  );

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.volume = volume;
    video.muted = muted;
  }, [volume, muted]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    setLoading(true);
    setError(null);
    setPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    setBuffered(0);
    setLevels([]);
    setActiveLevel(-1);

    const onFatal = (message: string) => {
      setError(message);
      setLoading(false);
      onFatalErrorRef.current?.();
    };

    if (isHlsSource && Hls.isSupported()) {
      const hls = new Hls(createVodHlsConfig());
      const stopPrefetch = attachHlsForwardPrefetch(hls, video);
      hlsRef.current = hls;
      hls.loadSource(source.url);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, (_event, data) => {
        setLoading(false);
        const parsedLevels = data.levels.map((level, index) => ({
          index,
          label: level.height
            ? `${level.height}p`
            : level.bitrate
              ? `${Math.round(level.bitrate / 1000)}kbps`
              : `Nivel ${index + 1}`,
        }));
        setLevels(parsedLevels);
        video.play().catch(() => {});
      });

      hls.on(Hls.Events.LEVEL_SWITCHED, (_event, data) => {
        setActiveLevel(hls.autoLevelEnabled ? -1 : data.level);
      });

      hls.on(Hls.Events.ERROR, (_event, data) => {
        if (!data.fatal) {
          if (data.details === Hls.ErrorDetails.BUFFER_STALLED_ERROR) {
            hls.startLoad();
          }
          return;
        }
        switch (data.type) {
          case Hls.ErrorTypes.NETWORK_ERROR:
            if (data.details === Hls.ErrorDetails.MANIFEST_LOAD_ERROR) {
              onFatal('No se pudo cargar el video. El servidor puede estar bloqueado o caído.');
            } else {
              hls.startLoad();
            }
            break;
          case Hls.ErrorTypes.MEDIA_ERROR:
            hls.recoverMediaError();
            break;
          default:
            onFatal('Error al reproducir. Prueba con otro servidor.');
        }
      });

      return () => {
        stopPrefetch();
        hls.destroy();
        hlsRef.current = null;
      };
    }

    if (isHlsSource) {
      video.preload = 'auto';
      video.src = source.url;
      const stopNativePrefetch = attachNativeHlsPrefetch(video, source.url);
      const onLoaded = () => {
        setLoading(false);
        video.play().catch(() => {});
      };
      video.addEventListener('loadedmetadata', onLoaded);
      const onError = () => onFatal('Error al reproducir el video.');
      video.addEventListener('error', onError);
      return () => {
        stopNativePrefetch();
        video.removeEventListener('loadedmetadata', onLoaded);
        video.removeEventListener('error', onError);
        video.removeAttribute('src');
        video.load();
      };
    }

    video.src = source.url;
    const onLoaded = () => {
      setLoading(false);
      video.play().catch(() => {});
    };
    video.addEventListener('loadedmetadata', onLoaded);
    const onError = () => onFatal('Error al reproducir el video.');
    video.addEventListener('error', onError);
    return () => {
      video.removeEventListener('loadedmetadata', onLoaded);
      video.removeEventListener('error', onError);
      video.removeAttribute('src');
      video.load();
    };
  }, [source.url, isHlsSource]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const apply = () => {
      if (video.textTracks.length > 0) {
        for (let i = 0; i < video.textTracks.length; i++) {
          video.textTracks[i]!.mode = i === 0 ? 'showing' : 'disabled';
        }
        setActiveSubtitle(video.textTracks.length > 0 ? 0 : -1);
      }
    };
    video.addEventListener('loadedmetadata', apply);
    return () => video.removeEventListener('loadedmetadata', apply);
  }, [subtitles]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const onTime = () => {
      setCurrentTime(video.currentTime);
      if (video.buffered.length > 0) {
        setBuffered(video.buffered.end(video.buffered.length - 1));
      }
    };
    const onDuration = () => setDuration(video.duration);
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    const onWaiting = () => setLoading(true);
    const onPlaying = () => setLoading(false);
    video.addEventListener('timeupdate', onTime);
    video.addEventListener('durationchange', onDuration);
    video.addEventListener('play', onPlay);
    video.addEventListener('pause', onPause);
    video.addEventListener('waiting', onWaiting);
    video.addEventListener('playing', onPlaying);
    return () => {
      video.removeEventListener('timeupdate', onTime);
      video.removeEventListener('durationchange', onDuration);
      video.removeEventListener('play', onPlay);
      video.removeEventListener('pause', onPause);
      video.removeEventListener('waiting', onWaiting);
      video.removeEventListener('playing', onPlaying);
    };
  }, []);

  useEffect(() => {
    const onFsChange = () => setFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
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

  const seek = useCallback((seconds: number) => {
    const video = videoRef.current;
    if (!video || !Number.isFinite(video.duration)) return;
    video.currentTime = Math.min(Math.max(0, seconds), video.duration - 0.5);
  }, []);

  const toggleFullscreen = useCallback(() => {
    if (isMobilePlayerViewport()) {
      if (landscapeActive) void exitLandscape();
      else void enterLandscape();
      return;
    }
    if (document.fullscreenElement) void document.exitFullscreen();
    else containerRef.current?.requestFullscreen().catch(() => {});
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

  const selectLevel = useCallback((index: number) => {
    const hls = hlsRef.current;
    if (!hls) return;
    hls.currentLevel = index;
    setActiveLevel(index);
    setQualityMenuOpen(false);
  }, []);

  const selectSubtitle = useCallback((index: number) => {
    const video = videoRef.current;
    if (!video) return;
    for (let i = 0; i < video.textTracks.length; i++) {
      video.textTracks[i]!.mode = i === index ? 'showing' : 'disabled';
    }
    setActiveSubtitle(index);
    setSubtitleMenuOpen(false);
  }, []);

  const bumpControls = useCallback(() => {
    setControlsVisible(true);
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    hideTimerRef.current = setTimeout(() => {
      if (!videoRef.current?.paused) setControlsVisible(false);
      setSubtitleMenuOpen(false);
      setQualityMenuOpen(false);
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
    onSeekDelta: (delta) => seek(currentTime + delta),
    onVolumeDelta: (delta) => setVolume(volume + delta),
    onToggleMute: toggleMute,
    onToggleFullscreen: toggleFullscreen,
    onBrightnessDelta: (delta) => setBrightness(brightness + delta),
  });

  const showSkipIntro =
    intro && currentTime >= intro.start && currentTime <= intro.end && intro.end - intro.start > 2;
  const showSkipOutro = outro && currentTime >= outro.start && currentTime <= outro.end && duration > 0;
  const bufferedPercent = duration > 0 ? Math.min(100, (buffered / duration) * 100) : 0;

  return (
    <div
      ref={containerRef}
      className={cn(
        'group relative h-full w-full select-none overflow-hidden bg-cinema-bg [touch-action:none]',
        landscapeClassName,
      )}
      style={landscapeStyle}
      onMouseMove={bumpControls}
      onClick={(e) => {
        if (didGesture()) return;
        if ((e.target as HTMLElement).tagName === 'VIDEO') togglePlay();
      }}
    >
      <video
        ref={videoRef}
        className="h-full w-full object-contain"
        style={{ filter: playerVideoFilter(brightness) }}
        playsInline
        preload="auto"
      >
        {subtitles.map((sub, i) => (
          <track
            key={sub.url}
            kind="subtitles"
            src={sub.url}
            label={sub.lang ?? `Subtítulo ${i + 1}`}
            srcLang={subtitleLangCode(sub.lang, i)}
            default={i === 0}
          />
        ))}
      </video>

      {loading && !error && (
        <PlayerLoadingOverlay
          message={duration > 0 ? 'Cargando…' : 'Buscando fuentes…'}
          opaque={duration === 0}
        />
      )}
      {landscapeActive && hud && <PlayerGestureHud kind={hud.kind} value={hud.value} visible={hudVisible} />}

      {error && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-cinema-bg/80">
          <div className="max-w-md px-6 text-center">
            <AlertCircle className="mx-auto mb-4 h-12 w-12 text-cinema-danger" />
            <p className="text-sm text-cinema-muted">{error}</p>
          </div>
        </div>
      )}

      {(showSkipIntro || showSkipOutro) && (
        <button
          type="button"
          data-player-no-gesture
          onClick={() => seek((showSkipIntro ? intro! : outro!).end + 0.5)}
          className="absolute bottom-24 right-4 z-30 inline-flex items-center gap-2 rounded-[10px] bg-cinema-accent px-4 py-2 text-sm font-semibold text-cinema-bg hover:bg-cinema-accent-light"
        >
          {showSkipIntro ? (
            <>Saltar intro</>
          ) : (
            <>
              <SkipForward className="h-4 w-4" aria-hidden />
              Siguiente episodio
            </>
          )}
        </button>
      )}

      {!playing && !loading && !error && (
        <button
          type="button"
          onClick={() => {
            if (didGesture()) return;
            togglePlay();
          }}
          aria-label="Reproducir"
          className="absolute inset-0 z-20 flex items-center justify-center"
        >
          <span className="flex h-20 w-20 items-center justify-center rounded-full bg-cinema-accent text-cinema-bg shadow-glow transition-transform hover:scale-105">
            <svg viewBox="0 0 24 24" className="ml-1 h-9 w-9 fill-current" aria-hidden>
              <path d="M8 5v14l11-7z" />
            </svg>
          </span>
        </button>
      )}

      <PlayerChrome
        playing={playing}
        onTogglePlay={togglePlay}
        currentTime={currentTime}
        duration={duration}
        onSeek={seek}
        bufferedPercent={bufferedPercent}
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
        onTogglePip={() => void togglePip()}
        visible={controlsVisible}
        title={title}
        subtitle={episodeLabel}
        onRewind={() => seek(Math.max(0, currentTime - 10))}
        trailingExtras={
          <>
            {subtitles.length > 0 && (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => {
                    setSubtitleMenuOpen((o) => !o);
                    setQualityMenuOpen(false);
                  }}
                  className={cn(
                    'rounded-full p-2.5 hover:bg-white/10 md:p-2',
                    activeSubtitle >= 0 && 'text-cinema-accent'
                  )}
                  aria-label="Subtítulos"
                  aria-expanded={subtitleMenuOpen}
                >
                  <Subtitles className="h-5 w-5" aria-hidden />
                </button>
                {subtitleMenuOpen && (
                  <div className="absolute bottom-full right-0 mb-2 min-w-40 rounded-[10px] border border-cinema-border bg-cinema-bg/95 py-1 text-sm shadow-xl">
                    <button
                      type="button"
                      onClick={() => selectSubtitle(-1)}
                      className={cn(
                        'block w-full px-3 py-1.5 text-left hover:bg-white/10',
                        activeSubtitle === -1 && 'text-cinema-accent'
                      )}
                    >
                      Desactivados
                    </button>
                    {subtitles.map((sub, i) => (
                      <button
                        key={sub.url}
                        type="button"
                        onClick={() => selectSubtitle(i)}
                        className={cn(
                          'block w-full px-3 py-1.5 text-left hover:bg-white/10',
                          activeSubtitle === i && 'text-cinema-accent'
                        )}
                      >
                        {sub.lang ?? `Subtítulo ${i + 1}`}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
            {levels.length > 1 && (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => {
                    setQualityMenuOpen((o) => !o);
                    setSubtitleMenuOpen(false);
                  }}
                  className="rounded-[10px] px-2 py-1.5 text-xs font-semibold hover:bg-white/10"
                  aria-label="Calidad"
                  aria-expanded={qualityMenuOpen}
                >
                  {activeLevel >= 0
                    ? (levels.find((l) => l.index === activeLevel)?.label ?? 'Auto')
                    : 'Auto'}
                </button>
                {qualityMenuOpen && (
                  <div className="absolute bottom-full right-0 mb-2 min-w-32 rounded-[10px] border border-cinema-border bg-cinema-bg/95 py-1 text-sm shadow-xl">
                    <button
                      type="button"
                      onClick={() => selectLevel(-1)}
                      className={cn(
                        'block w-full px-3 py-1.5 text-left hover:bg-white/10',
                        activeLevel === -1 && 'text-cinema-accent'
                      )}
                    >
                      Auto
                    </button>
                    {levels.map((level) => (
                      <button
                        key={level.index}
                        type="button"
                        onClick={() => selectLevel(level.index)}
                        className={cn(
                          'block w-full px-3 py-1.5 text-left hover:bg-white/10',
                          activeLevel === level.index && 'text-cinema-accent'
                        )}
                      >
                        {level.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        }
      />
    </div>
  );
}
