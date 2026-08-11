import type { Doc, Id } from '../_generated/dataModel';
import { isMissingImage } from './movieQuality';

export interface GapFillFields {
  synopsis?: string;
  genre?: string;
  actors?: string;
  classification?: string;
  releaseYear?: string;
  image?: string;
  imageId?: Id<'_storage'>;
}

export interface GapFillPreview {
  synopsis: boolean;
  genre: boolean;
  actors: boolean;
  classification: boolean;
  releaseYear: boolean;
  image: boolean;
}

function isInvalidYear(year: string | undefined): boolean {
  const trimmed = year?.trim() ?? '';
  if (!trimmed) return true;
  return !/^\d{4}$/.test(trimmed);
}

export function getGapFillPreview(
  movie: Pick<
    Doc<'movies'>,
    'synopsis' | 'actors' | 'classification' | 'genre' | 'releaseYear' | 'image'
  >
): GapFillPreview {
  const synopsis = movie.synopsis?.trim() ?? '';
  return {
    synopsis: synopsis.length < 10,
    genre: !(movie.genre?.trim() ?? ''),
    actors: !(movie.actors?.trim() ?? ''),
    classification: !(movie.classification?.trim() ?? ''),
    releaseYear: isInvalidYear(movie.releaseYear),
    image: isMissingImage(movie.image),
  };
}

export function buildGapFillPatch(
  movie: Pick<
    Doc<'movies'>,
    'synopsis' | 'actors' | 'classification' | 'genre' | 'releaseYear' | 'image' | 'token'
  >,
  metadata: {
    synopsis: string;
    genre: string;
    actors: string;
    classification: string;
    releaseYear: string;
  },
  options?: {
    imageId?: Id<'_storage'>;
    replaceImage?: boolean;
  }
): GapFillFields {
  const preview = getGapFillPreview(movie);
  const patch: GapFillFields = {};

  if (preview.synopsis && metadata.synopsis.trim().length >= 10) {
    patch.synopsis = metadata.synopsis.trim();
  }
  if (preview.genre && metadata.genre.trim()) {
    patch.genre = metadata.genre.trim();
  }
  if (preview.actors && metadata.actors.trim()) {
    patch.actors = metadata.actors.trim();
  }
  if (preview.classification && metadata.classification.trim()) {
    patch.classification = metadata.classification.trim();
  }
  if (preview.releaseYear && metadata.releaseYear.trim()) {
    patch.releaseYear = metadata.releaseYear.trim();
  }

  const shouldSetImage =
    options?.imageId &&
    (preview.image || options.replaceImage);

  if (shouldSetImage) {
    patch.imageId = options.imageId;
    patch.image = `/peliculas/${movie.token}.webp`;
  }

  return patch;
}

export function hasAnyGapToFill(preview: GapFillPreview): boolean {
  return Object.values(preview).some(Boolean);
}
