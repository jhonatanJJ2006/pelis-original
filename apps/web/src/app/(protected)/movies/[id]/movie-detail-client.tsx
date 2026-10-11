'use client';

import { useQuery, useQueryResult, useMutation } from '@pelis/db/client';
import { useParams, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Calendar, Crown, Heart, Play, Tag, User } from 'lucide-react';
import { api } from '@pelis/db/api';
import { hasActivePlan, useUser } from '@pelis/auth/hooks';
import { MovieDetailSkeleton } from '@pelis/ui/features/movie-detail-skeleton';
import { Badge, Skeleton } from '@pelis/ui/components';
import { VideoPlayer } from '@pelis/ui/features/video-player';
import { MoviePoster } from '@pelis/ui/features/movie-poster';
import { MovieRow } from '@pelis/ui/features/movie-row';
import { EmptyState, ErrorState } from '@pelis/ui/features/empty-state';
import { ScrollReveal } from '@pelis/ui/features/scroll-reveal';
import { toast } from 'sonner';
import { cn } from '@pelis/ui/utils';
import type { MediaItem } from '@pelis/ui/types';
import { useResolvedVideoUrl } from '@/hooks/use-resolved-video-url';

interface MovieDetailPageClientProps {
  preloaded: {
    movie: { data: MediaItem | null };
    related?: { data: MediaItem[] };
  };
}

export default function MovieDetailPageClient({ preloaded }: MovieDetailPageClientProps) {
  const params = useParams();
  const searchParams = useSearchParams();
  const { user } = useUser();
  const id = params.id as string;
  const shouldPlay = searchParams.get('play') === 'true';

  const preloadedMovie = preloaded?.movie?.data;
  const preloadedRelated = preloaded?.related?.data;

  const {
    data: movie,
    error: movieError,
    refetch,
  } = useQueryResult<MediaItem | null>(api.movies.getById, { id } as any);
  const resolvedMovie = movie ?? preloadedMovie;
  const related = useQuery(
    api.movies.getByGenre,
    resolvedMovie ? { genre: resolvedMovie.genre, limit: 12 } : 'skip'
  ) as MediaItem[] | undefined;
  const resolvedRelated = related ?? preloadedRelated;
  const addFavorite = useMutation(api.favorites.add);
  const removeFavorite = useMutation(api.favorites.remove);
  const isFavorited = useQuery<boolean>(
    api.favorites.check,
    user && resolvedMovie ? { userId: user._id as any, movieId: resolvedMovie._id as any } : 'skip'
  );

  const { resolvedUrl, loading: resolvingVideo } = useResolvedVideoUrl(
    resolvedMovie?.videoUrl,
    resolvedMovie?.token
  );

  const handleFavorite = async () => {
    if (!user || !resolvedMovie) {
      toast.error('Inicia sesión para guardar favoritos');
      return;
    }
    try {
      if (isFavorited) {
        await removeFavorite({ userId: user._id as any, movieId: resolvedMovie._id as any });
        toast.success('Eliminado de favoritos');
      } else {
        await addFavorite({ userId: user._id as any, movieId: resolvedMovie._id as any });
        toast.success('Agregado a favoritos');
      }
    } catch {
      toast.error('Error al actualizar favoritos');
    }
  };

  if (resolvedMovie === undefined) {
    if (movieError) {
      return (
        <ErrorState
          title="No se pudo cargar este título"
          description="Revisa tu conexión e inténtalo de nuevo."
          onRetry={refetch}
        />
      );
    }
    return <MovieDetailSkeleton />;
  }

  if (resolvedMovie === null) {
    return (
      <EmptyState
        icon={Play}
        title="No encontrado"
        description="Este título no existe en el catálogo."
        actionLabel="Volver al catálogo"
        actionHref="/movies"
      />
    );
  }

  const isSeries = resolvedMovie.mediaType === 'series';
  const relatedFiltered = (resolvedRelated ?? []).filter((m) => m._id !== resolvedMovie._id);
  const entitled = hasActivePlan(user);
  const heroImage = resolvedMovie.backdropImage ?? resolvedMovie.image;

  return (
    <div className="pb-12">
      <div className="relative overflow-hidden md:h-[520px]">
        <div className="relative h-64 md:absolute md:inset-0 md:h-auto">
          <MoviePoster
            src={heroImage}
            alt=""
            className="w-full h-full object-cover"
            loading="eager"
            fetchPriority="high"
          />
          <div className="absolute inset-0 hero-gradient-right" />
          <div className="absolute inset-0 hero-gradient-bottom" />
          <div className="absolute inset-0 hero-gradient-accent" />

          <Link
            href={isSeries ? '/series' : '/movies'}
            className="absolute top-4 left-4 md:top-6 md:left-6 z-10 inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-cinema-chalk bg-black/40 hover:bg-black/60 backdrop-blur-sm border border-white/10 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" aria-hidden />
            Volver
          </Link>
        </div>

        <div className="relative px-4 py-6 md:absolute md:inset-x-0 md:bottom-0 md:p-14">
          <div className="container mx-auto">
            <div className="flex flex-wrap gap-2 mb-4">
              <Badge variant="primary">{resolvedMovie.classification}</Badge>
              <Badge variant="violet">{resolvedMovie.genre}</Badge>
              <Badge>{resolvedMovie.releaseYear}</Badge>
              {isSeries && resolvedMovie.episodes && (
                <Badge variant="warning" className="bg-cinema-accent/90 text-cinema-bg border-0">
                  {resolvedMovie.episodes} episodios
                </Badge>
              )}
            </div>
            <h1 className="font-display text-4xl md:text-6xl font-semibold tracking-tight text-cinema-chalk max-w-3xl mb-4">
              {resolvedMovie.name}
            </h1>
            <p className="text-cinema-muted text-lg mb-6 max-w-2xl line-clamp-2">
              {resolvedMovie.synopsis}
            </p>

            <div className="flex flex-wrap gap-4 md:gap-6 text-sm text-cinema-silver mb-8">
              <div className="flex min-w-0 max-w-full items-start gap-1.5">
                <User className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                <span className="min-w-0 break-words">{resolvedMovie.actors}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Tag className="w-4 h-4" aria-hidden />
                <span>{resolvedMovie.genre}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Calendar className="w-4 h-4" aria-hidden />
                <span>{resolvedMovie.releaseYear}</span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row flex-wrap gap-3">
              <button
                type="button"
                onClick={() => {
                  if (!entitled) {
                    toast.error('Necesitas un plan para reproducir', {
                      action: {
                        label: 'Ver planes',
                        onClick: () => (window.location.href = '/subscribe'),
                      },
                    });
                  } else {
                    document.getElementById('player')?.scrollIntoView({ behavior: 'smooth' });
                  }
                }}
                className="btn-primary-glow inline-flex items-center gap-2"
              >
                <Play className="w-5 h-5" fill="currentColor" aria-hidden />
                Reproducir
              </button>
              <button
                type="button"
                onClick={handleFavorite}
                className={cn(
                  'btn-secondary inline-flex items-center gap-2',
                  isFavorited && 'border-cinema-accent/50 text-cinema-accent-light'
                )}
                aria-pressed={isFavorited ?? false}
              >
                <Heart className={cn('w-5 h-5', isFavorited && 'fill-current')} aria-hidden />
                {isFavorited ? 'En favoritos' : 'Agregar a favoritos'}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-12 space-y-12">
        <ScrollReveal as="section" id="player">
          <h2 className="font-display text-2xl font-semibold tracking-tight text-cinema-chalk mb-6">
            Reproductor
          </h2>
          {!user ? (
            <div className="aspect-video rounded-lg card-feature border border-cinema-accent/20 flex flex-col items-center justify-center gap-4 p-8">
              <Play className="w-12 h-12 text-cinema-muted/40" aria-hidden />
              <p className="text-cinema-muted text-center max-w-md">
                Inicia sesión para reproducir y guardar tu progreso
              </p>
              <Link href="/login" className="btn-primary">
                Iniciar sesión
              </Link>
            </div>
          ) : !entitled ? (
            <div className="aspect-video rounded-lg card-feature border border-cinema-accent/20 flex flex-col items-center justify-center gap-4 p-8">
              <Crown className="w-12 h-12 text-cinema-accent/40" aria-hidden />
              <p className="text-cinema-muted text-center max-w-md">
                Necesitas un plan activo para reproducir este contenido
              </p>
              <Link href="/subscribe" className="btn-primary-glow inline-flex items-center gap-2">
                <Crown className="w-4 h-4" aria-hidden />
                Ver planes
              </Link>
            </div>
          ) : resolvingVideo ? (
            <Skeleton className="aspect-video w-full rounded-lg" />
          ) : resolvedUrl ? (
            <VideoPlayer
              videoUrl={resolvedUrl}
              poster={heroImage}
              title={resolvedMovie.name}
              userId={user._id}
              movieId={resolvedMovie._id}
              autoPlay={shouldPlay}
            />
          ) : (
            <div className="aspect-video rounded-lg card-feature border border-cinema-border flex items-center justify-center p-8">
              <p className="text-cinema-muted text-center">
                No hay video disponible para esta película en el servidor.
              </p>
            </div>
          )}
        </ScrollReveal>

        <ScrollReveal className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          <div className="lg:col-span-2">
            <h2 className="font-display text-2xl font-semibold tracking-tight text-cinema-chalk mb-4">
              Sinopsis
            </h2>
            <p className="text-cinema-muted leading-relaxed text-lg">{resolvedMovie.synopsis}</p>
          </div>
          <div className="card-feature p-6 h-fit">
            <h3 className="font-display text-lg font-semibold tracking-tight text-cinema-chalk mb-5">
              Detalles
            </h3>
            <dl className="space-y-4 text-sm">
              {[
                ['Clasificación', resolvedMovie.classification],
                ['Género', resolvedMovie.genre],
                ['Año', resolvedMovie.releaseYear],
                ['Actores', resolvedMovie.actors],
                ...(isSeries && resolvedMovie.episodes
                  ? [['Episodios', String(resolvedMovie.episodes)]]
                  : []),
              ].map(([label, value]) => (
                <div
                  key={label}
                  className="flex justify-between gap-4 border-b border-cinema-border/50 pb-3 last:border-0"
                >
                  <dt className="text-cinema-silver">{label}</dt>
                  <dd className="font-medium text-right text-cinema-chalk">{value}</dd>
                </div>
              ))}
            </dl>
          </div>
        </ScrollReveal>

        {relatedFiltered.length > 0 && (
          <MovieRow
            title={`Más de ${resolvedMovie.genre}`}
            movies={relatedFiltered}
            href={`/movies?genre=${encodeURIComponent(resolvedMovie.genre)}`}
          />
        )}
      </div>
    </div>
  );
}
