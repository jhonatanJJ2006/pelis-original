/**
 * Normaliza strings para usarlos como tokens / nombres de archivo.
 *
 * - minúsculas, sin acentos (NFD + strip de marcas combinantes)
 * - solo `[a-z0-9]` separados por `-`
 * - recorta guiones al inicio/final
 * - `maxLength` opcional (los scripts de pósters usan 40) sin dejar guion final
 *
 * @module @pelis/scripts-core/slugify
 */

export type SlugifyOptions = {
  readonly maxLength?: number;
};

export function slugify(input: string, options: SlugifyOptions = {}): string {
  let slug = input
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  const { maxLength } = options;
  if (maxLength !== undefined && maxLength > 0 && slug.length > maxLength) {
    slug = slug.slice(0, maxLength).replace(/-+$/g, '');
  }
  return slug;
}
