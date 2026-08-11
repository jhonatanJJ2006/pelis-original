'use client';

import Link from 'next/link';
import { Eye, ImageIcon, Monitor, Sparkles, Pencil, Link2, Trash2 } from 'lucide-react';
import { Button } from '@pelis/ui/components';
import { MoviePoster } from '@pelis/ui/features/movie-poster';
import { getAdminMovieDisplayName, isAdminOrphanDisplayName } from '../lib/movie-display';
import { cn } from '@pelis/ui/utils';

export interface AdminMovieListItem {
  _id: string;
  name: string;
  image: string;
  backdropImage?: string;
  token: string;
  genre: string;
  releaseYear: string;
  quality: {
    isOrphanId: boolean;
    isMissingImage: boolean;
    isMissingVideo: boolean;
    isIncomplete: boolean;
    isMissingBackdrop: boolean;
  };
}

interface AdminMovieQualityBadgesProps {
  quality: AdminMovieListItem['quality'];
}

export function AdminMovieQualityBadges({ quality }: AdminMovieQualityBadgesProps) {
  return (
    <div className="flex flex-wrap gap-1">
      {quality.isOrphanId && (
        <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300">
          ID
        </span>
      )}
      {quality.isMissingImage && (
        <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-500/20 text-red-300">
          Sin img
        </span>
      )}
      {quality.isMissingVideo && (
        <span className="text-[10px] px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-300">
          Sin video
        </span>
      )}
      {quality.isIncomplete && (
        <span className="text-[10px] px-2 py-0.5 rounded-full bg-cinema-gold/20 text-cinema-gold">
          Incompleta
        </span>
      )}
      {quality.isMissingBackdrop && !quality.isOrphanId && (
        <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300">
          Sin backdrop
        </span>
      )}
    </div>
  );
}

interface AdminMovieActionsProps {
  movie: AdminMovieListItem;
  deletingId: string | null;
  canEnrich: boolean;
  canPickPoster: boolean;
  canPickBackdrop: boolean;
  onPreview: () => void;
  onPoster: () => void;
  onBackdrop: () => void;
  onEnrich: () => void;
  onMerge: () => void;
  onDelete: () => void;
  compact?: boolean;
}

export function AdminMovieActions({
  movie,
  deletingId,
  canEnrich,
  canPickPoster,
  canPickBackdrop,
  onPreview,
  onPoster,
  onBackdrop,
  onEnrich,
  onMerge,
  onDelete,
  compact = false,
}: AdminMovieActionsProps) {
  return (
    <div
      className={cn(
        'flex items-center gap-1',
        compact ? 'flex-wrap justify-end' : 'justify-end'
      )}
      onClick={(e) => e.stopPropagation()}
    >
      <Button variant="ghost" size="sm" aria-label="Ver película" onClick={onPreview}>
        <Eye className="w-4 h-4" />
      </Button>
      {canPickPoster && (
        <Button variant="ghost" size="sm" aria-label="Poster TMDB" onClick={onPoster}>
          <ImageIcon className="w-4 h-4 text-cinema-violet-light" />
        </Button>
      )}
      {canPickBackdrop && (
        <Button variant="ghost" size="sm" aria-label="Backdrop TMDB" onClick={onBackdrop}>
          <Monitor className="w-4 h-4 text-cyan-400" />
        </Button>
      )}
      {canEnrich && (
        <Button variant="ghost" size="sm" aria-label="Completar desde TMDB" onClick={onEnrich}>
          <Sparkles className="w-4 h-4 text-cinema-gold" />
        </Button>
      )}
      <Link href={`/admin/movies/${movie._id}/edit`}>
        <Button variant="ghost" size="sm" aria-label="Editar">
          <Pencil className="w-4 h-4" />
        </Button>
      </Link>
      <Button variant="ghost" size="sm" aria-label="Enlazar" onClick={onMerge}>
        <Link2 className="w-4 h-4" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        aria-label="Eliminar"
        disabled={deletingId === movie._id}
        onClick={onDelete}
      >
        <Trash2 className="w-4 h-4 text-red-400" />
      </Button>
    </div>
  );
}

interface AdminMovieMobileCardProps {
  movie: AdminMovieListItem;
  deletingId: string | null;
  canEnrich: boolean;
  canPickPoster: boolean;
  canPickBackdrop: boolean;
  onOpen: () => void;
  onPreview: () => void;
  onPoster: () => void;
  onBackdrop: () => void;
  onEnrich: () => void;
  onMerge: () => void;
  onDelete: () => void;
}

export function AdminMovieMobileCard({
  movie,
  deletingId,
  canEnrich,
  canPickPoster,
  canPickBackdrop,
  onOpen,
  onPreview,
  onPoster,
  onBackdrop,
  onEnrich,
  onMerge,
  onDelete,
}: AdminMovieMobileCardProps) {
  const displayName = getAdminMovieDisplayName(movie);

  return (
    <article
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onOpen();
        }
      }}
      className="rounded-2xl border border-cinema-border bg-cinema-surface p-4 transition-colors hover:bg-cinema-elevated/30 cursor-pointer"
    >
      <div className="flex gap-3">
        <div className="w-14 h-20 shrink-0 rounded-lg overflow-hidden bg-cinema-elevated">
          <MoviePoster
            src={movie.image}
            alt={displayName}
            className="w-full h-full object-cover"
          />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h3
                className={cn(
                  'font-medium text-sm leading-snug line-clamp-2',
                  isAdminOrphanDisplayName(movie.name, movie.token)
                    ? 'text-cinema-muted italic'
                    : 'text-white'
                )}
              >
                {displayName}
              </h3>
              <p className="text-xs text-cinema-ash mt-1 truncate">{movie.genre}</p>
            </div>
            <span className="text-xs text-cinema-muted shrink-0">{movie.releaseYear}</span>
          </div>
          <div className="mt-2">
            <AdminMovieQualityBadges quality={movie.quality} />
          </div>
        </div>
      </div>

      <div className="mt-3 pt-3 border-t border-cinema-border/60">
        <AdminMovieActions
          movie={movie}
          deletingId={deletingId}
          canEnrich={canEnrich}
          canPickPoster={canPickPoster}
          canPickBackdrop={canPickBackdrop}
          onPreview={onPreview}
          onPoster={onPoster}
          onBackdrop={onBackdrop}
          onEnrich={onEnrich}
          onMerge={onMerge}
          onDelete={onDelete}
          compact
        />
      </div>
    </article>
  );
}
