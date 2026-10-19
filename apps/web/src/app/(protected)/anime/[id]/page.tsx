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
          <h1 className="font-display text-3xl text-cinema-chalk mb-2">Anime no encontrado</h1>
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

  const heroImage = series.backdropImage || activeSeason?.image || series.image;
  const firstEpisodeHref = activeSeason ? `/anime/watch/${activeSeason._id}/1` : null;
  const yearLabel =
    series.year === series.latestYear
      ? String(series.year)
      : `${series.year} – ${series.latestYear}`;

  return (
    <div className="pb-12">
      <div className="relative overflow-hidden md:h-[640px]">
        <div className="relative h-[52vh] max-h-[460px] md:max-h-none md:absolute md:inset-0 md:h-auto">
          <img src={heroImage} alt="" className="w-full h-full object-cover" />
          <div className="absolute inset-0 hero-gradient-right" />
          <div className="absolute inset-0 hero-gradient-bottom" />
          <div className="absolute inset-0 hero-gradient-accent" />
          <Link
            href="/anime"
            className="absolute top-4 left-4 md:top-6 md:left-6 z-10 inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-cinema-chalk bg-black/40 hover:bg-black/60 backdrop-blur-sm border border-white/10 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" aria-hidden />
            Volver
          </Link>
        </div>

        <div className="relative px-4 py-6 md:absolute md:inset-x-0 md:bottom-0 md:p-14">
          <div className="container mx-auto">
            <div className="flex flex-wrap items-center gap-2 mb-4 text-meta text-cinema-muted">
              <span className="rounded-[4px] border border-cinema-accent/60 px-2 py-0.5 text-label uppercase text-cinema-accent">
                Anime
              </span>
              <span
                className={cn(
                  'rounded-[4px] border px-2 py-0.5 text-label',
                  series.status === 'ongoing'
                    ? 'border-cinema-success/50 text-cinema-success'
                    : 'border-cinema-border text-cinema-chalk'
                )}
              >
                {series.status === 'ongoing' ? 'En emisión' : 'Finalizado'}
              </span>
              {series.rating ? (
                <span className="inline-flex items-center gap-1 text-cinema-accent">
                  <Star className="w-3.5 h-3.5 fill-current" aria-hidden />
                  {series.rating}
                </span>
              ) : null}
              <span>{yearLabel}</span>
              <span aria-hidden>·</span>
              <span>{series.totalEpisodes} episodios</span>
              {seasons.length > 1 && (
                <>
                  <span aria-hidden>·</span>
                  <span className="inline-flex items-center gap-1">
                    <Layers className="w-3.5 h-3.5" aria-hidden />
                    {seasons.length} temporadas
                  </span>
                </>
              )}
              {extras.length > 0 && (
                <>
                  <span aria-hidden>·</span>
                  <span className="inline-flex items-center gap-1">
                    <Film className="w-3.5 h-3.5" aria-hidden />
                    {extras.length} {extras.length === 1 ? 'película/OVA' : 'películas/OVAs'}
                  </span>
                </>
              )}
            </div>
            <h1 className="font-display text-4xl md:text-hero font-semibold tracking-tight text-cinema-chalk max-w-3xl mb-2">
              {series.title}
            </h1>
            {series.alternativeTitle && (
              <p className="text-cinema-silver text-base mb-4">{series.alternativeTitle}</p>
            )}
            <p className="text-cinema-muted text-lg mb-6 max-w-2xl line-clamp-2">
              {activeSeason?.synopsis || series.synopsis}
            </p>
            <div className="flex flex-col sm:flex-row flex-wrap gap-3">
              {firstEpisodeHref && (
                <Link
                  href={firstEpisodeHref}
                  className="btn-base h-11 px-7 bg-cinema-accent hover:bg-cinema-accent-light text-cinema-bg text-xs tracking-[0.08em] inline-flex items-center justify-center gap-2"
                >
                  <Play className="w-5 h-5" fill="currentColor" aria-hidden />
                  Ver episodio 1
                </Link>
              )}
              <a
                href="#episodios"
                className="btn-base h-11 px-5 border border-cinema-border bg-cinema-bg/40 backdrop-blur-sm hover:border-cinema-chalk/50 text-cinema-chalk text-sm inline-flex items-center justify-center gap-2"
              >
                <Tv className="w-5 h-5" aria-hidden />
                Ver episodios
              </a>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-12 space-y-10">
        <ScrollReveal className="max-w-3xl">
          <h2 className="font-display text-2xl tracking-tight text-cinema-chalk mb-4">Sinopsis</h2>
          <p className="text-cinema-muted leading-relaxed text-lg">
            {activeSeason?.synopsis || series.synopsis}
          </p>
        </ScrollReveal>

        <ScrollReveal>
          <div
            id="episodios"
            className="scroll-mt-24 flex flex-col lg:flex-row lg:items-end justify-between gap-4 mb-6 border-b border-cinema-border/60 pb-4"
          >
            <div>
              <p className="text-label uppercase text-cinema-accent mb-1">Catálogo audiovisual</p>
              <h2 className="font-display text-2xl md:text-3xl tracking-tight text-cinema-chalk">
                Episodios y entregas
              </h2>
            </div>
            {series.seasons.length > 1 && (
              <div
                className="flex gap-1 overflow-x-auto -mx-1 px-1"
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
                      title={`${season.year}${season.episodes > 0 ? ` · ${season.episodes} eps` : ''}`}
                      className={cn(
                        'shrink-0 whitespace-nowrap px-4 py-2 text-sm border rounded-[2px] transition-colors',
                        isActive
                          ? 'border-cinema-accent bg-cinema-accent/10 text-cinema-accent'
                          : 'border-transparent text-cinema-silver hover:text-cinema-chalk'
                      )}
                    >
                      {season.seasonLabel}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {loadingEpisodes ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 text-cinema-silver animate-spin" />
            </div>
          ) : episodes.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                    className="group flex gap-4 p-3 rounded-[2px] bg-cinema-surface border border-cinema-border/70 hover:border-cinema-accent/50 transition-colors text-left"
                  >
                    <div className="relative w-36 sm:w-44 aspect-video rounded-[2px] overflow-hidden bg-cinema-elevated shrink-0">
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
                      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-cinema-accent mb-1">
                        Episodio {String(ep.number).padStart(2, '0')}
                      </p>
                      <p className="font-display text-base text-cinema-chalk line-clamp-2 leading-snug group-hover:text-cinema-accent-light transition-colors">
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

        <ScrollReveal>
          <p className="text-label uppercase text-cinema-accent mb-1">
            Créditos y ficha curatorial
          </p>
          <h2 className="font-display text-2xl md:text-3xl tracking-tight text-cinema-chalk mb-6">
            Ficha de la obra
          </h2>
          <dl className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
            {[
              ['Género', series.genre.join(', ')],
              ['Años', yearLabel],
              ['Temporadas', String(seasons.length)],
              ['Episodios', String(series.totalEpisodes)],
              ['Estado', series.status === 'ongoing' ? 'En emisión' : 'Finalizado'],
            ].map(([label, value]) => (
              <div
                key={label}
                className="border border-cinema-border/70 bg-cinema-surface p-4 rounded-[2px]"
              >
                <dt className="text-[10px] uppercase tracking-[0.16em] text-cinema-silver mb-1.5">
                  {label}
                </dt>
                <dd className="text-sm font-medium text-cinema-chalk">{value}</dd>
              </div>
            ))}
          </dl>
        </ScrollReveal>
      </div>
    </div>
  );
}
