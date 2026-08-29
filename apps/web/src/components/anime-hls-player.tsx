'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Hls from 'hls.js';
import {
  AlertCircle,
  Loader2,
  Maximize,
  Minimize,
  Pause,
  PictureInPicture2,
  Play,
  RotateCcw,
  SkipForward,
  Subtitles,
  Volume2,
  VolumeX,
} from 'lucide-react';
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
  /** Called when the stream fails hard, so the parent can suggest other servers. */
  onFatalError?: () => void;
}

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${m}:${String(s).padStart(2, '0')}`;
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
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [levels, setLevels] = useState<Array<{ index: number; label: string }>>([]);
  const [activeLevel, setActiveLevel] = useState(-1);
  const [activeSubtitle, setActiveSubtitle] = useState(-1);
  const [subtitleMenuOpen, setSubtitleMenuOpen] = useState(false);
  const [qualityMenuOpen, setQualityMenuOpen] = useState(false);

  const isHlsSource = useMemo(
    () => Boolean(source.isM3U8) || source.url.includes('.m3u8') || source.url.includes('m3u8'),
    [source.url, source.isM3U8]
  );

  // --- Stream loading -------------------------------------------------------
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
      onFatalError?.();
    };

    if (isHlsSource && Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        manifestLoadingMaxRetry: 4,
        levelLoadingMaxRetry: 4,
        fragLoadingMaxRetry: 6,
      });
      hlsRef.current = hls;
      hls.loadSource(source.url);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, (_event, data) => {
        setLoading(false);
        const parsedLevels = data.levels.map((level, index) => ({
          index,
          label: level.height ? `${level.height}p` : (level.bitrate ? `${Math.round(level.bitrate / 1000)}kbps` : `Nivel ${index + 1}`),
        }));
        setLevels(parsedLevels);
        video.play().catch(() => {});
      });

      hls.on(Hls.Events.LEVEL_SWITCHED, (_event, data) => {
        setActiveLevel(hls.autoLevelEnabled ? -1 : data.level);
      });

      hls.on(Hls.Events.ERROR, (_event, data) => {
        if (!data.fatal) return;
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
        hls.destroy();
        hlsRef.current = null;
      };
    }

    // Native playback (Safari HLS or plain mp4).
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
  }, [source.url, isHlsSource, onFatalError]);

  // --- Native HLS subtitle tracks -------------------------------------------
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const apply = () => {
      // Default: first track (usually Spanish or English) ON.
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

  // --- Video element events --------------------------------------------------
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

  // --- Fullscreen ------------------------------------------------------------
  useEffect(() => {
    const onFsChange = () => setFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
  }, []);

  const togglePlay = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) video.play().catch(() => {});
    else video.pause();
  }, []);

  const seek = useCallback((seconds: number) => {
    const video = videoRef.current;
    if (!video || !Number.isFinite(video.duration)) return;
    video.currentTime = Math.min(Math.max(0, seconds), video.duration - 0.5);
  }, []);

  const toggleFullscreen = useCallback(() => {
    if (document.fullscreenElement) void document.exitFullscreen();
    else containerRef.current?.requestFullscreen().catch(() => {});
  }, []);

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

  // --- Controls auto-hide ----------------------------------------------------
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

  const showSkipIntro =
    intro && currentTime >= intro.start && currentTime <= intro.end && intro.end - intro.start > 2;
  const showSkipOutro =
    outro && currentTime >= outro.start && currentTime <= outro.end && duration > 0;

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;
  const bufferedPercent = duration > 0 ? Math.min(100, (buffered / duration) * 100) : 0;

  return (
    <div
      ref={containerRef}
      className="group relative h-full w-full select-none overflow-hidden bg-black"
      onMouseMove={bumpControls}
      onClick={(e) => {
        if ((e.target as HTMLElement).tagName === 'VIDEO') togglePlay();
      }}
    >
      <video
        ref={videoRef}
        className="h-full w-full object-contain"
        playsInline
        preload="metadata"
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
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-center">
            <Loader2 className="w-10 h-10 text-cinema-silver animate-spin mx-auto mb-3" />
            {episodeLabel && <p className="text-cinema-muted text-sm">{episodeLabel}</p>}
          </div>
        </div>
      )}

      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/70 z-20">
          <div className="text-center max-w-md px-6">
            <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
            <p className="text-cinema-muted text-sm">{error}</p>
          </div>
        </div>
      )}

      {/* Skip intro / outro */}
      {(showSkipIntro || showSkipOutro) && (
        <button
          type="button"
          onClick={() => seek((showSkipIntro ? intro! : outro!).end + 0.5)}
          className="absolute bottom-24 right-4 z-30 inline-flex items-center gap-2 rounded-lg bg-white/90 px-4 py-2 text-sm font-semibold text-black hover:bg-white transition-colors"
        >
          {showSkipIntro ? (
            <>Saltar intro</>
          ) : (
            <>
              <SkipForward className="w-4 h-4" aria-hidden />
              Siguiente episodio
            </>
          )}
        </button>
      )}

      {/* Big center play button when paused */}
      {!playing && !loading && !error && (
        <button
          type="button"
          onClick={togglePlay}
          aria-label="Reproducir"
          className="absolute inset-0 z-20 flex items-center justify-center"
        >
          <span className="flex h-20 w-20 items-center justify-center rounded-full bg-white/15 backdrop-blur-sm transition-transform hover:scale-105">
            <Play className="w-9 h-9 text-white fill-current ml-1" aria-hidden />
          </span>
        </button>
      )}

      {/* Controls bar */}
      <div
        className={cn(
          'absolute inset-x-0 bottom-0 z-30 bg-gradient-to-t from-black/90 via-black/60 to-transparent px-4 pb-3 pt-10 transition-opacity duration-300',
          controlsVisible || !playing ? 'opacity-100' : 'opacity-0 pointer-events-none'
        )}
      >
        {/* Seek bar */}
        <div className="relative mb-2 h-4 cursor-pointer">
          <div className="absolute top-1/2 h-1 w-full -translate-y-1/2 rounded-full bg-white/20">
            <div
              className="absolute h-full rounded-full bg-white/30"
              style={{ width: `${bufferedPercent}%` }}
            />
            <div
              className="absolute h-full rounded-full bg-cinema-violet"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <div
            className="absolute top-1/2 h-3 w-3 -translate-y-1/2 -translate-x-1/2 rounded-full bg-white shadow transition-transform group-hover:scale-110"
            style={{ left: `${progressPercent}%` }}
          />
          <input
            type="range"
            min={0}
            max={duration || 0}
            step={0.1}
            value={currentTime}
            onChange={(e) => seek(Number(e.target.value))}
            className="absolute inset-0 w-full cursor-pointer opacity-0"
            aria-label="Buscar"
          />
        </div>

        <div className="flex items-center gap-2 text-white">
          <button
            type="button"
            onClick={togglePlay}
            className="p-1.5 hover:bg-white/10 rounded transition-colors"
            aria-label={playing ? 'Pausar' : 'Reproducir'}
          >
            {playing ? (
              <Pause className="w-5 h-5 fill-current" aria-hidden />
            ) : (
              <Play className="w-5 h-5 fill-current" aria-hidden />
            )}
          </button>

          <button
            type="button"
            onClick={() => seek(Math.max(0, currentTime - 10))}
            className="p-1.5 hover:bg-white/10 rounded transition-colors"
            aria-label="Retroceder 10 segundos"
          >
            <RotateCcw className="w-4 h-4" aria-hidden />
          </button>

          <div className="flex items-center gap-1.5 group/vol">
            <button
              type="button"
              onClick={() => {
                const video = videoRef.current;
                if (!video) return;
                video.muted = !video.muted;
                setMuted(video.muted);
              }}
              className="p-1.5 hover:bg-white/10 rounded transition-colors"
              aria-label={muted ? 'Activar sonido' : 'Silenciar'}
            >
              {muted || volume === 0 ? (
                <VolumeX className="w-5 h-5" aria-hidden />
              ) : (
                <Volume2 className="w-5 h-5" aria-hidden />
              )}
            </button>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={muted ? 0 : volume}
              onChange={(e) => {
                const v = Number(e.target.value);
                const video = videoRef.current;
                if (video) {
                  video.volume = v;
                  video.muted = v === 0;
                  setMuted(v === 0);
                  setVolume(v);
                }
              }}
              className="w-0 group-hover/vol:w-20 transition-all duration-200 accent-white h-1 cursor-pointer"
              aria-label="Volumen"
            />
          </div>

          <span className="text-xs tabular-nums text-white/85 ml-1">
            {formatTime(currentTime)} <span className="text-white/50">/ {formatTime(duration)}</span>
          </span>

          <div className="ml-auto flex items-center gap-1">
            {/* Subtitles menu */}
            {subtitles.length > 0 && (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => {
                    setSubtitleMenuOpen((o) => !o);
                    setQualityMenuOpen(false);
                  }}
                  className={cn(
                    'p-1.5 hover:bg-white/10 rounded transition-colors',
                    activeSubtitle >= 0 && 'text-cinema-violet-light'
                  )}
                  aria-label="Subtítulos"
                  aria-expanded={subtitleMenuOpen}
                >
                  <Subtitles className="w-5 h-5" aria-hidden />
                </button>
                {subtitleMenuOpen && (
                  <div className="absolute bottom-full right-0 mb-2 min-w-40 rounded-lg bg-black/95 border border-white/10 py-1 text-sm shadow-xl">
                    <button
                      type="button"
                      onClick={() => selectSubtitle(-1)}
                      className={cn(
                        'block w-full px-3 py-1.5 text-left hover:bg-white/10',
                        activeSubtitle === -1 && 'text-cinema-violet-light'
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
                          activeSubtitle === i && 'text-cinema-violet-light'
                        )}
                      >
                        {sub.lang ?? `Subtítulo ${i + 1}`}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Quality menu */}
            {levels.length > 1 && (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => {
                    setQualityMenuOpen((o) => !o);
                    setSubtitleMenuOpen(false);
                  }}
                  className="px-2 py-1.5 text-xs font-semibold hover:bg-white/10 rounded transition-colors"
                  aria-label="Calidad"
                  aria-expanded={qualityMenuOpen}
                >
                  {activeLevel >= 0 ? levels.find((l) => l.index === activeLevel)?.label ?? 'Auto' : 'Auto'}
                </button>
                {qualityMenuOpen && (
                  <div className="absolute bottom-full right-0 mb-2 min-w-32 rounded-lg bg-black/95 border border-white/10 py-1 text-sm shadow-xl">
                    <button
                      type="button"
                      onClick={() => selectLevel(-1)}
                      className={cn(
                        'block w-full px-3 py-1.5 text-left hover:bg-white/10',
                        activeLevel === -1 && 'text-cinema-violet-light'
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
                          activeLevel === level.index && 'text-cinema-violet-light'
                        )}
                      >
                        {level.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            <button
              type="button"
              onClick={() => void togglePip()}
              className="p-1.5 hover:bg-white/10 rounded transition-colors"
              aria-label="Picture in picture"
            >
              <PictureInPicture2 className="w-5 h-5" aria-hidden />
            </button>

            <button
              type="button"
              onClick={toggleFullscreen}
              className="p-1.5 hover:bg-white/10 rounded transition-colors"
              aria-label={fullscreen ? 'Salir de pantalla completa' : 'Pantalla completa'}
            >
              {fullscreen ? (
                <Minimize className="w-5 h-5" aria-hidden />
              ) : (
                <Maximize className="w-5 h-5" aria-hidden />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
