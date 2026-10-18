/**
 * @pelis/scripts-core — utilidades compartidas para los scripts CLI.
 *
 * Decisión: `decisions/0003-test-cli-vitest-scripts.md`.
 *
 * @module @pelis/scripts-core
 */

export { slugify, type SlugifyOptions } from './slugify';
export { isPosterHash, legacyPosterPath, posterPath } from './posters';
export {
  seedMovieSchema,
  seedSchema,
  mergeSeeds,
  dedupeSeeds,
  type SeedMovie,
  type Seed,
} from './seed';
export {
  normalizeTmdbMovie,
  TMDB_IMAGE_BASE,
  type TmdbMovieRaw,
  type TmdbGenreMap,
  type NormalizedMovie,
} from './tmdb';
