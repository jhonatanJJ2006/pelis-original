'use client';

import { useEffect, useRef, useState } from 'react';
import Hls from 'hls.js';
import { AlertCircle, Loader2 } from 'lucide-react';

interface TVPlayerProps {
  streamUrl: string;
  channelName: string;
}

export default function TVPlayer({ streamUrl, channelName }: TVPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    setError(null);
    setLoading(true);

    const isHls = streamUrl.includes('.m3u8');

    if (isHls && Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
      });
      hls.loadSource(streamUrl);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        setLoading(false);
        video.play().catch(() => {});
      });

      hls.on(Hls.Events.ERROR, (_, data) => {
        if (data.fatal) {
          setError('Error al cargar el stream. Intenta con otro canal.');
        }
      });

      return () => {
        hls.destroy();
      };
    } else if (isHls) {
      const canPlay = video.canPlayType('application/vnd.apple.mpegurl');
      if (canPlay) {
        video.src = streamUrl;
        video.addEventListener('loadedmetadata', () => {
          setLoading(false);
          video.play().catch(() => {});
        });
        video.addEventListener('error', () => {
          setError('Error al reproducir el stream.');
        });
      } else {
        setError('Tu navegador no soporta este tipo de stream.');
        setLoading(false);
      }
    } else {
      video.src = streamUrl;
      video.addEventListener('loadedmetadata', () => {
        setLoading(false);
        video.play().catch(() => {});
      });
      video.addEventListener('error', () => {
        setError('Error al reproducir el stream.');
      });
    }

    return () => {
      video.src = '';
      video.load();
    };
  }, [streamUrl]);

  return (
    <div className="relative aspect-video bg-black">
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
