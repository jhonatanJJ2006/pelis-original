'use client';

import { useEffect, useState } from 'react';
import { useMutation, useQuery } from '@pelis/db/client';
import { api } from '@pelis/db/api';
import { toast } from 'sonner';
import { MovieRow } from '@pelis/ui/features/movie-row';
import { ContinueWatchingRow } from '@pelis/ui/features/continue-watching-row';
import { HeroSkeleton } from '@pelis/ui/features/hero-skeleton';
import type { MediaItem } from '@pelis/ui/types';
import { DynamicHero } from './dynamic-hero';

interface ContinueItem {
  _id: string;
  progress: number;
  duration: number;
  movie: MediaItem;
}

interface DesktopHomeProps {
  userId: string;
  heroMovies: MediaItem[] | undefined;
  continueItems: ContinueItem[];
  trending: MediaItem[] | undefined;
  series: MediaItem[] | undefined;
}

interface HeroPick {
  movie: MediaItem;
  playbackSeconds?: number;
}

interface HeroExtras {
  runtimeMinutes: number | null;
  youtubeKey: string | null;
}

const EMPTY_EXTRAS: HeroExtras = { runtimeMinutes: null, youtubeKey: null };

/** Pide duración y tráiler cuando el foco descansa, y cancela la petición si se va. */
function useHeroExtras(id: string | undefined) {
  const [state, setState] = useState<{ id: string; value: HeroExtras } | null>(null);
  useEffect(() => {
    if (!id) return;
    const ac = new AbortController();
    const timer = window.setTimeout(() => {
      void fetch('/api/function/movies.heroExtras', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
        signal: ac.signal,
      })
        .then((res) => (res.ok ? (res.json() as Promise<HeroExtras>) : null))
        .then((value) => setState({ id, value: value ?? EMPTY_EXTRAS }))
        .catch(() => {
          if (!ac.signal.aborted) setState({ id, value: EMPTY_EXTRAS });
        });
    }, 400);
    return () => {
      window.clearTimeout(timer);
      ac.abort();
    };
  }, [id]);
  return state?.id === id ? state.value : undefined;
}

/**
 * Inicio de escritorio: el hero sigue al título enfocado (ratón o teclado).
 * En el móvil se queda el carrusel de siempre.
 */
export function DesktopHome({
  userId,
  heroMovies,
  continueItems,
  trending,
  series,
}: DesktopHomeProps) {
  const movies = useQuery<MediaItem[]>(api.movies.list, { mediaType: 'movie', limit: 18 }) as
    MediaItem[] | undefined;
  const [focused, setFocused] = useState<HeroPick | null>(null);
  const fallback = heroMovies?.[0] ?? trending?.[0] ?? series?.[0] ?? movies?.[0];
  const pick = focused ?? (fallback ? { movie: fallback } : null);
  const movie = pick?.movie;
  const movieId = movie?._id;

  const extrasForThis = useHeroExtras(movieId);

  const [listed, setListed] = useState<{ id: string; on: boolean } | null>(null);
  useEffect(() => {
    if (!movieId) return;
    const ac = new AbortController();
    const timer = window.setTimeout(() => {
      void fetch('/api/function/favorites.check', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, movieId }),
        signal: ac.signal,
      })
        .then((res) => (res.ok ? (res.json() as Promise<boolean>) : false))
        .then((on) => setListed({ id: movieId, on: on === true }))
        .catch(() => undefined);
    }, 350);
    return () => {
      window.clearTimeout(timer);
      ac.abort();
    };
  }, [userId, movieId]);
  const addFavorite = useMutation(api.favorites.add);
  const removeFavorite = useMutation(api.favorites.remove);
  const [override, setOverride] = useState<{ id: string; on: boolean } | null>(null);
  const inList = movieId
    ? override?.id === movieId
      ? override.on
      : listed?.id === movieId && listed.on
    : false;

  const onToggleList = async () => {
    if (!movie) return;
    const next = !inList;
    setOverride({ id: movie._id, on: next });
    try {
      if (next) {
        await addFavorite({ userId: userId as any, movieId: movie._id as any });
        toast.success('Agregado a favoritos');
      } else {
        await removeFavorite({ userId: userId as any, movieId: movie._id as any });
        toast.success('Eliminado de favoritos');
      }
    } catch {
      setOverride({ id: movie._id, on: !next });
      toast.error('Error al actualizar favoritos');
    }
  };

  const onPreview = (item: MediaItem, playbackSeconds?: number) => {
    setFocused({ movie: item, playbackSeconds });
  };

  return (
    <div className="pb-12">
      {movie ? (
        <DynamicHero
          movie={movie}
          playbackSeconds={pick?.playbackSeconds}
          runtimeMinutes={extrasForThis?.runtimeMinutes}
          youtubeKey={extrasForThis?.youtubeKey}
          extrasReady={extrasForThis !== undefined}
          inList={inList}
          onToggleList={() => void onToggleList()}
        />
      ) : heroMovies === undefined ? (
        <HeroSkeleton />
      ) : (
        <section className="flex h-[40vh] items-center px-4" aria-label="Destacado">
          <p className="font-display text-3xl text-cinema-chalk">Nada destacado por ahora</p>
        </section>
      )}

      <div className="container mx-auto space-y-12 px-4 py-10">
        {continueItems.length > 0 && (
          <ContinueWatchingRow
            items={continueItems}
            onPreview={(item, duration) => onPreview(item, duration)}
            activeId={movie?._id}
          />
        )}
        <MovieRow
          title="Populares"
          subtitle="Tendencias del cine"
          movies={trending}
          isLoading={trending === undefined}
          href="/movies"
          onPreview={(item) => onPreview(item)}
          activeId={movie?._id}
        />
        <MovieRow
          title="Películas"
          movies={movies}
          isLoading={movies === undefined}
          href="/movies"
          onPreview={(item) => onPreview(item)}
          activeId={movie?._id}
        />
        <MovieRow
          title="Series"
          movies={series}
          isLoading={series === undefined}
          href="/series"
          linkLabel="Ver series"
          onPreview={(item) => onPreview(item)}
          activeId={movie?._id}
        />
      </div>
    </div>
  );
}
