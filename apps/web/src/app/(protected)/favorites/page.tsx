'use client';

import { useQuery, useMutation } from 'convex/react';
import Link from 'next/link';
import { Heart, Trash2, Film } from 'lucide-react';
import { api } from '@pelis/convex';
import { useUser } from '@pelis/auth/hooks';
import { MovieCard } from '@pelis/ui/features/movie-card';
import { Spinner, Button } from '@pelis/ui/components';

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

export default function FavoritesPage() {
  const { user } = useUser();
  const movies = (useQuery(
    api.favorites.listByUser,
    user ? { userId: user._id as any } : 'skip'
  ) as Movie[] | undefined) ?? [];

  const isLoading = !user || movies === undefined;

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-20 text-center">
        <Heart className="w-16 h-16 text-slate-600 mx-auto mb-4" />
        <h2 className="text-2xl font-bold mb-2">Inicia sesi&oacute;n</h2>
        <p className="text-slate-400 mb-6">Debes iniciar sesi&oacute;n para ver tus favoritos</p>
        <Link href="/auth/login">
          <Button>Iniciar sesi&oacute;n</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 animate-fade-in">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Mis favoritos</h1>
          <p className="text-slate-400 mt-1">{movies.length} pel&iacute;culas guardadas</p>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Spinner size="lg" />
        </div>
      ) : movies.length === 0 ? (
        <div className="text-center py-20">
          <Heart className="w-16 h-16 text-slate-600 mx-auto mb-4" />
          <h3 className="text-xl font-semibold mb-2">No tienes favoritos</h3>
          <p className="text-slate-400 mb-6">Explora el cat&aacute;logo y guarda tus pel&iacute;culas favoritas</p>
          <Link href="/movies">
            <Button>Explorar pel&iacute;culas</Button>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {movies.map((movie) => (
            <MovieCard key={movie._id} movie={movie} />
          ))}
        </div>
      )}
    </div>
  );
}
