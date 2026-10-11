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

function StatusChip({
  tone,
  children,
}: {
  tone: 'ok' | 'warn' | 'danger' | 'info';
  children: React.ReactNode;
}) {
  const tones = {
    ok: 'border-cinema-success/40 bg-cinema-success/10 text-cinema-success',
    warn: 'border-cinema-accent/40 bg-cinema-accent/10 text-cinema-accent',
    danger: 'border-cinema-danger/60 bg-cinema-danger/15 text-cinema-danger-light',
    info: 'border-cinema-border bg-cinema-elevated text-cinema-muted',
  } as const;
  const dots = {
    ok: 'bg-cinema-success',
    warn: 'bg-cinema-accent',
    danger: 'bg-cinema-danger-light',
    info: 'bg-cinema-ash',
  } as const;
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em]',
        tones[tone]
      )}
    >
      <span className={cn('h-1.5 w-1.5 rounded-full', dots[tone])} aria-hidden />
      {children}
    </span>
  );
}

export function AdminMovieQualityBadges({ quality }: AdminMovieQualityBadgesProps) {
  const clean =
    !quality.isOrphanId &&
    !quality.isMissingImage &&
    !quality.isMissingVideo &&
    !quality.isIncomplete &&
    !quality.isMissingBackdrop;
  return (
    <div className="flex flex-wrap gap-1">
      {clean && <StatusChip tone="ok">Activo</StatusChip>}
      {quality.isMissingVideo && <StatusChip tone="danger">Sin video</StatusChip>}
      {quality.isOrphanId && <StatusChip tone="warn">ID huérfano</StatusChip>}
      {quality.isMissingImage && <StatusChip tone="danger">Sin imagen</StatusChip>}
      {quality.isIncomplete && <StatusChip tone="warn">Incompleta</StatusChip>}
      {quality.isMissingBackdrop && !quality.isOrphanId && (
        <StatusChip tone="info">Sin backdrop</StatusChip>
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
      className={cn('flex items-center gap-1', compact ? 'flex-wrap justify-end' : 'justify-end')}
      onClick={(e) => e.stopPropagation()}
    >
      <Button variant="ghost" size="sm" aria-label="Ver película" onClick={onPreview}>
        <Eye className="w-4 h-4" />
      </Button>
      {canPickPoster && (
        <Button variant="ghost" size="sm" aria-label="Poster TMDB" onClick={onPoster}>
          <ImageIcon className="w-4 h-4 text-cinema-accent-light" />
        </Button>
      )}
      {canPickBackdrop && (
        <Button variant="ghost" size="sm" aria-label="Backdrop TMDB" onClick={onBackdrop}>
          <Monitor className="w-4 h-4 text-cinema-muted" />
        </Button>
      )}
      {canEnrich && (
        <Button variant="ghost" size="sm" aria-label="Completar desde TMDB" onClick={onEnrich}>
          <Sparkles className="w-4 h-4 text-cinema-accent" />
        </Button>
      )}
      <Button variant="ghost" size="sm" aria-label="Enlazar" onClick={onMerge}>
        <Link2 className="w-4 h-4" />
      </Button>
      <Link
        href={`/admin/movies/${movie._id}/edit`}
        aria-label="Editar"
        className="inline-flex h-8 items-center gap-1.5 rounded-[6px] border border-cinema-accent/40 px-2.5 text-xs font-medium text-cinema-accent hover:bg-cinema-accent/10 transition-colors"
      >
        <Pencil className="w-3.5 h-3.5" />
        {!compact && <span>Editar</span>}
      </Link>
      <button
        type="button"
        aria-label="Eliminar"
        disabled={deletingId === movie._id}
        onClick={onDelete}
        className="inline-flex h-8 items-center gap-1.5 rounded-[6px] border border-cinema-danger/60 bg-cinema-danger/10 px-2.5 text-xs font-medium text-cinema-danger-light hover:bg-cinema-danger/25 transition-colors disabled:opacity-50"
      >
        <Trash2 className="w-3.5 h-3.5" />
        {!compact && <span>Eliminar</span>}
      </button>
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
      className="rounded-lg border border-cinema-border bg-cinema-surface p-4 transition-colors hover:bg-cinema-elevated/30 cursor-pointer"
    >
      <div className="flex gap-3">
        <div className="w-14 h-20 shrink-0 rounded-lg overflow-hidden bg-cinema-elevated">
          <MoviePoster src={movie.image} alt={displayName} className="w-full h-full object-cover" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h3
                className={cn(
                  'font-medium text-sm leading-snug line-clamp-2',
                  isAdminOrphanDisplayName(movie.name, movie.token)
                    ? 'text-cinema-muted italic'
                    : 'text-cinema-chalk'
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
