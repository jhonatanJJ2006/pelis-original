'use client';

import { useEffect, useRef, useState } from 'react';
import { useMutation } from 'convex/react';
import Hls from 'hls.js';
import { Maximize, Pause, Play, Volume2, VolumeX } from 'lucide-react';
import { api } from '@pelis/convex';
import { cn } from '../../shared/utils';

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
  const upsertHistory = useMutation(api.history.upsert);
  const [playing, setPlaying] = useState(autoPlay);
  const [muted, setMuted] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [showControls, setShowControls] = useState(false);
  const lastSaved = useRef(0);

  const src = videoUrl || DEMO_VIDEO;
  const isHls = src.includes('.m3u8');

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !isHls) return;
    let hls: Hls | null = null;
    if (Hls.isSupported()) {
      hls = new Hls();
      hls.loadSource(src);
      hls.attachMedia(video);
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = src;
    }
    return () => {
      if (hls) hls.destroy();
    };
  }, [src, isHls]);

  const saveProgress = async (current: number, total: number) => {
    if (!userId || total <= 0) return;
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
    if (!video || !autoPlay) return;
    video.play().catch(() => setPlaying(false));
  }, [autoPlay]);

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      video.play();
      setPlaying(true);
    } else {
      video.pause();
      setPlaying(false);
    }
  };

  const toggleFullscreen = () => {
    const video = videoRef.current;
    if (!video) return;
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      video.requestFullscreen();
    }
  };

  return (
    <div
      className="relative aspect-video rounded-2xl overflow-hidden bg-cinema-bg border border-cinema-border group shadow-[0_8px_40px_rgba(139,92,246,0.12)]"
      onMouseEnter={() => setShowControls(true)}
      onMouseLeave={() => setShowControls(false)}
      onFocus={() => setShowControls(true)}
    >
      <video
        ref={videoRef}
        src={src}
        poster={poster}
        className="w-full h-full object-contain"
        playsInline
        muted={muted}
        onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
        onTimeUpdate={(e) => {
          const v = e.currentTarget;
          setProgress(v.currentTime);
          void saveProgress(v.currentTime, v.duration);
        }}
        onEnded={(e) => {
          setPlaying(false);
          void saveProgress(e.currentTarget.duration, e.currentTarget.duration);
        }}
        onClick={togglePlay}
        aria-label={`Reproducir ${title}`}
      />
      <div
        className={cn(
          'absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-cinema-bg/95 to-transparent transition-opacity duration-200',
          showControls || !playing ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
        )}
      >
        <div
          className="h-2 md:h-1.5 bg-cinema-elevated rounded-full mb-3 cursor-pointer"
          role="slider"
          aria-label="Progreso de reproducción"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={duration ? Math.round((progress / duration) * 100) : 0}
          tabIndex={0}
          onClick={(e) => {
            e.stopPropagation();
            const video = videoRef.current;
            if (!video || !duration) return;
            const rect = e.currentTarget.getBoundingClientRect();
            const ratio = (e.clientX - rect.left) / rect.width;
            video.currentTime = ratio * duration;
          }}
          onKeyDown={(e) => {
            const video = videoRef.current;
            if (!video || !duration) return;
            if (e.key === 'ArrowRight')
              video.currentTime = Math.min(video.currentTime + 10, duration);
            if (e.key === 'ArrowLeft') video.currentTime = Math.max(video.currentTime - 10, 0);
          }}
        >
          <div
            className="h-full bg-gradient-to-r from-cinema-accent to-cinema-violet rounded-full"
            style={{ width: `${duration ? (progress / duration) * 100 : 0}%` }}
          />
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                togglePlay();
              }}
              className="p-3 md:p-2 rounded-full bg-cinema-elevated/90 hover:bg-cinema-violet/40 border border-cinema-border transition-colors focus-visible:ring-2 focus-visible:ring-cinema-accent/60"
              aria-label={playing ? 'Pausar' : 'Reproducir'}
            >
              {playing ? (
                <Pause className="w-5 h-5" />
              ) : (
                <Play className="w-5 h-5" fill="currentColor" />
              )}
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setMuted(!muted);
                if (videoRef.current) videoRef.current.muted = !muted;
              }}
              className="p-3 md:p-2 rounded-full bg-cinema-elevated/90 hover:bg-cinema-violet/40 border border-cinema-border transition-colors focus-visible:ring-2 focus-visible:ring-cinema-accent/60"
              aria-label={muted ? 'Activar sonido' : 'Silenciar'}
            >
              {muted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
            </button>
          </div>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              toggleFullscreen();
            }}
            className="p-3 md:p-2 rounded-full bg-cinema-elevated/90 hover:bg-cinema-violet/40 border border-cinema-border transition-colors focus-visible:ring-2 focus-visible:ring-cinema-accent/60"
            aria-label="Pantalla completa"
          >
            <Maximize className="w-5 h-5" />
          </button>
        </div>
      </div>
      {!playing && (
        <button
          type="button"
          onClick={togglePlay}
          className="absolute inset-0 flex items-center justify-center bg-cinema-bg/40 transition-opacity hover:bg-cinema-bg/50 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-cinema-accent/60"
          aria-label="Reproducir"
        >
          <div className="p-5 rounded-full bg-cinema-accent text-white shadow-glow">
            <Play className="w-8 h-8" fill="currentColor" />
          </div>
        </button>
      )}
    </div>
  );
}
