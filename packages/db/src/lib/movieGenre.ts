/**
 * Movie.genre is a free-text field. Enrichment from TMDB stores comma-separated
 * lists ("Acción, Crimen, Suspense"); older seeds store a single primary genre.
 * Filters and chips must match individual tokens, not only the full string.
 */

export function splitMovieGenres(genre: string | null | undefined): string[] {
  if (!genre) return [];
  return genre
    .split(',')
    .map((g) => g.trim())
    .filter(Boolean);
}

/** True when the movie shares any genre token with `wanted` (also comma-separated). */
export function movieMatchesGenre(
  movieGenre: string | null | undefined,
  wanted: string | null | undefined
): boolean {
  const wantedTokens = splitMovieGenres(wanted).map((g) => g.toLowerCase());
  if (wantedTokens.length === 0) return true;
  const tokens = splitMovieGenres(movieGenre).map((g) => g.toLowerCase());
  if (tokens.length === 0) return false;
  if ((movieGenre ?? '').trim().toLowerCase() === (wanted ?? '').trim().toLowerCase()) {
    return true;
  }
  return wantedTokens.some((w) => tokens.includes(w));
}

/**
 * Prisma WHERE fragment that over-approximates token matches so we can still
 * use SQL, then refine with {@link movieMatchesGenre}.
 */
export function genreTokenWhere(wanted: string): Record<string, unknown> {
  const tokens = splitMovieGenres(wanted);
  if (tokens.length === 0) return {};

  const or: Record<string, unknown>[] = [
    // Full compound string (related movies with the same TMDB join).
    { genre: { equals: wanted.trim(), mode: 'insensitive' } },
  ];
  for (const g of tokens) {
    or.push(
      { genre: { equals: g, mode: 'insensitive' } },
      { genre: { startsWith: `${g},`, mode: 'insensitive' } },
      { genre: { contains: `, ${g},`, mode: 'insensitive' } },
      { genre: { endsWith: `, ${g}`, mode: 'insensitive' } },
      { genre: { contains: `,${g},`, mode: 'insensitive' } },
      { genre: { endsWith: `,${g}`, mode: 'insensitive' } }
    );
  }
  return { OR: or };
}
