/**
 * Validador + utilidades para `movies.json`, `movies-processed.json`,
 * `movies-extra-processed.json` (arrays de películas). Un único contrato para
 * los scripts que generan o transforman el seed.
 *
 * @module @pelis/scripts-core/seed
 */

import { z } from 'zod';

export const seedMovieSchema = z.object({
  token: z.string().min(1),
  name: z.string().min(1),
  // Los scripts escriben '' cuando TMDB no trae sinopsis.
  synopsis: z.string(),
  genre: z.string().min(1),
  actors: z.string(),
  classification: z.string(),
  releaseYear: z.string().regex(/^\d{4}$/, 'releaseYear debe tener 4 dígitos'),
  image: z.string(),
  videoUrl: z.url().optional(),
  mediaType: z.enum(['movie', 'series']).optional(),
  featured: z.boolean().optional(),
});

export const seedSchema = z.array(seedMovieSchema);

export type SeedMovie = z.infer<typeof seedMovieSchema>;
export type Seed = SeedMovie[];

/**
 * Mezcla dos seeds por `token`. `extra` gana en colisión; el orden de `base`
 * se conserva y las entradas nuevas se añaden al final.
 */
export function mergeSeeds(base: Seed, extra: Seed): Seed {
  const map = new Map<string, SeedMovie>();
  for (const m of base) map.set(m.token, m);
  for (const m of extra) map.set(m.token, m);
  return [...map.values()];
}

/** Elimina duplicados por `token` conservando la primera aparición. */
export function dedupeSeeds(seed: Seed): Seed {
  const seen = new Set<string>();
  const result: Seed = [];
  for (const m of seed) {
    if (seen.has(m.token)) continue;
    seen.add(m.token);
    result.push(m);
  }
  return result;
}
