/** Respuesta paginada de las listas del admin (offset/limit). */
export interface AdminPage<T> {
  items: T[];
  total: number;
  offset: number;
  limit: number;
  hasMore: boolean;
}

export const ADMIN_PAGE_LIMIT = 40;
export const ADMIN_PAGE_MAX = 100;

export function normalizePageArgs(offset?: number, limit?: number) {
  const safeLimit = Math.min(Math.max(1, Math.floor(limit ?? ADMIN_PAGE_LIMIT)), ADMIN_PAGE_MAX);
  const safeOffset = Math.max(0, Math.floor(offset ?? 0));
  return { offset: safeOffset, limit: safeLimit };
}

export function toAdminPage<T>(
  items: T[],
  total: number,
  offset: number,
  limit: number
): AdminPage<T> {
  return { items, total, offset, limit, hasMore: offset + items.length < total };
}

/** Pagina en memoria una lista ya filtrada. */
export function sliceAdminPage<T>(all: T[], offset: number, limit: number): AdminPage<T> {
  return toAdminPage(all.slice(offset, offset + limit), all.length, offset, limit);
}
