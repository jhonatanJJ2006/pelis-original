'use client';

import { useAction, useQuery } from '@pelis/db/client';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useRef, useState, useEffect, useCallback } from 'react';
import {
  ArrowLeft,
  Loader2,
  AlertCircle,
  Monitor,
  Crown,
  ChevronLeft,
  ChevronRight,
  Info,
} from 'lucide-react';
import { api } from '@pelis/db/api';
import { useUser } from '@pelis/auth/hooks';
import { Spinner } from '@pelis/ui/components';
import { cn } from '@pelis/ui/utils';
import Hls from 'hls.js';

interface ProviderInfo {
  id: string;
  name: string;
  kind: 'embed' | 'hls';
  language: string;
  note?: string | null;
}

type StreamResult =
  | { kind: 'embed'; provider: string; url: string; dub: boolean; fellBackFrom?: string | null }
  | {
      kind: 'hls';
      provider: string;
      sources: Array<{ url: string; quality?: string; isM3U8?: boolean }>;
      subtitles: Array<{ url: string; lang?: string }>;
    }
  | { kind: 'none'; provider: string | null; error?: string };

interface Season {
  _id: string;
  seasonLabel: string;
}

interface SeriesInfo {
  title: string;
  seasons: Season[];
}

interface EpisodesResponse {
  episodes: Array<{ number: number; title: string }>;
}

export default function AnimeWatchPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user } = useUser();
  const videoRef = useRef<HTMLVideoElement>(null);

  const animeId = params.animeId as string;
  const episodeNumber = Number(params.episodeNumber);
  const provider = searchParams.get('provider') ?? undefined;
  const dub = searchParams.get('dub') === '1';

  const [stream, setStream] = useState<StreamResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [embedStalled, setEmbedStalled] = useState(false);

  const getEpisodeStream = useAction(api.anime.getEpisodeStream);
  const getSeasonEpisodes = useAction(api.anime.getSeasonEpisodes);
  const providers = useQuery(api.anime.getProviders, {}) as ProviderInfo[] | undefined;
  const series = useQuery(api.anime.getSeries, { id: animeId }) as SeriesInfo | null | undefined;

  const [episodeNumbers, setEpisodeNumbers] = useState<number[]>([]);
  const [episodeTitle, setEpisodeTitle] = useState<string | null>(null);

  const hasActivePlan = !!(user?.planExpiresAt && user.planExpiresAt > Date.now());
  const season = series?.seasons.find((s) => s._id === animeId);

  useEffect(() => {
    let cancelled = false;
    getSeasonEpisodes({ animeId })
      .then((result) => {
        if (cancelled) return;
        const list = (result as EpisodesResponse).episodes ?? [];
        setEpisodeNumbers(list.map((ep) => ep.number));
        setEpisodeTitle(list.find((ep) => ep.number === episodeNumber)?.title ?? null);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [animeId, episodeNumber, getSeasonEpisodes]);

  const loadStream = useCallback(async () => {
    setLoading(true);
    setError(null);
    setStream(null);
    setEmbedStalled(false);
    try {
      const result = (await getEpisodeStream({
        animeId,
        episodeNumber,
        provider,
        dub,
        tryFallback: true,
      })) as StreamResult;
      setStream(result);
      if (result.kind === 'none') {
        setError(result.error ?? 'No se encontraron fuentes para este episodio.');
      }
    } catch {
      setError('Error al cargar el episodio. Prueba con otro proveedor.');
    }
    setLoading(false);
  }, [animeId, episodeNumber, provider, dub, getEpisodeStream]);

  useEffect(() => {
    if (!user || !hasActivePlan || !Number.isFinite(episodeNumber)) {
      setLoading(false);
      return;
    }
    void loadStream();
  }, [user, hasActivePlan, episodeNumber, loadStream]);

  // An iframe from a blocked domain never fires `load`, and being cross-origin
  // we cannot inspect it — a timeout is the only signal available.
  useEffect(() => {
    if (stream?.kind !== 'embed') return;
    const timer = setTimeout(() => setEmbedStalled(true), 9000);
    return () => clearTimeout(timer);
  }, [stream]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || stream?.kind !== 'hls' || !hasActivePlan) return;

    const hlsSource = stream.sources.find((s) => s.isM3U8 || s.url?.includes('.m3u8'));
    const playUrl = hlsSource?.url ?? stream.sources[0]?.url;
    if (!playUrl) return;

    if (playUrl.includes('.m3u8') && Hls.isSupported()) {
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
  }, [stream, hasActivePlan]);

  const goToEpisode = (target: number) => {
    const query = new URLSearchParams(searchParams.toString());
    router.push(`/anime/watch/${animeId}/${target}?${query.toString()}`);
  };

  const switchProvider = (providerId: string) => {
    const query = new URLSearchParams(searchParams.toString());
    query.set('provider', providerId);
    router.push(`/anime/watch/${animeId}/${episodeNumber}?${query.toString()}`);
  };

  const currentIndex = episodeNumbers.indexOf(episodeNumber);
  const previousEpisode = currentIndex > 0 ? episodeNumbers[currentIndex - 1] : null;
  const nextEpisode =
    currentIndex >= 0 && currentIndex < episodeNumbers.length - 1
      ? episodeNumbers[currentIndex + 1]
      : null;

  const activeProviderId = stream && stream.kind !== 'none' ? stream.provider : provider;
  const activeProviderName =
    providers?.find((p) => p.id === activeProviderId)?.name ?? activeProviderId ?? '—';
  const fellBackFrom = stream?.kind === 'embed' ? stream.fellBackFrom : null;

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
        href={`/anime/${animeId}`}
        className="inline-flex items-center gap-2 text-cinema-silver hover:text-white transition-colors text-sm mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        Volver al anime
      </Link>

      <div className="mb-4">
        <h1 className="text-lg md:text-xl font-semibold text-white">
          {series?.title ?? 'Anime'}
          <span className="text-cinema-muted font-normal">
            {' · '}
            {season?.seasonLabel ? `${season.seasonLabel} · ` : ''}Episodio {episodeNumber}
          </span>
        </h1>
        {episodeTitle && <p className="text-sm text-cinema-muted mt-0.5">{episodeTitle}</p>}
      </div>

      <div className="rounded-2xl overflow-hidden bg-black border border-cinema-border mb-4">
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
                    <p className="text-cinema-muted text-sm">Buscando fuentes...</p>
                  </div>
                </div>
              )}

              {error && !loading && (
                <div className="absolute inset-0 flex items-center justify-center z-10 p-6">
                  <div className="text-center max-w-md">
                    <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
                    <p className="text-cinema-muted text-sm mb-4">{error}</p>
                    <div className="flex flex-wrap justify-center gap-2">
                      {providers?.map((p) => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => switchProvider(p.id)}
                          className="px-3 py-1.5 rounded-lg bg-cinema-elevated text-cinema-silver hover:text-white text-sm border border-cinema-border transition-colors"
                        >
                          {p.name}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {stream?.kind === 'embed' && (
                <>
                  <iframe
                    key={stream.url}
                    src={stream.url}
                    title={`Episodio ${episodeNumber}`}
                    className="absolute inset-0 w-full h-full"
                    allowFullScreen
                    // Third-party player: allow playback and fullscreen, but keep
                    // popups (ad popunders) and top-level navigation blocked.
                    sandbox="allow-scripts allow-same-origin allow-forms allow-presentation"
                    allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
                    referrerPolicy="origin"
                    onLoad={() => setEmbedStalled(false)}
                  />
                  {embedStalled && (
                    <div className="absolute inset-x-0 bottom-0 z-10 p-3 bg-black/85 backdrop-blur-sm">
                      <p className="text-xs text-amber-300 text-center">
                        El reproductor tarda demasiado en cargar. Puede estar bloqueado por tu red o
                        tu bloqueador de anuncios: prueba otro proveedor abajo.
                      </p>
                    </div>
                  )}
                </>
              )}

              {stream?.kind === 'hls' && (
                <video
                  ref={videoRef}
                  className="w-full h-full object-contain"
                  playsInline
                  controls
                  autoPlay
                >
                  {stream.subtitles?.map((sub) => (
                    <track
                      key={sub.url}
                      kind="subtitles"
                      src={sub.url}
                      label={sub.lang ?? 'Subtítulos'}
                    />
                  ))}
                </video>
              )}
            </>
          )}
        </div>
      </div>

      {hasActivePlan && (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-xl bg-cinema-surface border border-cinema-border">
            <p className="text-sm text-cinema-silver">
              Reproduciendo vía <span className="text-white font-medium">{activeProviderName}</span>
              {dub && <span className="text-cinema-muted"> · doblado</span>}
            </p>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => previousEpisode && goToEpisode(previousEpisode)}
                disabled={!previousEpisode}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-cinema-elevated text-cinema-silver hover:text-white text-sm border border-cinema-border disabled:opacity-40 disabled:hover:text-cinema-silver transition-colors"
              >
                <ChevronLeft className="w-4 h-4" aria-hidden />
                Anterior
              </button>
              <button
                type="button"
                onClick={() => nextEpisode && goToEpisode(nextEpisode)}
                disabled={!nextEpisode}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-cinema-elevated text-cinema-silver hover:text-white text-sm border border-cinema-border disabled:opacity-40 disabled:hover:text-cinema-silver transition-colors"
              >
                Siguiente
                <ChevronRight className="w-4 h-4" aria-hidden />
              </button>
            </div>
          </div>

          {fellBackFrom && (
            <p className="mt-3 flex items-start gap-2 text-xs text-amber-400/90">
              <Info className="w-3.5 h-3.5 mt-0.5 shrink-0" aria-hidden />
              {providers?.find((p) => p.id === fellBackFrom)?.name ?? fellBackFrom} no devolvió
              fuentes, así que cambiamos automáticamente a {activeProviderName}.
            </p>
          )}

          {providers && providers.length > 0 && (
            <div className="mt-5">
              <p className="text-sm text-cinema-silver font-medium mb-3">Cambiar proveedor:</p>
              <div className="flex flex-wrap gap-2">
                {providers.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => switchProvider(p.id)}
                    className={cn(
                      'px-4 py-2 rounded-lg text-sm font-medium transition-all border',
                      activeProviderId === p.id
                        ? 'bg-cinema-violet text-white border-cinema-violet'
                        : 'bg-cinema-elevated text-cinema-silver hover:text-white border-cinema-border hover:border-cinema-violet/40'
                    )}
                  >
                    {p.name}
                    {p.kind === 'hls' && (
                      <span className="ml-1.5 text-[10px] opacity-60">externo</span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
