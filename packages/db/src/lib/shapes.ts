// Map Prisma rows to the "Convex-style" shapes the UI expects:
// - `_id` (not `id`)
// - lowercase enums (`mediaType: 'movie'`, `status: 'completed'`)
// - `_creationTime` ms timestamps where the UI expects them

interface PrismaMovie {
  id: string;
  mediaType: 'MOVIE' | 'SERIES';
  episodes?: number | null;
  [key: string]: unknown;
}

export function toMovieShape<T extends PrismaMovie>(m: T) {
  const { id, mediaType, episodes, ...rest } = m;
  return {
    ...rest,
    _id: id,
    mediaType: mediaType === 'SERIES' ? 'series' : 'movie',
    episodes: episodes ?? undefined,
  };
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