const HEX_ORPHAN_RE = /^[a-f0-9]{6,}$/i;
const LEGACY_ORPHAN_RE = /^ok(-ru-\d+)?$/i;
const DOCUMENT_ID_RE = /^document[-_]\d+$/i;

/** Nombre que en BD sigue siendo el token/ID en lugar del título real. */
export function isAdminOrphanDisplayName(name: string, token?: string): boolean {
  const trimmed = name.trim();
  if (!trimmed) return true;
  if (HEX_ORPHAN_RE.test(trimmed)) return true;
  if (LEGACY_ORPHAN_RE.test(trimmed)) return true;
  if (DOCUMENT_ID_RE.test(trimmed)) return true;
  if (token && trimmed.toLowerCase() === token.toLowerCase()) return true;
  if (token && !trimmed.includes(' ') && trimmed.length >= 8 && /^[a-z0-9_-]+$/i.test(trimmed)) {
    return true;
  }
  return false;
}

/** Título legible para tablas y modales del admin (nunca el token crudo). */
export function getAdminMovieDisplayName(movie: { name: string; token?: string }): string {
  const name = movie.name?.trim() ?? '';
  if (isAdminOrphanDisplayName(name, movie.token)) {
    return 'Sin título';
  }
  return name;
}
