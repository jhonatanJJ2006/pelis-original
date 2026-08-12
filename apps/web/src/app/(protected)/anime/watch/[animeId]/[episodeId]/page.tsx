'use client';

import { useAction, useQuery } from '@pelis/db/client';
import { useParams, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useRef, useState, useEffect } from 'react';
import { ArrowLeft, Loader2, AlertCircle, Monitor, Crown } from 'lucide-react';
import { api } from '@pelis/db/api';
import { useUser } from '@pelis/auth/hooks';
import { Spinner } from '@pelis/ui/components';
import Hls from 'hls.js';

interface VideoSource {
  url: string;
  quality: string;
  isM3U8?: boolean;
}

interface Subtitle {
  url: string;
  lang: string;
}

export default function AnimeWatchPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const { user } = useUser();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoData, setVideoData] = useState<{
    sources: VideoSource[];
    subtitles: Subtitle[];
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const episodeId = params.episodeId as string;
  const animeId = params.animeId as string;
  const provider = searchParams.get('provider') || 'gogoanime';

  const getVideoUrl = useAction<{ episodeId: string; provider: string }, { sources: Array<{ url: string; quality?: string; isM3U8?: boolean }>; subtitles: Array<{ url: string; lang?: string }> }>(api.anime.getVideoUrl);
  const providers = useQuery(api.anime.getProviders, {}) as
    Array<{ id: string; name: string }> | undefined;
  const providerName = providers?.find((p) => p.id === provider)?.name || provider;

  const hasActivePlan = !!(user?.planExpiresAt && user.planExpiresAt > Date.now());

  useEffect(() => {
    if (!user || !hasActivePlan) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    const loadVideo = async () => {
      setLoading(true);
      setError(null);
      try {
        const result = await getVideoUrl({
          episodeId,
          provider,
        });
        if (!cancelled) {
          setVideoData(result as any);
          if (!result?.sources?.length) {
            setError('No se encontraron fuentes de video para este episodio.');
          }
        }
      } catch {
        if (!cancelled) {
          setError('Error al cargar el video. Intenta con otro proveedor.');
        }
      }
      if (!cancelled) setLoading(false);
    };

    loadVideo();
    return () => {
      cancelled = true;
    };
  }, [episodeId, provider, getVideoUrl, user, hasActivePlan]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !videoData?.sources?.length || !hasActivePlan) return;

    const hlsSource = videoData.sources.find((s) => s.isM3U8 || s.url?.includes('.m3u8'));
    const directSource = videoData.sources[0];

    const playUrl = hlsSource?.url || directSource?.url;
    if (!playUrl) return;

    if (hlsSource?.isM3U8 !== false && playUrl.includes('.m3u8') && Hls.isSupported()) {
      const hls = new Hls({ enableWorker: true });
      hls.loadSource(playUrl);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        video.play().catch(() => {});
      });
      return () => hls.destroy();
    }

    video.src = playUrl;
    video.play().catch(() => {});

    return () => {
      video.src = '';
      video.load();
    };
  }, [videoData, hasActivePlan]);

  if (user === undefined) {
    return (
      <div
        className="page-shell min-h-[60vh] flex items-center justify-center"
        role="status"
        aria-label="Cargando"
      >
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="page-shell">
      <Link
        href={`/anime/${encodeURIComponent(animeId)}`}
        className="inline-flex items-center gap-2 text-cinema-silver hover:text-white transition-colors text-sm mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        Volver al anime
      </Link>

      <div className="rounded-2xl overflow-hidden bg-black border border-cinema-border mb-6">
        <div className="relative aspect-video bg-black">
          {!user ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-8">
              <Monitor className="w-12 h-12 text-cinema-muted/40" aria-hidden />
              <p className="text-cinema-muted text-center max-w-md">
                Inicia sesión para reproducir este episodio
              </p>
              <Link href="/login" className="btn-primary">
                Iniciar sesión
              </Link>
            </div>
          ) : !hasActivePlan ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-8">
              <Crown className="w-12 h-12 text-cinema-gold/40" aria-hidden />
              <p className="text-cinema-muted text-center max-w-md">
                Necesitas un plan activo para reproducir anime
              </p>
              <Link href="/subscribe" className="btn-primary-glow inline-flex items-center gap-2">
                <Crown className="w-4 h-4" aria-hidden />
                Ver planes
              </Link>
            </div>
          ) : (
            <>
              {loading && (
                <div className="absolute inset-0 flex items-center justify-center z-10">
                  <div className="text-center">
                    <Loader2 className="w-10 h-10 text-cinema-silver animate-spin mx-auto mb-3" />
                    <p className="text-cinema-muted text-sm">Cargando video...</p>
                  </div>
                </div>
              )}

              {error && (
                <div className="absolute inset-0 flex items-center justify-center z-10">
                  <div className="text-center max-w-md px-6">
                    <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
                    <p className="text-cinema-muted text-sm mb-4">{error}</p>
                    <div className="flex flex-wrap justify-center gap-2">
                      {providers?.map((p) => (
                        <Link
                          key={p.id}
                          href={`/anime/watch/${animeId}/${episodeId}?provider=${p.id}`}
                          className="px-3 py-1.5 rounded-lg bg-cinema-elevated text-cinema-silver hover:text-white text-sm border border-cinema-border transition-colors"
                        >
                          {p.name}
                        </Link>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              <video
                ref={videoRef}
                className="w-full h-full object-contain"
                playsInline
                controls
                autoPlay
              />
            </>
          )}
        </div>
      </div>

      {hasActivePlan && (
        <>
          <div className="flex items-center justify-between p-4 rounded-xl bg-cinema-surface border border-cinema-border">
            <div>
              <p className="text-sm text-cinema-silver">
                Proveedor: <span className="text-white font-medium">{providerName}</span>
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Monitor className="w-4 h-4 text-cinema-ash" />
              <span className="text-xs text-cinema-muted">
                {videoData?.sources?.length
                  ? `${videoData.sources.length} fuente(s)`
                  : 'Sin fuentes'}
              </span>
            </div>
          </div>

          {providers && providers.length > 0 && (
            <div className="mt-4">
              <p className="text-sm text-cinema-silver font-medium mb-3">Cambiar proveedor:</p>
              <div className="flex flex-wrap gap-2">
                {providers.map((p) => (
                  <Link
                    key={p.id}
                    href={`/anime/watch/${animeId}/${episodeId}?provider=${p.id}`}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all border ${
                      provider === p.id
                        ? 'bg-cinema-violet text-white border-cinema-violet'
                        : 'bg-cinema-elevated text-cinema-silver hover:text-white border-cinema-border hover:border-cinema-violet/40'
                    }`}
                  >
                    {p.name}
                  </Link>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
