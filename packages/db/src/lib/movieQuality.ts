import { PLACEHOLDER_IMAGE } from './resolveMovieImage';

const ORPHAN_ID_RE = /^[a-f0-9]{6,}$/i;
const LEGACY_ORPHAN_RE = /^ok(-ru-\d+)?$/i;
const DOCUMENT_ID_RE = /^document[-_]\d+$/i;

export function isOrphanIdName(name: string, _token?: string): boolean {
  const trimmed = name.trim();
  if (!trimmed) return true;
  if (ORPHAN_ID_RE.test(trimmed)) return true;
  if (LEGACY_ORPHAN_RE.test(trimmed)) return true;
  if (DOCUMENT_ID_RE.test(trimmed)) return true;
  return false;
}

export function hasValidMovieTitle(name: string, token?: string): boolean {
  return !isOrphanIdName(name, token);
}

export function needsPosterWithValidTitle(movie: {
  name: string;
  token: string;
  image: string;
  videoUrl?: string | null;
}): boolean {
  return (
    isMissingImage(movie.image) &&
    !isMissingVideo(movie.videoUrl) &&
    hasValidMovieTitle(movie.name, movie.token)
  );
}

export function isMissingImage(image: string): boolean {
  if (!image || image.trim() === '') return true;
  if (image === PLACEHOLDER_IMAGE) return true;
  if (image.endsWith('/placeholder.webp')) return true;
  return false;
}

export function isMissingVideo(videoUrl?: string | null): boolean {
  return !videoUrl || videoUrl.trim() === '';
}

/** Playable if videoUrl is set OR an on-disk HLS manifest exists for the token. */
export function hasPlayableVideo(
  videoUrl: string | null | undefined,
  hasManifest: boolean,
): boolean {
  return !isMissingVideo(videoUrl) || hasManifest;
}

/** Missing video for admin/catalog = no videoUrl and no manifest. */
export function isMissingPlayableVideo(
  videoUrl: string | null | undefined,
  hasManifest: boolean,
): boolean {
  return !hasPlayableVideo(videoUrl, hasManifest);
}

export function isIncompleteMovie(movie: {
  synopsis?: string | null;
  actors?: string | null;
  classification?: string | null;
  genre?: string | null;
}): boolean {
  const synopsis = movie.synopsis?.trim() ?? '';
  const actors = movie.actors?.trim() ?? '';
  const classification = movie.classification?.trim() ?? '';
  const genre = movie.genre?.trim() ?? '';
  return synopsis.length < 10 || !actors || !classification || !genre;
}

export function isMissingBackdrop(backdropImage?: string | null): boolean {
  if (!backdropImage || backdropImage.trim() === '') return true;
  // Backdrops legacy `/peliculas/*-backdrop.webp` no existen en disco (404).
  if (backdropImage.startsWith('/peliculas/')) return true;
  return false;
}

export interface MovieQualityFlags {
  isOrphanId: boolean;
  isMissingImage: boolean;
  isMissingVideo: boolean;
  isIncomplete: boolean;
  isMissingBackdrop: boolean;
}

export function getMovieQualityFlags(movie: {
  name: string;
  token: string;
  image: string;
  videoUrl?: string | null;
  synopsis?: string | null;
  actors?: string | null;
  classification?: string | null;
  genre?: string | null;
  backdropImage?: string | null;
  /** When provided, refine isMissingVideo with on-disk HLS presence. */
  hasManifest?: boolean;
}): MovieQualityFlags {
  return {
    isOrphanId: isOrphanIdName(movie.name, movie.token),
    isMissingImage: isMissingImage(movie.image),
    isMissingVideo:
      movie.hasManifest === undefined
        ? isMissingVideo(movie.videoUrl)
        : isMissingPlayableVideo(movie.videoUrl, movie.hasManifest),
    isIncomplete: isIncompleteMovie(movie),
    isMissingBackdrop: isMissingBackdrop(movie.backdropImage),
  };
}

export type MovieQualityFilter =
  | 'all'
  | 'orphan_ids'
  | 'missing_image'
  | 'missing_image_titled'
  | 'missing_video'
  | 'incomplete'
  | 'missing_backdrop';

export function matchesQualityFilter(
  movie: Parameters<typeof getMovieQualityFlags>[0],
  filter: MovieQualityFilter,
): boolean {
  if (filter === 'all') return true;
  const flags = getMovieQualityFlags(movie);
  switch (filter) {
    case 'orphan_ids':
      return flags.isOrphanId;
    case 'missing_image':
      return flags.isMissingImage;
    case 'missing_image_titled':
      return needsPosterWithValidTitle(movie);
    case 'missing_video':
      return flags.isMissingVideo;
    case 'incomplete':
      return flags.isIncomplete;
    case 'missing_backdrop':
      return flags.isMissingBackdrop && hasValidMovieTitle(movie.name, movie.token);
    default:
      return true;
  }
}

export { PLACEHOLDER_IMAGE } from './resolveMovieImage';