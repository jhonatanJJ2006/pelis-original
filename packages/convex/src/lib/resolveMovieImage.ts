import type { Doc } from '../_generated/dataModel';
import type { MutationCtx, QueryCtx } from '../_generated/server';

const HASH_RE = /^[a-f0-9]{32}$/i;

export const PLACEHOLDER_IMAGE = '/peliculas/placeholder.webp';

export function resolveMovieImagePath(image: string): string {
  if (!image) return PLACEHOLDER_IMAGE;
  if (/^https?:\/\//i.test(image)) return image;
  if (image.startsWith('/')) return image;
  if (HASH_RE.test(image)) return `/peliculas/peliculas/${image}.webp`;
  return image;
}

type StorageCtx = Pick<QueryCtx, 'storage'> | Pick<MutationCtx, 'storage'>;
type MovieDoc = Doc<'movies'>;

export async function enrichMovieImage<T extends MovieDoc | null>(
  ctx: StorageCtx,
  movie: T
): Promise<T> {
  if (!movie) return movie;

  let image = resolveMovieImagePath(movie.image);
  if (movie.imageId) {
    const url = await ctx.storage.getUrl(movie.imageId);
    if (url) image = url;
  }

  return { ...movie, image };
}

export async function enrichMovies(
  ctx: StorageCtx,
  movies: MovieDoc[]
): Promise<MovieDoc[]> {
  return Promise.all(movies.map((movie) => enrichMovieImage(ctx, movie)));
}

export async function resolveImageFromStorage(
  ctx: StorageCtx,
  image: string,
  imageId?: MovieDoc['imageId']
): Promise<string> {
  if (imageId) {
    const url = await ctx.storage.getUrl(imageId);
    if (url) return url;
  }
  return resolveMovieImagePath(image);
}
