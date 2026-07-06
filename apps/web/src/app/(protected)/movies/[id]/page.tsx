'use client';

import { useQuery } from 'convex/react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Clock, Star, Calendar, Tag, User } from 'lucide-react';
import { api } from '@pelis/convex';
import { Badge, Spinner } from '@pelis/ui/components';

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
  videoUrl?: string;
}

export default function MovieDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const movie = useQuery(api.movies.getById, { id } as any) as Movie | undefined | null;

  if (movie === undefined) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Spinner size="lg" />
      </div>
    );
  }

  if (movie === null) {
    return (
      <div className="container mx-auto px-4 py-20 text-center">
        <h2 className="text-2xl font-bold mb-2">Pel&iacute;cula no encontrada</h2>
        <p className="text-slate-400 mb-6">La pel&iacute;cula que buscas no existe</p>
        <Link href="/movies" className="text-primary-400 hover:text-primary-300">
          &larr; Volver a pel&iacute;culas
        </Link>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <div className="relative h-[400px] md:h-[500px] overflow-hidden">
        <img
          src={movie.image}
          alt={movie.name}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-dark-400 via-dark-400/80 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-dark-400 via-transparent to-transparent" />

        <div className="absolute bottom-0 left-0 right-0 p-8 md:p-16">
          <Link
            href="/movies"
            className="inline-flex items-center gap-2 text-slate-400 hover:text-white mb-4 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Volver
          </Link>
          <div className="container mx-auto">
            <div className="flex flex-wrap gap-2 mb-4">
              <Badge variant="primary">{movie.classification}</Badge>
              <Badge>{movie.genre}</Badge>
              <Badge variant="default">{movie.releaseYear}</Badge>
            </div>
            <h1 className="text-4xl md:text-6xl font-bold mb-4 max-w-2xl">{movie.name}</h1>
            <p className="text-slate-300 text-lg mb-6 max-w-2xl">{movie.synopsis}</p>

            <div className="flex flex-wrap gap-6 text-sm text-slate-400 mb-6">
              <div className="flex items-center gap-1.5">
                <User className="w-4 h-4" />
                <span>{movie.actors}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Tag className="w-4 h-4" />
                <span>{movie.genre}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Calendar className="w-4 h-4" />
                <span>{movie.releaseYear}</span>
              </div>
            </div>

            <button className="bg-primary-600 hover:bg-primary-500 text-white px-8 py-3.5 rounded-xl font-semibold flex items-center gap-2 transition-all hover:scale-105 active:scale-95">
              <Star className="w-5 h-5" fill="currentColor" />
              Reproducir ahora
            </button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="md:col-span-2">
            <h2 className="text-2xl font-bold mb-4">Sinopsis</h2>
            <p className="text-slate-300 leading-relaxed text-lg">{movie.synopsis}</p>
          </div>
          <div className="space-y-6">
            <div className="bg-dark-200 rounded-xl border border-slate-800 p-6">
              <h3 className="font-semibold mb-4">Informaci&oacute;n</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-slate-400">Clasificaci&oacute;n</span>
                  <span className="font-medium">{movie.classification}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">G&eacute;nero</span>
                  <span className="font-medium">{movie.genre}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">A&ntilde;o</span>
                  <span className="font-medium">{movie.releaseYear}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Actores</span>
                  <span className="font-medium text-right max-w-[180px]">{movie.actors}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
