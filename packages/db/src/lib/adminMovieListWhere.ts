import { genreTokenWhere } from './movieGenre';

/**
 * WHERE for adminMovies.adminList. Search and genre must combine with AND:
 * genreTokenWhere also uses OR, so assigning it on top of the search OR
 * would drop one of the filters.
 *
 * No Prisma import: unit tests load this before `prisma generate`.
 */
export function adminMovieListWhere(input: {
  search?: string;
  genre?: string;
}): Record<string, unknown> {
  const searchLower = input.search?.trim().toLowerCase() ?? '';
  const genre = input.genre?.trim() ?? '';

  const searchWhere = searchLower
    ? {
        OR: [
          { name: { contains: searchLower, mode: 'insensitive' } },
          { token: { contains: searchLower, mode: 'insensitive' } },
          { actors: { contains: searchLower, mode: 'insensitive' } },
        ],
      }
    : null;

  const genreWhere = genre ? genreTokenWhere(genre) : null;
  const hasGenre = Boolean(genreWhere && Object.keys(genreWhere).length > 0);

  if (searchWhere && hasGenre) {
    return { AND: [genreWhere, searchWhere] };
  }
  if (hasGenre && genreWhere) return genreWhere;
  if (searchWhere) return searchWhere;
  return {};
}
