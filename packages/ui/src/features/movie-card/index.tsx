import Link from 'next/link';
import { Heart, Play } from 'lucide-react';
import { Badge } from '../../shared/ui/badge';

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

interface MovieCardProps {
  movie: Movie;
}

export function MovieCard({ movie }: MovieCardProps) {
  return (
    <Link href={`/movies/${movie._id}`} className="group">
      <div className="bg-dark-200 rounded-xl border border-slate-800 overflow-hidden transition-all duration-300 hover:border-primary-500/50 hover:shadow-lg hover:shadow-primary-500/10 group-hover:scale-105">
        <div className="relative aspect-[2/3] overflow-hidden">
          <img
            src={movie.image}
            alt={movie.name}
            className="w-full h-full object-cover"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-center pb-4">
            <div className="flex items-center gap-2">
              <button className="bg-primary-600 hover:bg-primary-500 p-2 rounded-full transition-colors">
                <Play className="w-5 h-5" fill="currentColor" />
              </button>
              <button
                onClick={(e) => {
                  e.preventDefault();
                }}
                className="bg-dark-100/80 hover:bg-dark-100 p-2 rounded-full transition-colors"
              >
                <Heart className="w-5 h-5" />
              </button>
            </div>
          </div>
          <div className="absolute top-2 right-2">
            <Badge variant="primary" className="text-xs">
              {movie.classification}
            </Badge>
          </div>
        </div>
        <div className="p-3">
          <h3 className="font-medium text-sm truncate mb-1">{movie.name}</h3>
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>{movie.genre}</span>
            <span>{movie.releaseYear}</span>
          </div>
        </div>
      </div>
    </Link>
  );
}
