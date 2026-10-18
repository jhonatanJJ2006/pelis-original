/**
 * Rutas de pósters usadas por los scripts del seed.
 *
 * - Scripts actuales (`generate-seed.mjs`, `download-*-posters.mjs`,
 *   `append-*.mjs`): `/peliculas/{token}.webp`.
 * - Legado: imágenes identificadas por un hash hex de 32 caracteres viven en
 *   `/peliculas/peliculas/{hash}.webp` (ver `resolveMovieImagePath` en
 *   `packages/db/src/lib/resolveMovieImage.ts`).
 *
 * @module @pelis/scripts-core/posters
 */

const HASH_RE = /^[a-f0-9]{32}$/i;
const TOKEN_RE = /^[a-z0-9][a-z0-9-]*$/;

export function isPosterHash(value: string): boolean {
  return HASH_RE.test(value);
}

/** Ruta pública del póster de un token del seed. */
export function posterPath(token: string): string {
  if (!TOKEN_RE.test(token)) {
    throw new Error(`Token de póster inválido: "${token}"`);
  }
  return `/peliculas/${token}.webp`;
}

/** Ruta pública de un póster legado identificado por hash. */
export function legacyPosterPath(hash: string): string {
  if (!isPosterHash(hash)) {
    throw new Error(`Hash de póster inválido: "${hash}"`);
  }
  return `/peliculas/peliculas/${hash.toLowerCase()}.webp`;
}
