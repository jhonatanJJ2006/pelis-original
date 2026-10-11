import { useEffect, useState } from 'react';

export const ADMIN_PAGE_SIZE = 40;

export function getPageCount(total: number, pageSize = ADMIN_PAGE_SIZE): number {
  return Math.max(1, Math.ceil(total / pageSize));
}

export function clampPage(page: number, total: number, pageSize = ADMIN_PAGE_SIZE): number {
  return Math.min(Math.max(1, page), getPageCount(total, pageSize));
}

/** Números de página visibles con elipsis: 1 … 4 5 6 … 20 */
export function getPageWindow(page: number, pageCount: number): (number | 'gap')[] {
  if (pageCount <= 7) return Array.from({ length: pageCount }, (_, i) => i + 1);
  const out: (number | 'gap')[] = [1];
  const start = Math.max(2, page - 1);
  const end = Math.min(pageCount - 1, page + 1);
  if (start > 2) out.push('gap');
  for (let i = start; i <= end; i++) out.push(i);
  if (end < pageCount - 1) out.push('gap');
  out.push(pageCount);
  return out;
}

export interface AdminPageResult<T> {
  items: T[];
  total: number;
  offset: number;
  limit: number;
  hasMore: boolean;
}

/**
 * Paginación en servidor: devuelve offset/limit para la consulta y vuelve a la
 * página 1 cuando cambian los filtros (filterKey).
 */
export function useAdminServerPage(filterKey: string, pageSize = ADMIN_PAGE_SIZE) {
  const [page, setPage] = useState(1);
  useEffect(() => {
    setPage(1);
  }, [filterKey]);
  return { page, setPage, offset: (page - 1) * pageSize, limit: pageSize, pageSize };
}
