const HASH_RE = /^[a-f0-9]{32}$/i;
const SLUG_RE = /^[a-z0-9][a-z0-9-]{1,80}$/i;
const CONVEX_LEGACY_RE = /^https?:\/\/[\w-]+\.convex\.cloud\/api\/storage\//i;

export const PLACEHOLDER_IMAGE = '/peliculas/placeholder.webp';

export function resolveMovieImagePath(image: string | null | undefined): string {
  if (!image) return PLACEHOLDER_IMAGE;
  // URLs legacy de Convex (uncommon-dolphin-XXX.convex.cloud) ya no existen;
  // el cliente debe caer al placeholder para que no se muestre un 404.
  if (CONVEX_LEGACY_RE.test(image)) return PLACEHOLDER_IMAGE;
  if (/^https?:\/\//i.test(image)) return image;
  if (image.startsWith('/')) return image;
  if (HASH_RE.test(image)) return `/peliculas/peliculas/${image}.webp`;
  if (SLUG_RE.test(image)) return `/peliculas/${image}.webp`;
  return image;
}

export function enrichMovieImage<
  T extends {
    image: string;
    imageId?: string | null;
    backdropImage?: string | null;
    backdropImageId?: string | null;
  },
>(movie: T | null): T | null {
  if (!movie) return movie;
  const image = movie.imageId
    ? `/uploads/${movie.imageId}.webp`
    : resolveMovieImagePath(movie.image);
  const backdropImage = movie.backdropImageId
    ? `/uploads/${movie.backdropImageId}.webp`
    : movie.backdropImage
      ? resolveMovieImagePath(movie.backdropImage)
      : undefined;
  return { ...movie, image, backdropImage };
}

export function enrichMovies<T extends Parameters<typeof enrichMovieImage>[0]>(movies: T[]): T[] {
  return movies.map((m) => enrichMovieImage(m) as T);
}

export function getHeroImage(movie: { backdropImage?: string | null; image: string }): string {
  const backdrop = movie.backdropImage?.trim();
  // Backdrops legacy `/peliculas/*-backdrop.webp` no existen en disco: usar el póster.
  if (backdrop && !backdrop.startsWith('/peliculas/')) return backdrop;
  return movie.image;
}
