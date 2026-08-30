// Map Prisma rows to the "Convex-style" shapes the UI expects:
// - `_id` (not `id`)
// - lowercase enums (`mediaType: 'movie'`, `status: 'completed'`)
// - `_creationTime` ms timestamps where the UI expects them
// - `image` / `backdropImage` resueltos a una URL servible (sin URLs legacy de Convex).

import { enrichMovieImage } from './resolveMovieImage';

interface PrismaMovie {
  id: string;
  image: string;
  imageId?: string | null;
  backdropImage?: string | null;
  backdropImageId?: string | null;
  mediaType: 'MOVIE' | 'SERIES';
  episodes?: number | null;
  [key: string]: unknown;
}

export function toMovieShape<T extends PrismaMovie>(m: T): T {
  const { id, mediaType, episodes, ...rest } = m;
  const shaped = {
    ...rest,
    _id: id,
    mediaType: mediaType === 'SERIES' ? 'series' : 'movie',
    episodes: episodes ?? undefined,
  };
  // `enrichMovieImage` solo cambia `image` y `backdropImage`. Hacemos el cast
  // a través de `unknown` porque TS no puede probar que el resto del shape
  // coincide entre `T` y el tipo interno de `enrichMovieImage`.
  const enriched = enrichMovieImage(shaped as unknown as Parameters<typeof enrichMovieImage>[0]);
  return enriched as unknown as T;
}

interface PrismaAnime {
  id: string;
  status: 'ONGOING' | 'COMPLETED';
  [key: string]: unknown;
}

export function toAnimeShape<T extends PrismaAnime>(a: T) {
  const { id, status, ...rest } = a;
  return {
    ...rest,
    _id: id,
    status: status === 'ONGOING' ? 'ongoing' : 'completed',
  };
}

interface PrismaTvChannel {
  id: string;
  streamStatus: 'ONLINE' | 'OFFLINE' | 'UNKNOWN' | null;
  [key: string]: unknown;
}

export function toTvChannelShape<T extends PrismaTvChannel>(c: T) {
  const { id, streamStatus, ...rest } = c;
  return {
    ...rest,
    _id: id,
    streamStatus:
      streamStatus === 'ONLINE' ? 'online' : streamStatus === 'OFFLINE' ? 'offline' : 'unknown',
  };
}

/** Public catalog card: never leak upstream URLs or probe errors. */
export function toPublicTvChannelShape<T extends PrismaTvChannel>(c: T) {
  const shaped = toTvChannelShape(c) as Record<string, unknown> & { _id: string };
  delete shaped.streamUrl;
  delete shaped.lastStreamError;
  return shaped;
}

export function toTvPlaylistShape(p: {
  id: string;
  lastImportedAt?: Date | null;
  [key: string]: unknown;
}) {
  const { id, lastImportedAt, ...rest } = p;
  return {
    ...rest,
    _id: id,
    lastImportedAt: lastImportedAt ? lastImportedAt.getTime() : undefined,
  };
}
