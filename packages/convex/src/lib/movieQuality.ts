import type { Doc } from '../_generated/dataModel';
import { PLACEHOLDER_IMAGE } from './resolveMovieImage';

export type MovieQualityFilter =
  | 'all'
  | 'orphan_ids'
  | 'missing_image'
  | 'missing_video'
  | 'incomplete';

export interface MovieQualityFlags {
  isOrphanId: boolean;
  isMissingImage: boolean;
  isMissingVideo: boolean;
  isIncomplete: boolean;
}

const ORPHAN_ID_RE = /^[a-f0-9]{6,}$/i;

export function isOrphanIdName(name: string, token?: string): boolean {
  const trimmed = name.trim();
  if (!trimmed) return true;
  if (ORPHAN_ID_RE.test(trimmed)) return true;
  if (token && trimmed === token && !trimmed.includes(' ')) return true;
  return false;
}

export function isMissingImage(image: string): boolean {
  if (!image || image.trim() === '') return true;
  if (image === PLACEHOLDER_IMAGE) return true;
  if (image.endsWith('/placeholder.webp')) return true;
  return false;
}

export function isMissingVideo(videoUrl?: string): boolean {
  return !videoUrl || videoUrl.trim() === '';
}

export function isIncompleteMovie(movie: Pick<Doc<'movies'>, 'synopsis' | 'actors' | 'classification' | 'genre'>): boolean {
  const synopsis = movie.synopsis?.trim() ?? '';
  const actors = movie.actors?.trim() ?? '';
  const classification = movie.classification?.trim() ?? '';
  const genre = movie.genre?.trim() ?? '';

  return synopsis.length < 10 || !actors || !classification || !genre;
}

export function getMovieQualityFlags(
  movie: Pick<Doc<'movies'>, 'name' | 'token' | 'image' | 'videoUrl' | 'synopsis' | 'actors' | 'classification' | 'genre'>
): MovieQualityFlags {
  return {
    isOrphanId: isOrphanIdName(movie.name, movie.token),
    isMissingImage: isMissingImage(movie.image),
    isMissingVideo: isMissingVideo(movie.videoUrl),
    isIncomplete: isIncompleteMovie(movie),
  };
}

export function matchesQualityFilter(
  movie: Pick<Doc<'movies'>, 'name' | 'token' | 'image' | 'videoUrl' | 'synopsis' | 'actors' | 'classification' | 'genre'>,
  filter: MovieQualityFilter
): boolean {
  if (filter === 'all') return true;

  const flags = getMovieQualityFlags(movie);

  switch (filter) {
    case 'orphan_ids':
      return flags.isOrphanId;
    case 'missing_image':
      return flags.isMissingImage;
    case 'missing_video':
      return flags.isMissingVideo;
    case 'incomplete':
      return flags.isIncomplete;
    default:
      return true;
  }
}
