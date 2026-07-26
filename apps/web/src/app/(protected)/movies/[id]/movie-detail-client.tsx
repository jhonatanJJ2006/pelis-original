'use client';

import { useQuery, useMutation } from 'convex/react';
import { useParams, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Calendar, Crown, Heart, Play, Tag, User } from 'lucide-react';
import { api } from '@pelis/convex';
import { useUser } from '@pelis/auth/hooks';
import { Badge, Spinner } from '@pelis/ui/components';
import { VideoPlayer } from '@pelis/ui/features/video-player';
import { MoviePoster } from '@pelis/ui/features/movie-poster';
import { MovieRow } from '@pelis/ui/features/movie-row';
import { EmptyState } from '@pelis/ui/features/empty-state';
import { ScrollReveal } from '@pelis/ui/features/scroll-reveal';
import { toast } from 'sonner';
import { cn } from '@pelis/ui/utils';
import type { MediaItem } from '@pelis/ui/types';

export default function MovieDetailPageClient() {
  const params = useParams();
  const searchParams = useSearchParams();
  const { user } = useUser();
  const id = params.id as string;
  const shouldPlay = searchParams.get('play') === 'true';

  const movie = useQuery(api.movies.getById, { id } as any) as MediaItem | undefined | null;
  const related = useQuery(
    api.movies.getByGenre,
    movie ? { genre: movie.genre, limit: 12 } : 'skip'
  ) as MediaItem[] | undefined;
  const addFavorite = useMutation(api.favorites.add);
  const removeFavorite = useMutation(api.favorites.remove);
  const isFavorited = useQuery(
    api.favorites.check,
    user && movie ? { userId: user._id as any, movieId: movie._id as any } : 'skip'
  );

  const handleFavorite = async () => {
    if (!user || !movie) {
      toast.error('Inicia sesión para guardar favoritos');
      return;
    }
    try {
      if (isFavorited) {
        await removeFavorite({ userId: user._id as any, movieId: movie._id as any });
        toast.success('Eliminado de favoritos');
      } else {
        await addFavorite({ userId: user._id as any, movieId: movie._id as any });
        toast.success('Agregado a favoritos');
      }
    } catch {
      toast.error('Error al actualizar favoritos');
    }
  };

  if (movie === undefined) {
    return (
      <div
        className="flex items-center justify-center min-h-[60vh]"
        role="status"
        aria-label="Cargando"
      >
        <Spinner size="lg" />
      </div>
    );
  }

  if (movie === null) {
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

  const isSeries = movie.mediaType === 'series';
  const relatedFiltered = (related ?? []).filter((m) => m._id !== movie._id);
  const hasActivePlan = !!(user?.planExpiresAt && user.planExpiresAt > Date.now());

  return (
    <div className="pb-12">
      <div className="relative h-[420px] md:h-[520px] overflow-hidden">
        <MoviePoster
          src={movie.image}
          alt=""
          className="w-full h-full object-cover"
          loading="eager"
        />
        <div className="absolute inset-0 hero-gradient-right" />
        <div className="absolute inset-0 hero-gradient-bottom" />
        <div className="absolute inset-0 hero-gradient-accent" />

        <div className="absolute bottom-0 left-0 right-0 p-8 md:p-14">
          <Link
            href={isSeries ? '/series' : '/movies'}
            className="inline-flex items-center gap-2 text-cinema-silver hover:text-white mb-6 transition-colors text-sm"
          >
            <ArrowLeft className="w-4 h-4" aria-hidden />
            Volver
          </Link>
          <div className="container mx-auto">
            <div className="flex flex-wrap gap-2 mb-4">
              <Badge variant="primary">{movie.classification}</Badge>
              <Badge variant="violet">{movie.genre}</Badge>
              <Badge>{movie.releaseYear}</Badge>
              {isSeries && movie.episodes && (
                <Badge variant="warning" className="bg-cinema-gold/90 text-black border-0">
                  {movie.episodes} episodios
                </Badge>
              )}
            </div>
            <h1 className="font-display text-4xl md:text-6xl tracking-wide text-white uppercase max-w-3xl mb-4">
              {movie.name}
            </h1>
            <p className="text-cinema-muted text-lg mb-6 max-w-2xl line-clamp-2">
              {movie.synopsis}
            </p>

            <div className="flex flex-wrap gap-4 md:gap-6 text-sm text-cinema-silver mb-8">
              <div className="flex items-center gap-1.5">
                <User className="w-4 h-4" aria-hidden />
                <span>{movie.actors}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Tag className="w-4 h-4" aria-hidden />
                <span>{movie.genre}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Calendar className="w-4 h-4" aria-hidden />
                <span>{movie.releaseYear}</span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row flex-wrap gap-3">
              <button
                type="button"
                onClick={() => {
                  if (!hasActivePlan) {
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
          <h2 className="font-display text-2xl tracking-wide text-white uppercase mb-6">
            Reproductor
          </h2>
          {!user ? (
            <div className="aspect-video rounded-2xl card-feature border border-cinema-violet/20 flex flex-col items-center justify-center gap-4 p-8">
              <Play className="w-12 h-12 text-cinema-muted/40" aria-hidden />
              <p className="text-cinema-muted text-center max-w-md">
                Inicia sesión para reproducir y guardar tu progreso
              </p>
              <Link href="/login" className="btn-primary">
                Iniciar sesión
              </Link>
            </div>
          ) : !hasActivePlan ? (
            <div className="aspect-video rounded-2xl card-feature border border-cinema-gold/20 flex flex-col items-center justify-center gap-4 p-8">
              <Crown className="w-12 h-12 text-cinema-gold/40" aria-hidden />
              <p className="text-cinema-muted text-center max-w-md">
                Necesitas un plan activo para reproducir este contenido
              </p>
              <Link href="/subscribe" className="btn-primary-glow inline-flex items-center gap-2">
                <Crown className="w-4 h-4" aria-hidden />
                Ver planes
              </Link>
            </div>
          ) : (
            <VideoPlayer
              videoUrl={movie.videoUrl}
              poster={movie.image}
              title={movie.name}
              userId={user._id}
              movieId={movie._id}
              autoPlay={shouldPlay}
            />
          )}
        </ScrollReveal>

        <ScrollReveal className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          <div className="lg:col-span-2">
            <h2 className="font-display text-2xl tracking-wide text-white uppercase mb-4">
              Sinopsis
            </h2>
            <p className="text-cinema-muted leading-relaxed text-lg">{movie.synopsis}</p>
          </div>
          <div className="card-feature p-6 h-fit">
            <h3 className="font-display text-lg tracking-wide text-white uppercase mb-5">
              Detalles
            </h3>
            <dl className="space-y-4 text-sm">
              {[
                ['Clasificación', movie.classification],
                ['Género', movie.genre],
                ['Año', movie.releaseYear],
                ['Actores', movie.actors],
                ...(isSeries && movie.episodes ? [['Episodios', String(movie.episodes)]] : []),
              ].map(([label, value]) => (
                <div
                  key={label}
                  className="flex justify-between gap-4 border-b border-cinema-border/50 pb-3 last:border-0"
                >
                  <dt className="text-cinema-silver">{label}</dt>
                  <dd className="font-medium text-right text-white">{value}</dd>
                </div>
              ))}
            </dl>
          </div>
        </ScrollReveal>

        {relatedFiltered.length > 0 && (
          <MovieRow
            title={`Más de ${movie.genre}`}
            movies={relatedFiltered}
            href={`/movies?genre=${encodeURIComponent(movie.genre)}`}
          />
        )}
      </div>
    </div>
  );
}
