import { displayTitle } from './displayTitle';
// Map Prisma rows to the "Convex-style" shapes the UI expects:
// - `_id` (not `id`)
// - lowercase enums (`mediaType: 'movie'`, `status: 'completed'`)
// - `_creationTime` ms timestamps where the UI expects them
// - `image` / `backdropImage` resueltos a una URL servible (sin URLs legacy de Convex).

import { enrichMovieImage } from './resolveMovieImage';
import { tvStreamKindFromUrl } from './tv-stream-kind';

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
  const rawName = (rest as { name?: unknown }).name;
  const shaped = {
    ...rest,
    // `name` es el título para mostrar. `sourceName` es el guardado: el admin
    // edita ese, para no reescribir la normalización en la base.
    ...(typeof rawName === 'string' ? { name: displayTitle(rawName), sourceName: rawName } : {}),
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
  const rawTitle = rest.title;
  return {
    ...rest,
    ...(typeof rawTitle === 'string'
      ? { title: displayTitle(rawTitle), sourceTitle: rawTitle }
      : {}),
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

export function toPlanShape<T extends { id: string }>(p: T) {
  const { id, ...rest } = p;
  // Keep both shapes: admin/subscribe UI prefers `_id` (Convex-era),
  // but also leave `id` so `_id ?? id` fallbacks work if a caller skips shaping.
  return {
    ...rest,
    id,
    _id: id,
  };
}

/** Public catalog card: never leak upstream URLs or probe errors. */
export function toPublicTvChannelShape<T extends PrismaTvChannel>(c: T) {
  const shaped = toTvChannelShape(c) as Record<string, unknown> & { _id: string };
  // The URL stays private; the player only needs to know how to play it.
  shaped.streamKind = tvStreamKindFromUrl(
    typeof shaped.streamUrl === 'string' ? shaped.streamUrl : null
  );
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
