'use client';

import { useEffect, useRef, useState } from 'react';
import { useMutation } from 'convex/react';
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
  const lastSaved = useRef(0);

  const src = videoUrl || DEMO_VIDEO;

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
    <div className="relative aspect-video rounded-2xl overflow-hidden bg-black border border-cinema-border group">
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
      <div className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-black/90 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
        <div
          className="h-1 bg-white/20 rounded-full mb-3 cursor-pointer"
          onClick={(e) => {
            e.stopPropagation();
            const video = videoRef.current;
            if (!video || !duration) return;
            const rect = e.currentTarget.getBoundingClientRect();
            const ratio = (e.clientX - rect.left) / rect.width;
            video.currentTime = ratio * duration;
          }}
        >
          <div
            className="h-full bg-cinema-accent rounded-full"
            style={{ width: `${duration ? (progress / duration) * 100 : 0}%` }}
          />
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                togglePlay();
              }}
              className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
              aria-label={playing ? 'Pausar' : 'Reproducir'}
            >
              {playing ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" fill="currentColor" />}
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setMuted(!muted);
                if (videoRef.current) videoRef.current.muted = !muted;
              }}
              className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
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
            className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
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
          className={cn(
            'absolute inset-0 flex items-center justify-center',
            'bg-black/30 transition-opacity group-hover:bg-black/40'
          )}
          aria-label="Reproducir"
        >
          <div className="p-5 rounded-full bg-cinema-accent/90 text-white shadow-lg shadow-cinema-accent/30">
            <Play className="w-8 h-8" fill="currentColor" />
          </div>
        </button>
      )}
    </div>
  );
}
