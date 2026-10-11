'use client';

import { useQuery, useAction } from '@pelis/db/client';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Star,
  Play,
  Tv,
  Loader2,
  AlertCircle,
  Calendar,
  Clock,
  Film,
  Layers,
} from 'lucide-react';
import { api } from '@pelis/db/api';
import { MovieDetailSkeleton } from '@pelis/ui/features/movie-detail-skeleton';
import { ScrollReveal } from '@pelis/ui/features/scroll-reveal';
import { cn } from '@pelis/ui/utils';

interface Season {
  _id: string;
  title: string;
  seasonNumber?: number;
  seasonLabel: string;
  format: string;
  isExtra: boolean;
  anilistId?: number;
  image: string;
  synopsis: string;
  episodes: number;
  year: number;
  rating?: number;
  status: 'ongoing' | 'completed';
}

interface AnimeSeries {
  _id: string;
  seriesKey: string;
  title: string;
  alternativeTitle?: string;
  image: string;
  backdropImage?: string;
  synopsis: string;
  genre: string[];
  year: number;
  latestYear: number;
  rating?: number;
  status: 'ongoing' | 'completed';
  seasonCount: number;
  extrasCount: number;
  totalEpisodes: number;
  seasons: Season[];
}

interface EpisodeMeta {
  number: number;
  title: string;
  overview: string;
  image: string;
  airDate: string | null;
  runtime: number | null;
}

interface EpisodesResponse {
  animeId: string;
  anilistId: number | null;
  source: 'anizip' | 'placeholder';
  episodes: EpisodeMeta[];
}

function formatAirDate(value: string | null): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString('es', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function AnimeDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const series = useQuery(api.anime.getSeries, { id }) as AnimeSeries | null | undefined;
  const getSeasonEpisodes = useAction(api.anime.getSeasonEpisodes);

  const [activeSeasonId, setActiveSeasonId] = useState<string | null>(null);
  const [episodes, setEpisodes] = useState<EpisodeMeta[]>([]);
  const [loadingEpisodes, setLoadingEpisodes] = useState(false);
  const [episodeError, setEpisodeError] = useState<string | null>(null);

  // Deep links point at a specific season; otherwise start on the first one.
  useEffect(() => {
    if (!series || activeSeasonId) return;
    const target = series.seasons.find((s) => s._id === id) ?? series.seasons[0];
    if (target) setActiveSeasonId(target._id);
  }, [series, activeSeasonId, id]);

  const activeSeason = useMemo(
    () => series?.seasons.find((s) => s._id === activeSeasonId) ?? null,
    [series, activeSeasonId]
  );

  const loadEpisodes = useCallback(
    async (seasonId: string) => {
      setLoadingEpisodes(true);
      setEpisodeError(null);
      setEpisodes([]);
      try {
        const result = (await getSeasonEpisodes({ animeId: seasonId })) as EpisodesResponse;
        setEpisodes(result.episodes ?? []);
        if (!result.episodes?.length) {
          setEpisodeError('Todavía no hay episodios listados para esta temporada.');
        }
      } catch {
        setEpisodeError('No pudimos cargar los episodios. Inténtalo de nuevo.');
      }
      setLoadingEpisodes(false);
    },
    [getSeasonEpisodes]
  );

  useEffect(() => {
    if (activeSeasonId) void loadEpisodes(activeSeasonId);
  }, [activeSeasonId, loadEpisodes]);

  if (series === undefined) {
    return <MovieDetailSkeleton />;
  }

  if (!series) {
    return (
      <div className="page-shell min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-cinema-muted mx-auto mb-4" />
          <h1 className="font-display text-3xl text-cinema-chalk uppercase mb-2">
            Anime no encontrado
          </h1>
          <p className="text-cinema-muted mb-6">El anime que buscas no está disponible.</p>
          <Link
            href="/anime"
            className="inline-flex items-center gap-2 text-cinema-accent-light hover:text-cinema-accent"
          >
            <ArrowLeft className="w-4 h-4" />
            Volver a anime
          </Link>
        </div>
      </div>
    );
  }

  const seasons = series.seasons.filter((s) => !s.isExtra);
  const extras = series.seasons.filter((s) => s.isExtra);

  return (
    <div className="page-shell">
      <Link
        href="/anime"
        className="inline-flex items-center gap-2 text-cinema-silver hover:text-cinema-chalk transition-colors text-sm mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        Todos los animes
      </Link>

      <div className="grid grid-cols-1 md:grid-cols-[280px_1fr] gap-8 mb-12">
        <div className="relative">
          <div className="aspect-[3/4] rounded-lg overflow-hidden bg-cinema-elevated border border-cinema-border">
            <img
              src={activeSeason?.image ?? series.image}
              alt={series.title}
              className="w-full h-full object-cover"
            />
          </div>
        </div>

        <div>
          <ScrollReveal>
            <h1 className="font-display text-4xl md:text-5xl font-semibold tracking-tight text-cinema-chalk mb-2">
              {series.title}
            </h1>
            {series.alternativeTitle && (
              <p className="text-cinema-muted text-lg mb-4">{series.alternativeTitle}</p>
            )}

            <div className="flex flex-wrap items-center gap-2.5 mb-6">
              {series.rating && (
                <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cinema-accent/10 border border-cinema-accent/30 text-cinema-accent text-sm font-medium">
                  <Star className="w-4 h-4" />
                  {series.rating}
                </span>
              )}
              <span className="px-3 py-1.5 rounded-lg bg-cinema-elevated text-cinema-silver text-sm border border-cinema-border">
                {series.year === series.latestYear
                  ? series.year
                  : `${series.year} – ${series.latestYear}`}
              </span>
              {seasons.length > 1 && (
                <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cinema-elevated text-cinema-silver text-sm border border-cinema-border">
                  <Layers className="w-3.5 h-3.5" aria-hidden />
                  {seasons.length} temporadas
                </span>
              )}
              <span className="px-3 py-1.5 rounded-lg bg-cinema-elevated text-cinema-silver text-sm border border-cinema-border">
                {series.totalEpisodes} episodios
              </span>
              {extras.length > 0 && (
                <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cinema-elevated text-cinema-silver text-sm border border-cinema-border">
                  <Film className="w-3.5 h-3.5" aria-hidden />
                  {extras.length} {extras.length === 1 ? 'película/OVA' : 'películas/OVAs'}
                </span>
              )}
              <span
                className={cn(
                  'px-3 py-1.5 rounded-lg text-sm font-medium border',
                  series.status === 'ongoing'
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                    : 'bg-cinema-elevated border-cinema-border text-cinema-silver'
                )}
              >
                {series.status === 'ongoing' ? 'En emisión' : 'Finalizado'}
              </span>
            </div>

            <div className="flex flex-wrap gap-2 mb-6">
              {series.genre.map((g) => (
                <span
                  key={g}
                  className="px-3 py-1 rounded-full bg-cinema-accent/15 text-cinema-accent-light text-xs font-medium border border-cinema-accent/20"
                >
                  {g}
                </span>
              ))}
            </div>

            <p className="text-cinema-muted leading-relaxed">
              {activeSeason?.synopsis || series.synopsis}
            </p>
          </ScrollReveal>
        </div>
      </div>

      {series.seasons.length > 1 && (
        <ScrollReveal className="mb-8">
          <h2 className="font-display text-2xl font-semibold tracking-tight text-cinema-chalk mb-4">
            Temporadas
          </h2>
          <div
            className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1"
            role="tablist"
            aria-label="Temporadas"
          >
            {series.seasons.map((season) => {
              const isActive = season._id === activeSeasonId;
              return (
                <button
                  key={season._id}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => setActiveSeasonId(season._id)}
                  className={cn(
                    'shrink-0 flex flex-col items-start gap-0.5 px-4 py-2.5 rounded-lg border text-left transition-all',
                    isActive
                      ? 'bg-cinema-accent text-cinema-chalk border-cinema-accent'
                      : 'bg-cinema-surface text-cinema-silver border-cinema-border hover:text-cinema-chalk hover:border-cinema-accent/40'
                  )}
                >
                  <span className="text-sm font-medium whitespace-nowrap">
                    {season.seasonLabel}
                  </span>
                  <span
                    className={cn(
                      'text-[11px] whitespace-nowrap',
                      isActive ? 'text-cinema-chalk/70' : 'text-cinema-muted'
                    )}
                  >
                    {season.year}
                    {season.episodes > 0 && ` · ${season.episodes} eps`}
                  </span>
                </button>
              );
            })}
          </div>
        </ScrollReveal>
      )}

      <ScrollReveal>
        <div className="flex items-baseline justify-between gap-4 mb-6 flex-wrap">
          <h2 className="font-display text-2xl font-semibold tracking-tight text-cinema-chalk">
            Episodios
          </h2>
          {activeSeason && series.seasons.length > 1 && (
            <p className="text-sm text-cinema-muted">{activeSeason.seasonLabel}</p>
          )}
        </div>

        {loadingEpisodes ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 text-cinema-silver animate-spin" />
          </div>
        ) : episodes.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {episodes.map((ep) => {
              const airDate = formatAirDate(ep.airDate);
              return (
                <button
                  key={ep.number}
                  type="button"
                  onClick={() => {
                    if (!activeSeason) return;
                    router.push(`/anime/watch/${activeSeason._id}/${ep.number}`);
                  }}
                  className="group flex gap-3 p-3 rounded-lg bg-cinema-surface border border-cinema-border hover:border-cinema-accent/50 hover:bg-cinema-elevated transition-all text-left"
                >
                  <div className="relative w-28 aspect-video rounded-lg overflow-hidden bg-cinema-elevated shrink-0">
                    {ep.image ? (
                      <img
                        src={ep.image}
                        alt=""
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Tv className="w-4 h-4 text-cinema-ash" aria-hidden />
                      </div>
                    )}
                    <span className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Play className="w-6 h-6 text-cinema-chalk fill-current" aria-hidden />
                    </span>
                    <span className="absolute bottom-1 left-1 px-1.5 py-0.5 rounded bg-black/80 text-cinema-chalk text-[10px] font-bold">
                      {ep.number}
                    </span>
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-cinema-chalk line-clamp-2 leading-snug group-hover:text-cinema-accent-light transition-colors">
                      {ep.title}
                    </p>
                    <div className="flex items-center gap-2 mt-1 text-[11px] text-cinema-muted">
                      {airDate && (
                        <span className="inline-flex items-center gap-1">
                          <Calendar className="w-3 h-3" aria-hidden />
                          {airDate}
                        </span>
                      )}
                      {ep.runtime && (
                        <span className="inline-flex items-center gap-1">
                          <Clock className="w-3 h-3" aria-hidden />
                          {ep.runtime} min
                        </span>
                      )}
                    </div>
                    {ep.overview && (
                      <p className="text-[11px] text-cinema-muted line-clamp-2 mt-1.5">
                        {ep.overview}
                      </p>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-12">
            <Tv className="w-10 h-10 text-cinema-muted mx-auto mb-3" />
            <p className="text-cinema-muted text-sm">
              {episodeError ?? 'No hay episodios para mostrar.'}
            </p>
          </div>
        )}
      </ScrollReveal>
    </div>
  );
}
