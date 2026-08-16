'use client';

import { useQuery, useAction } from '@pelis/db/client';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useState } from 'react';
import { ArrowLeft, Star, Play, Tv, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { api } from '@pelis/db/api';
import { MovieDetailSkeleton } from '@pelis/ui/features/movie-detail-skeleton';
import { ScrollReveal } from '@pelis/ui/features/scroll-reveal';
import { cn } from '@pelis/ui/utils';

interface AnimeDetail {
  _id: string;
  title: string;
  alternativeTitle?: string;
  anilistId?: number | null;
  image: string;
  synopsis: string;
  genre: string[];
  episodes: number;
  status: 'ongoing' | 'completed';
  year: number;
  rating?: number;
  providers: Array<{
    name: string;
    url: string;
    language: 'sub' | 'dub' | 'esp';
    isActive: boolean;
  }>;
}

interface ProviderInfo {
  id: string;
  name: string;
  baseUrl: string;
  language: string;
}

interface Episode {
  id: string;
  number: number;
  title: string;
  image?: string;
  description?: string;
}

interface EpisodesResult {
  provider: string;
  episodes: Episode[];
  triedProviders?: string[];
}

export default function AnimeDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const anime = useQuery(api.anime.getById, { id: id as any }) as AnimeDetail | null | undefined;
  const providers = useQuery(api.anime.getProviders, {}) as ProviderInfo[] | undefined;
  const [selectedProvider, setSelectedProvider] = useState<string>('gogoanime');
  const [activeProvider, setActiveProvider] = useState<string | null>(null);
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [loadingEpisodes, setLoadingEpisodes] = useState(false);
  const [episodeError, setEpisodeError] = useState<string | null>(null);
  const getEpisodes = useAction(api.anime.getEpisodes);

  const isLoading = anime === undefined;

  const loadEpisodes = async (providerId: string) => {
    setSelectedProvider(providerId);
    if (!anime) return;
    setLoadingEpisodes(true);
    setEpisodeError(null);
    try {
      const result = (await getEpisodes({
        animeId: anime.anilistId ? String(anime.anilistId) : '',
        provider: providerId,
        dbId: anime._id,
      })) as EpisodesResult;
      setEpisodes(result.episodes ?? []);
      setActiveProvider(result.provider ?? providerId);
      if (!result.episodes?.length) {
        setEpisodeError('Ningún proveedor devolvió episodios. Prueba otro o verifica Consumet.');
      }
    } catch {
      setEpisodes([]);
      setEpisodeError('Error al cargar episodios.');
    }
    setLoadingEpisodes(false);
  };

  if (isLoading) {
    return <MovieDetailSkeleton />;
  }

  if (!anime) {
    return (
      <div className="page-shell min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-cinema-muted mx-auto mb-4" />
          <h1 className="font-display text-3xl text-white uppercase mb-2">Anime no encontrado</h1>
          <p className="text-cinema-muted mb-6">El anime que buscas no está disponible.</p>
          <Link
            href="/anime"
            className="inline-flex items-center gap-2 text-cinema-violet-light hover:text-cinema-violet"
          >
            <ArrowLeft className="w-4 h-4" />
            Volver a anime
          </Link>
        </div>
      </div>
    );
  }

  const watchProvider = activeProvider ?? selectedProvider;

  return (
    <div className="page-shell">
      <Link
        href="/anime"
        className="inline-flex items-center gap-2 text-cinema-silver hover:text-white transition-colors text-sm mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        Todos los animes
      </Link>

      <div className="grid grid-cols-1 md:grid-cols-[300px_1fr] gap-8 mb-12">
        <div className="relative">
          <div className="aspect-[3/4] rounded-2xl overflow-hidden bg-cinema-elevated border border-cinema-border">
            <img src={anime.image} alt={anime.title} className="w-full h-full object-cover" />
          </div>
        </div>

        <div>
          <ScrollReveal>
            <h1 className="font-display text-4xl md:text-5xl tracking-wide text-white uppercase mb-2">
              {anime.title}
            </h1>
            {anime.alternativeTitle && (
              <p className="text-cinema-muted text-lg mb-4">{anime.alternativeTitle}</p>
            )}

            <div className="flex flex-wrap items-center gap-3 mb-6">
              {anime.rating && (
                <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cinema-gold/10 border border-cinema-gold/30 text-cinema-gold text-sm font-medium">
                  <Star className="w-4 h-4" />
                  {anime.rating}
                </span>
              )}
              <span className="px-3 py-1.5 rounded-lg bg-cinema-elevated text-cinema-silver text-sm border border-cinema-border">
                {anime.year}
              </span>
              <span className="px-3 py-1.5 rounded-lg bg-cinema-elevated text-cinema-silver text-sm border border-cinema-border">
                {anime.episodes} episodios
              </span>
              {anime.anilistId && (
                <span className="px-3 py-1.5 rounded-lg bg-cinema-elevated text-cinema-silver text-sm border border-cinema-border">
                  AniList #{anime.anilistId}
                </span>
              )}
              <span
                className={cn(
                  'px-3 py-1.5 rounded-lg text-sm font-medium border',
                  anime.status === 'ongoing'
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                    : 'bg-cinema-elevated border-cinema-border text-cinema-silver'
                )}
              >
                {anime.status === 'ongoing' ? 'En emisión' : 'Finalizado'}
              </span>
            </div>

            <div className="flex flex-wrap gap-2 mb-6">
              {anime.genre.map((g) => (
                <span
                  key={g}
                  className="px-3 py-1 rounded-full bg-cinema-violet/15 text-cinema-violet-light text-xs font-medium border border-cinema-violet/20"
                >
                  {g}
                </span>
              ))}
            </div>

            <p className="text-cinema-muted leading-relaxed mb-8">{anime.synopsis}</p>

            {providers && providers.length > 0 && (
              <div className="p-4 rounded-xl bg-cinema-surface border border-cinema-border">
                <p className="text-sm text-cinema-silver font-medium mb-3">
                  Seleccionar proveedor (con fallback automático):
                </p>
                <div className="flex flex-wrap gap-2">
                  {providers.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => loadEpisodes(p.id)}
                      className={cn(
                        'px-4 py-2 rounded-lg text-sm font-medium transition-all border',
                        selectedProvider === p.id
                          ? 'bg-cinema-violet text-white border-cinema-violet'
                          : 'bg-cinema-elevated text-cinema-silver hover:text-white border-cinema-border hover:border-cinema-violet/40'
                      )}
                    >
                      {p.name}
                      <span className="ml-1.5 text-[10px] opacity-70">({p.language})</span>
                    </button>
                  ))}
                </div>
                {activeProvider && (
                  <p className="mt-3 text-xs text-emerald-400 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Reproduciendo vía {providers.find((p) => p.id === activeProvider)?.name ?? activeProvider}
                  </p>
                )}
              </div>
            )}
          </ScrollReveal>
        </div>
      </div>

      <ScrollReveal>
        <h2 className="font-display text-2xl tracking-wide text-white uppercase mb-6">Episodios</h2>

        {loadingEpisodes ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 text-cinema-silver animate-spin" />
          </div>
        ) : episodes.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {episodes.map((ep) => (
              <Link
                key={ep.id}
                href={`/anime/watch/${anime._id}/${encodeURIComponent(ep.id)}?provider=${watchProvider}`}
                className="flex items-center gap-3 p-3 rounded-xl bg-cinema-surface border border-cinema-border hover:border-cinema-violet/40 transition-all group"
              >
                <div className="w-20 h-12 rounded-lg overflow-hidden bg-cinema-elevated shrink-0">
                  {ep.image ? (
                    <img src={ep.image} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Play className="w-4 h-4 text-cinema-ash" />
                    </div>
                  )}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-white truncate">Episodio {ep.number}</p>
                  {ep.title && <p className="text-xs text-cinema-muted truncate">{ep.title}</p>}
                </div>
                <Play className="w-4 h-4 text-cinema-ash ml-auto shrink-0 group-hover:text-cinema-violet-light transition-colors" />
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <Tv className="w-10 h-10 text-cinema-muted mx-auto mb-3" />
            <p className="text-cinema-muted text-sm">
              {episodeError ?? 'Selecciona un proveedor arriba para ver los episodios disponibles.'}
            </p>
          </div>
        )}
      </ScrollReveal>
    </div>
  );
}
