'use client';

import { useQuery } from 'convex/react';
import Link from 'next/link';
import { History, Trash2 } from 'lucide-react';
import { api } from '@pelis/convex';
import { useUser } from '@pelis/auth/hooks';
import { MovieCard } from '@pelis/ui/features/movie-card';
import { Spinner, Button } from '@pelis/ui/components';
import { formatDate, getProgressPercentage } from '@pelis/ui/utils';

interface HistoryItem {
  _id: string;
  userId: string;
  movieId: string;
  progress: number;
  duration: number;
  lastWatched: number;
  movie: Movie | null;
}

interface Movie {
  _id: string;
  name: string;
  image: string;
  synopsis: string;
  genre: string;
  token: string;
  actors: string;
  classification: string;
  releaseYear: string;
}

export default function HistoryPage() {
  const { user } = useUser();
  const history = (useQuery(
    api.history.listByUser,
    user ? { userId: user._id as any } : 'skip'
  ) as HistoryItem[] | undefined) ?? [];

  const isLoading = !user || history === undefined;

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-20 text-center">
        <History className="w-16 h-16 text-slate-600 mx-auto mb-4" />
        <h2 className="text-2xl font-bold mb-2">Inicia sesi&oacute;n</h2>
        <p className="text-slate-400 mb-6">Debes iniciar sesi&oacute;n para ver tu historial</p>
        <Link href="/auth/login">
          <Button>Iniciar sesi&oacute;n</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 animate-fade-in">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Historial</h1>
        <p className="text-slate-400 mt-1">{history.length} pel&iacute;culas vistas</p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Spinner size="lg" />
        </div>
      ) : history.length === 0 ? (
        <div className="text-center py-20">
          <History className="w-16 h-16 text-slate-600 mx-auto mb-4" />
          <h3 className="text-xl font-semibold mb-2">No hay historial</h3>
          <p className="text-slate-400 mb-6">Comienza a ver pel&iacute;culas para ver tu historial aqu&iacute;</p>
          <Link href="/movies">
            <Button>Explorar pel&iacute;culas</Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {history.map((item) => (
            <Link
              key={item._id}
              href={`/movies/${item.movieId}`}
              className="flex items-center gap-4 bg-dark-200 rounded-xl border border-slate-800 p-4 hover:border-primary-500/30 transition-all group"
            >
              {item.movie ? (
                <img
                  src={item.movie.image}
                  alt={item.movie.name}
                  className="w-16 h-24 rounded-lg object-cover"
                />
              ) : (
                <div className="w-16 h-24 rounded-lg bg-dark-100 flex items-center justify-center">
                  <History className="w-6 h-6 text-slate-600" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <h3 className="font-medium truncate group-hover:text-primary-400 transition-colors">
                  {item.movie?.name ?? 'Pel&iacute;cula eliminada'}
                </h3>
                <div className="flex items-center gap-3 text-sm text-slate-400 mt-1">
                  <span>{formatDate(item.lastWatched)}</span>
                </div>
                <div className="mt-2 h-1.5 bg-dark-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary-500 rounded-full transition-all"
                    style={{
                      width: `${getProgressPercentage(item.progress, item.duration)}%`,
                    }}
                  />
                </div>
              </div>
              <div className="text-sm text-slate-400">
                {Math.round(getProgressPercentage(item.progress, item.duration))}%
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
