'use client';

import { useEffect, useRef, useState } from 'react';
import Hls from 'hls.js';
import { AlertCircle, Loader2 } from 'lucide-react';
import { buildTvProxyUrl } from '@/lib/tv-stream-proxy';

interface TVPlayerProps {
  channelId: string;
  channelName: string;
}

export default function TVPlayer({ channelId, channelName }: TVPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const streamUrl =
    typeof window !== 'undefined'
      ? buildTvProxyUrl(channelId, undefined, window.location.origin)
      : buildTvProxyUrl(channelId);

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

  return (
    <div className="relative w-full h-full bg-black">
      {loading && !error && (
        <div className="absolute inset-0 flex items-center justify-center z-10">
          <div className="text-center">
            <Loader2 className="w-10 h-10 text-cinema-silver animate-spin mx-auto mb-3" />
            <p className="text-cinema-muted text-sm">Conectando con {channelName}...</p>
          </div>
        </div>
      )}

      {error && (
        <div className="absolute inset-0 flex items-center justify-center z-10">
          <div className="text-center max-w-md px-6">
            <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
            <p className="text-cinema-muted text-sm">{error}</p>
          </div>
        </div>
      )}

      <video
        ref={videoRef}
        className="w-full h-full object-contain"
        playsInline
        muted={false}
        controls
        autoPlay
      />
    </div>
  );
}
