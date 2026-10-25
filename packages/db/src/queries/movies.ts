import { z } from 'zod';
import { prisma } from '../client';
import { register } from '../registry';
import {
  createTmdbFetcher,
  EMPTY_HERO_EXTRAS,
  lookupHeroExtras,
  lookupHeroRuntime,
  minutesFromSeconds,
  runLimited,
} from '../lib/hero-extras';
import { AuthError, requireUser } from '../lib/requireAdmin';
import { toMovieShape } from '../lib/shapes';
import { isMissingVideo } from '../lib/movieQuality';
import { hasManifestForToken } from '../lib/hasManifestForToken';
import { genreTokenWhere, movieMatchesGenre, splitMovieGenres } from '../lib/movieGenre';

type CatalogRow = { mediaType?: string | null; videoUrl?: string | null; token: string };

/** True when the title has a direct videoUrl or an on-disk HLS manifest. */
async function isPlayableTitle(m: CatalogRow): Promise<boolean> {
  if (!isMissingVideo(m.videoUrl)) return true;
  return hasManifestForToken(m.token);
}

/**
 * Catalog filter: movies need a playable video. Series stay listed even
 * without video, flagged `comingSoon` so the UI shows "Próximamente".
 */
async function filterPlayableCatalog<T extends CatalogRow>(
  movies: T[]
): Promise<Array<T & { comingSoon: boolean }>> {
  const out: Array<T & { comingSoon: boolean }> = [];
  for (const movie of movies) {
    const mediaType = (movie.mediaType ?? 'MOVIE').toString().toUpperCase();
    const playable = await isPlayableTitle(movie);
    if (playable) out.push({ ...movie, comingSoon: false });
    else if (mediaType === 'SERIES') out.push({ ...movie, comingSoon: true });
  }
  return out;
}

/** Hero / featured / trending: only titles that can actually play now. */
async function filterStrictlyPlayable<T extends CatalogRow>(
  movies: T[]
): Promise<Array<T & { comingSoon: boolean }>> {
  const out: Array<T & { comingSoon: boolean }> = [];
  for (const movie of movies) {
    if (await isPlayableTitle(movie)) out.push({ ...movie, comingSoon: false });
  }
  return out;
}

const MediaTypeEnum = z.enum(['movie', 'series']);

/**
 * When a limit is set, over-fetch before the playable filter so Android TV /
 * search are not left with an empty page because the first N rows lacked video.
 */
async function findPlayableMovies(opts: {
  where: Record<string, unknown>;
  orderBy: Record<string, 'asc' | 'desc'> | Array<Record<string, 'asc' | 'desc'>>;
  limit?: number;
  offset?: number;
}) {
  const { where, orderBy, limit, offset = 0 } = opts;
  if (limit == null) {
    const movies = await prisma.movie.findMany({ where, orderBy });
    return filterPlayableCatalog(movies);
  }
  const batch = await prisma.movie.findMany({
    where,
    orderBy,
    // Pull enough rows to cover skip+take after dropping unplayable movies.
    take: Math.min((offset + limit) * 4, 2000),
  });
  const playable = await filterPlayableCatalog(batch);
  return playable.slice(offset, offset + limit);
}

export const list = register({
  kind: 'query',
  name: 'movies.list',
  reads: ['movie'],
  args: z
    .object({
      genre: z.string().optional(),
      year: z.string().optional(),
      classification: z.string().optional(),
      search: z.string().optional(),
      mediaType: MediaTypeEnum.optional(),
      limit: z.number().optional(),
      offset: z.number().optional(),
    })
    .optional(),
  handler: async (_ctx, args) => {
    const a = args ?? {};
    const where: Record<string, unknown> = {};
    if (a.mediaType) where.mediaType = a.mediaType === 'movie' ? 'MOVIE' : 'SERIES';
    if (a.year) where.releaseYear = a.year;
    if (a.classification) where.classification = a.classification;

    const genre = a.genre?.trim();
    const search = a.search?.trim();

    if (genre && search) {
      const q = search.toLowerCase();
      where.AND = [
        genreTokenWhere(genre),
        {
          OR: [
            { name: { contains: q, mode: 'insensitive' } },
            { actors: { contains: q, mode: 'insensitive' } },
            { genre: { contains: q, mode: 'insensitive' } },
          ],
        },
      ];
    } else if (genre) {
      Object.assign(where, genreTokenWhere(genre));
    } else if (search) {
      const q = search.toLowerCase();
      where.OR = [
        { name: { contains: q, mode: 'insensitive' } },
        { actors: { contains: q, mode: 'insensitive' } },
        { genre: { contains: q, mode: 'insensitive' } },
      ];
    }

    const movies = await findPlayableMovies({
      where,
      orderBy: { name: 'asc' },
      limit: a.limit,
      offset: a.offset,
    });

    const refined = genre ? movies.filter((m) => movieMatchesGenre(m.genre, genre)) : movies;
    return refined.map(toMovieShape);
  },
});

export const search = register({
  kind: 'query',
  name: 'movies.search',
  reads: ['movie'],
  args: z.object({ q: z.string(), limit: z.number().optional() }),
  handler: async (_ctx, { q, limit }) => {
    const ql = q.trim().toLowerCase();
    if (!ql) return [];
    const take = limit ?? 8;
    const movies = await findPlayableMovies({
      where: {
        OR: [
          { name: { contains: ql, mode: 'insensitive' } },
          { actors: { contains: ql, mode: 'insensitive' } },
          { genre: { contains: ql, mode: 'insensitive' } },
        ],
      },
      orderBy: { name: 'asc' },
      limit: take,
    });
    return movies.map(toMovieShape);
  },
});

export const getById = register({
  kind: 'query',
  name: 'movies.getById',
  reads: ['movie'],
  args: z.object({ id: z.string() }),
  handler: async (_ctx, { id }) => {
    const movie = await prisma.movie.findUnique({ where: { id } });
    if (!movie) return null;
    return toMovieShape({ ...movie, comingSoon: !(await isPlayableTitle(movie)) });
  },
});

export const getFeatured = register({
  kind: 'query',
  name: 'movies.getFeatured',
  reads: ['movie'],
  handler: async () => {
    const featured = await prisma.movie.findMany({ where: { featured: true }, take: 10 });
    const playableFeatured = await filterStrictlyPlayable(featured);
    if (playableFeatured.length > 0) return playableFeatured.map(toMovieShape);
    const fallback = await prisma.movie.findMany({ orderBy: { releaseYear: 'desc' }, take: 60 });
    return (await filterStrictlyPlayable(fallback)).slice(0, 10).map(toMovieShape);
  },
});

export const getTrending = register({
  kind: 'query',
  name: 'movies.getTrending',
  reads: ['movie'],
  args: z.object({ limit: z.number().optional() }).optional(),
  handler: async (_ctx, args) => {
    const take = args?.limit ?? 12;
    const movies = await prisma.movie.findMany({
      orderBy: { releaseYear: 'desc' },
      take: take * 6,
    });
    return (await filterStrictlyPlayable(movies)).slice(0, take).map(toMovieShape);
  },
});

export const getByGenre = register({
  kind: 'query',
  name: 'movies.getByGenre',
  reads: ['movie'],
  args: z.object({ genre: z.string(), limit: z.number().optional() }),
  handler: async (_ctx, { genre, limit }) => {
    const take = limit ?? 12;
    const wanted = genre.trim();
    if (!wanted) return [];
    const movies = await prisma.movie.findMany({
      where: genreTokenWhere(wanted),
      orderBy: { name: 'asc' },
      take: take * 4,
    });
    const matched = movies.filter((m) => movieMatchesGenre(m.genre, wanted));
    return (await filterPlayableCatalog(matched)).slice(0, take).map(toMovieShape);
  },
});

export const listSeries = register({
  kind: 'query',
  name: 'movies.listSeries',
  reads: ['movie', 'series'],
  // limit opcional: el inicio (web y TV) pide un puñado. Sin limit sigue
  // devolviendo el catálogo entero para las APK que ya lo llaman así.
  args: z
    .object({
      limit: z.number().int().positive().max(100).optional(),
    })
    .optional(),
  handler: async (_ctx, args) => {
    const series = await findPlayableMovies({
      where: { mediaType: 'SERIES' },
      orderBy: { name: 'asc' },
      limit: args?.limit,
    });
    // Public catalog uses Movie.mediaType = SERIES (favorites/history/detail too).
    // Do NOT invent fake series from random movies when the table is empty —
    // that polluted /series and the home "Series" row with mislabeled films.
    // Admin `series` rows are a separate table. adminSeries.create mirrors a new
    // token into this Movie row; import:tmdb-series does the same additively.
    return series.map(toMovieShape);
  },
});

export const getGenres = register({
  kind: 'query',
  name: 'movies.getGenres',
  reads: ['movie'],
  // mediaType opcional (app TV): solo los géneros de películas o de series.
  args: z.object({ mediaType: MediaTypeEnum.optional() }).optional(),
  handler: async (_ctx, args) => {
    const mediaType = args?.mediaType;
    const movies = await prisma.movie.findMany({
      select: { genre: true },
      ...(mediaType ? { where: { mediaType: mediaType === 'movie' ? 'MOVIE' : 'SERIES' } } : {}),
    });
    const set = new Set<string>();
    for (const m of movies) {
      for (const g of splitMovieGenres(m.genre)) set.add(g);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'es'));
  },
});

export const getYears = register({
  kind: 'query',
  name: 'movies.getYears',
  reads: ['movie'],
  handler: async () => {
    const movies = await prisma.movie.findMany({ select: { releaseYear: true } });
    return Array.from(new Set(movies.map((m) => m.releaseYear).filter(Boolean)))
      .sort()
      .reverse();
  },
});

export const getClassifications = register({
  kind: 'query',
  name: 'movies.getClassifications',
  reads: ['movie'],
  handler: async () => {
    const movies = await prisma.movie.findMany({ select: { classification: true } });
    return Array.from(new Set(movies.map((m) => m.classification).filter(Boolean))).sort();
  },
});

void AuthError;

// ---------------------------------------------------------------------------
// Paginación en servidor (web, app de celular y TV). Las funciones viejas
// (`movies.list`, `movies.listSeries`, `movies.search`) siguen igual para las
// APK ya instaladas.
// ---------------------------------------------------------------------------

export interface PageResult<T> {
  items: T[];
  total: number;
  offset: number;
  limit: number;
  hasMore: boolean;
}

export function pageOf<T>(all: T[], offset: number, limit: number): PageResult<T> {
  const total = all.length;
  return {
    items: all.slice(offset, offset + limit),
    total,
    offset,
    limit,
    hasMore: offset + limit < total,
  };
}

const SortEnum = z.enum(['name', 'recent', 'popular']);

export const pageArgs = z
  .object({
    genre: z.string().optional(),
    year: z.string().optional(),
    classification: z.string().optional(),
    search: z.string().optional(),
    mediaType: MediaTypeEnum.optional(),
    sort: SortEnum.optional(),
    limit: z.number().int().positive().max(100).optional(),
    offset: z.number().int().min(0).optional(),
  })
  .optional();

/** Vistas por película (filas de historial) para ordenar por «populares». */
async function viewCounts(): Promise<Map<string, number>> {
  const rows = await prisma.history.groupBy({ by: ['movieId'], _count: { movieId: true } });
  return new Map(rows.map((r) => [r.movieId, r._count.movieId]));
}

export const page = register({
  kind: 'query',
  name: 'movies.page',
  reads: ['movie', 'history'],
  args: pageArgs,
  handler: async (_ctx, args) => {
    const a = args ?? {};
    const limit = a.limit ?? 24;
    const offset = a.offset ?? 0;
    const where: Record<string, unknown> = {};
    if (a.mediaType) where.mediaType = a.mediaType === 'movie' ? 'MOVIE' : 'SERIES';
    if (a.year) where.releaseYear = a.year;
    if (a.classification) where.classification = a.classification;
    const genre = a.genre?.trim();
    const search = a.search?.trim().toLowerCase();
    const and: Record<string, unknown>[] = [];
    if (genre) and.push(genreTokenWhere(genre));
    if (search) {
      and.push({
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { actors: { contains: search, mode: 'insensitive' } },
          { genre: { contains: search, mode: 'insensitive' } },
        ],
      });
    }
    if (and.length) where.AND = and;

    // Búsqueda vacía → populares; con texto o filtros → por nombre.
    const sort = a.sort ?? 'name';
    const orderBy =
      sort === 'name'
        ? { name: 'asc' as const }
        : [{ releaseYear: 'desc' as const }, { createdAt: 'desc' as const }];
    const rows = await prisma.movie.findMany({ where, orderBy });
    let list = await filterPlayableCatalog(rows);
    if (genre) list = list.filter((m) => movieMatchesGenre(m.genre, genre));
    if (sort === 'popular') {
      const counts = await viewCounts();
      list = list
        .map((m, i) => ({ m, i, n: counts.get(m.id) ?? 0 }))
        .sort((x, y) => y.n - x.n || x.i - y.i)
        .map((x) => x.m);
    }
    // Las series sin vídeo («Próximamente») van al final para no llenar la primera página.
    if (sort !== 'name')
      list = [...list.filter((m) => !m.comingSoon), ...list.filter((m) => m.comingSoon)];
    const result = pageOf(list, offset, limit);
    return { ...result, items: result.items.map(toMovieShape) };
  },
});

const heroExtrasCache = new Map<string, { expires: number; value: typeof EMPTY_HERO_EXTRAS }>();

/** Duración y tráiler (YouTube) para el hero. No escribe la base ni registra la clave de TMDB. */
export const heroExtras = register({
  kind: 'query',
  name: 'movies.heroExtras',
  reads: ['movie'],
  args: z.object({ id: z.string().min(1).max(128) }),
  handler: async (ctx, { id }) => {
    requireUser(ctx);
    const now = Date.now();
    const hit = heroExtrasCache.get(id);
    if (hit && hit.expires > now) return hit.value;
    const apiKey = process.env.TMDB_API_KEY;
    if (!apiKey) return EMPTY_HERO_EXTRAS;
    try {
      const movie = await prisma.movie.findUnique({
        where: { id },
        select: { name: true, releaseYear: true, mediaType: true },
      });
      if (!movie) return EMPTY_HERO_EXTRAS;
      const value = await lookupHeroExtras(
        {
          name: movie.name,
          year: movie.releaseYear,
          mediaType: movie.mediaType === 'SERIES' ? 'series' : 'movie',
        },
        createTmdbFetcher(apiKey)
      );
      const ttl = value.youtubeKey || value.runtimeMinutes ? 12 * 60 * 60 * 1000 : 30 * 60 * 1000;
      heroExtrasCache.set(id, { expires: now + ttl, value });
      if (value.runtimeMinutes) rememberRuntime(id, value.runtimeMinutes, now);
      if (heroExtrasCache.size > 400) {
        const oldest = heroExtrasCache.keys().next().value;
        if (oldest) heroExtrasCache.delete(oldest);
      }
      return value;
    } catch {
      return EMPTY_HERO_EXTRAS;
    }
  },
});

const RUNTIME_HIT_TTL = 24 * 60 * 60 * 1000;
const RUNTIME_MISS_TTL = 60 * 60 * 1000;
const RUNTIME_CACHE_MAX = 2000;
const runtimeCache = new Map<string, { expires: number; minutes: number | null }>();
/** Búsquedas a TMDB en curso, para no repetirlas si llegan dos peticiones a la vez. */
const runtimeInflight = new Map<string, Promise<number | null>>();

function rememberRuntime(id: string, minutes: number | null, now = Date.now()) {
  runtimeCache.delete(id);
  runtimeCache.set(id, { expires: now + (minutes ? RUNTIME_HIT_TTL : RUNTIME_MISS_TTL), minutes });
  while (runtimeCache.size > RUNTIME_CACHE_MAX) {
    const oldest = runtimeCache.keys().next().value;
    if (!oldest) break;
    runtimeCache.delete(oldest);
  }
}

/** Tiempo máximo que espera la respuesta; lo que falte sigue en segundo plano y queda en caché. */
const RUNTIME_BUDGET_MS = 3500;

/**
 * Duración (minutos) de varios títulos a la vez para el hero de inicio (web y TV).
 * Primero la duración real del archivo que guarda el historial; si no hay, TMDB
 * (solo en el servidor y solo con `TMDB_API_KEY`). Caché en memoria. No escribe la base.
 */
export const heroRuntimes = register({
  kind: 'query',
  name: 'movies.heroRuntimes',
  reads: ['movie', 'history'],
  args: z.object({ ids: z.array(z.string().min(1).max(128)).max(40) }),
  handler: async (ctx, { ids }) => {
    requireUser(ctx);
    const now = Date.now();
    const unique = [...new Set(ids)];
    const out: Record<string, number | null> = {};
    const pending: string[] = [];
    for (const id of unique) {
      const hit = runtimeCache.get(id);
      if (hit && hit.expires > now) out[id] = hit.minutes;
      else pending.push(id);
    }
    if (pending.length === 0) return out;
    try {
      const played = await prisma.history.groupBy({
        by: ['movieId'],
        where: { movieId: { in: pending } },
        _max: { duration: true },
      });
      for (const row of played) {
        const minutes = minutesFromSeconds(row._max.duration);
        if (minutes) {
          out[row.movieId] = minutes;
          rememberRuntime(row.movieId, minutes, now);
        }
      }
    } catch {
      // Sin historial: se sigue con TMDB.
    }
    const missing = pending.filter((id) => out[id] === undefined);
    const apiKey = process.env.TMDB_API_KEY;
    if (missing.length === 0 || !apiKey) {
      for (const id of missing) out[id] = null;
      return out;
    }
    let movies: Array<{ id: string; name: string; releaseYear: string; mediaType: string }> = [];
    try {
      movies = await prisma.movie.findMany({
        where: { id: { in: missing } },
        select: { id: true, name: true, releaseYear: true, mediaType: true },
      });
    } catch {
      movies = [];
    }
    const fetcher = createTmdbFetcher(apiKey);
    const work = runLimited(movies, 6, async (movie) => {
      let job = runtimeInflight.get(movie.id);
      if (!job) {
        job = lookupHeroRuntime(
          {
            name: movie.name,
            year: movie.releaseYear,
            mediaType: movie.mediaType === 'SERIES' ? 'series' : 'movie',
          },
          fetcher
        )
          .catch(() => null)
          .then((minutes) => {
            rememberRuntime(movie.id, minutes);
            return minutes;
          })
          .finally(() => runtimeInflight.delete(movie.id));
        runtimeInflight.set(movie.id, job);
      }
      out[movie.id] = await job;
    });
    await Promise.race([
      work,
      new Promise<void>((resolve) => setTimeout(resolve, RUNTIME_BUDGET_MS)),
    ]);
    // Lo que no llegó a tiempo va como `null`; la próxima petición lo encuentra en caché.
    const result: Record<string, number | null> = {};
    for (const id of unique) result[id] = out[id] ?? null;
    return result;
  },
});
