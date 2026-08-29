'use client';

import { useAction, useQuery } from '@pelis/db/client';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  ArrowLeft,
  Loader2,
  AlertCircle,
  Monitor,
  Crown,
  ChevronLeft,
  ChevronRight,
  Info,
  Languages,
  Server,
  Zap,
} from 'lucide-react';
import { api } from '@pelis/db/api';
import { hasActivePlan, useUser } from '@pelis/auth/hooks';
import { Spinner } from '@pelis/ui/components';
import { cn } from '@pelis/ui/utils';
import { AnimeHlsPlayer } from '@/components/anime-hls-player';

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
      intro?: { start: number; end: number } | null;
      outro?: { start: number; end: number } | null;
      fellBackFrom?: string | null;
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

const EMBED_STALL_TIMEOUT_MS = 9000;

export default function AnimeWatchPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user } = useUser();

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

  const entitled = hasActivePlan(user);
  const userId = user?._id;
  const season = series?.seasons.find((s) => s._id === animeId);

  // The embed providers shown above the player. These are the players that
  // either answer instantly (AniList id + episode number) or resolve their
  // iframe server-side (latanime hosts). The grid wraps, so no cap needed.
  const primaryProviders = useMemo(
    () => (providers ?? []).filter((p) => p.kind === 'embed'),
    [providers]
  );

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
        // Manual provider switching only: never silently swap servers.
        tryFallback: false,
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

  // `user` is a fresh object on every render, so the effect must depend on
  // stable primitives (`userId`, `entitled`) — otherwise loadStream
  // re-fires endlessly and the player never settles.
  useEffect(() => {
    if (!userId || !entitled || !Number.isFinite(episodeNumber)) {
      setLoading(false);
      return;
    }
    void loadStream();
  }, [userId, entitled, episodeNumber, loadStream]);

  // An iframe from a blocked domain never fires `load`, and being cross-origin
  // we cannot inspect it — a timeout is the only signal available. Once the
  // frame DOES load, the timer is cancelled so a working (or even a
  // loaded-but-broken) player never gets flagged as stalled afterwards.
  const embedLoadTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (stream?.kind !== 'embed') {
      setEmbedStalled(false);
      return;
    }
    setEmbedStalled(false);
    embedLoadTimerRef.current = setTimeout(() => setEmbedStalled(true), EMBED_STALL_TIMEOUT_MS);
    return () => {
      if (embedLoadTimerRef.current) clearTimeout(embedLoadTimerRef.current);
      embedLoadTimerRef.current = null;
    };
  }, [stream]);

  // The unified player handles every HLS stream; a fatal error here means the
  // server is down, so we surface the manual server switcher.
  const onPlayerFatalError = useCallback(() => {
    setError('Este servidor no está disponible ahora mismo. Prueba otro servidor.');
  }, []);

  const goToEpisode = (target: number) => {
    const query = new URLSearchParams(searchParams.toString());
    router.push(`/anime/watch/${animeId}/${target}?${query.toString()}`);
  };

  const buildWatchUrl = useCallback(
    (next: { provider?: string; dub?: boolean }) => {
      const query = new URLSearchParams(searchParams.toString());
      if (next.provider !== undefined) {
        if (next.provider) query.set('provider', next.provider);
        else query.delete('provider');
      }
      if (next.dub !== undefined) {
        if (next.dub) query.set('dub', '1');
        else query.delete('dub');
      }
      return `/anime/watch/${animeId}/${episodeNumber}?${query.toString()}`;
    },
    [animeId, episodeNumber, searchParams]
  );

  const switchProvider = (providerId: string) => {
    router.push(buildWatchUrl({ provider: providerId }));
  };

  const toggleDub = () => {
    router.push(buildWatchUrl({ dub: !dub }));
  };

  const currentIndex = episodeNumbers.indexOf(episodeNumber);
  const previousEpisode = currentIndex > 0 ? episodeNumbers[currentIndex - 1] : null;
  const nextEpisode =
    currentIndex >= 0 && currentIndex < episodeNumbers.length - 1
      ? episodeNumbers[currentIndex + 1]
      : null;

  const activeProviderId = stream && stream.kind !== 'none' ? stream.provider : provider;
  const activeProvider = providers?.find((p) => p.id === activeProviderId);
  const activeProviderName = activeProvider?.name ?? activeProviderId ?? '—';
  const fellBackFrom = stream && stream.kind !== 'none' ? stream.fellBackFrom : null;

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

      {entitled && primaryProviders.length > 0 && (
        <div className="mb-4 rounded-2xl bg-cinema-surface border border-cinema-border p-3 md:p-4">
          <div className="flex items-center gap-2 mb-2.5">
            <Zap className="w-3.5 h-3.5 text-emerald-400" aria-hidden />
            <p className="text-[11px] uppercase tracking-widest text-emerald-400 font-medium">
              Servidor de reproducción
            </p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {primaryProviders.map((p) => {
              const active = activeProviderId === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => switchProvider(p.id)}
                  aria-pressed={active}
                  className={cn(
                    'flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium transition-all border',
                    active
                      ? 'bg-cinema-violet text-white border-cinema-violet shadow-glow-violet'
                      : 'bg-cinema-elevated text-cinema-silver hover:text-white border-cinema-border hover:border-cinema-violet/50'
                  )}
                >
                  <span className="truncate">{p.name}</span>
                  {active && <span className="w-1.5 h-1.5 rounded-full bg-white shrink-0" />}
                </button>
              );
            })}
          </div>
          <div className="flex items-center gap-3 mt-3">
            <button
              type="button"
              onClick={toggleDub}
              className={cn(
                'inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors',
                dub
                  ? 'bg-cinema-violet/15 text-cinema-violet-light border-cinema-violet/40'
                  : 'bg-cinema-elevated text-cinema-silver hover:text-white border-cinema-border'
              )}
              aria-pressed={dub}
            >
              <Languages className="w-3.5 h-3.5" aria-hidden />
              {dub ? 'Doblado' : 'Subtitulado'}
            </button>
            <p className="text-[11px] text-cinema-muted">
              Cambia de servidor arriba si uno no carga.
            </p>
          </div>
        </div>
      )}

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
          ) : !entitled ? (
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
                      {primaryProviders.map((p) => (
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
                    // VidNest (el único servidor que funciona hoy) detecta el
                    // atributo sandbox y se niega a reproducir ("Please
                    // Disable Sandbox"), así que no lo usamos. El bloqueo de
                    // popunders se deja en manos del bloqueador del usuario.
                    allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
                    referrerPolicy="origin"
                    onLoad={() => {
                      if (embedLoadTimerRef.current) {
                        clearTimeout(embedLoadTimerRef.current);
                        embedLoadTimerRef.current = null;
                      }
                      setEmbedStalled(false);
                    }}
                  />
                  {embedStalled && (
                    <div className="absolute inset-x-0 bottom-0 z-10 p-3 bg-black/85 backdrop-blur-sm">
                      <p className="text-xs text-amber-300 text-center">
                        Este servidor tarda demasiado en responder. Cambia de servidor arriba.
                      </p>
                    </div>
                  )}
                </>
              )}

              {stream?.kind === 'hls' && (
                <AnimeHlsPlayer
                  source={stream.sources[0] ?? { url: '' }}
                  subtitles={stream.subtitles}
                  intro={stream.intro ?? null}
                  outro={stream.outro ?? null}
                  episodeLabel={`Episodio ${episodeNumber}`}
                  onFatalError={onPlayerFatalError}
                />
              )}
            </>
          )}
        </div>
      </div>

      {entitled && (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-xl bg-cinema-surface border border-cinema-border">
            <p className="text-sm text-cinema-silver">
              Reproduciendo vía <span className="text-white font-medium">{activeProviderName}</span>
              {dub && <span className="text-cinema-muted"> · doblado</span>}
            </p>
            {activeProvider?.note && (
              <p className="text-xs text-cinema-muted">{activeProvider.note}</p>
            )}

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

          {providers && providers.length > primaryProviders.length && (
            <details className="mt-5 rounded-xl bg-cinema-surface border border-cinema-border p-4 group">
              <summary className="flex items-center gap-2 cursor-pointer text-sm text-cinema-silver hover:text-white transition-colors list-none">
                <Server className="w-4 h-4" aria-hidden />
                Más servidores (scraping, suelen estar caídos)
                <span className="ml-auto text-xs text-cinema-muted group-open:hidden">mostrar</span>
                <span className="ml-auto text-xs text-cinema-muted hidden group-open:inline">ocultar</span>
              </summary>
              <div className="flex flex-wrap gap-2 mt-3">
                {providers
                  .filter((p) => !primaryProviders.some((q) => q.id === p.id))
                  .map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => switchProvider(p.id)}
                      className={cn(
                        'px-3 py-1.5 rounded-lg text-xs font-medium transition-all border',
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
            </details>
          )}
        </>
      )}
    </div>
  );
}
