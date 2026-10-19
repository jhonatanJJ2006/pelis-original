'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '../../shared/utils';

export interface PageResult<T> {
  items: T[];
  total: number;
  offset: number;
  limit: number;
  hasMore: boolean;
}

export function getPageCount(total: number, pageSize: number): number {
  return Math.max(1, Math.ceil(total / pageSize));
}

/** Números de página visibles con elipsis: 1 … 4 5 6 … 20 */
export function getPageWindow(page: number, pageCount: number, span = 1): (number | 'gap')[] {
  if (pageCount <= 5 + span * 2) return Array.from({ length: pageCount }, (_, i) => i + 1);
  const out: (number | 'gap')[] = [1];
  const start = Math.max(2, page - span);
  const end = Math.min(pageCount - 1, page + span);
  if (start > 2) out.push('gap');
  for (let i = start; i <= end; i++) out.push(i);
  if (end < pageCount - 1) out.push('gap');
  out.push(pageCount);
  return out;
}

interface PaginatorProps {
  page: number;
  total: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  noun?: string;
  className?: string;
}

/** Paginador numerado del catálogo público (web escritorio y móvil). */
export function Paginator({
  page,
  total,
  pageSize,
  onPageChange,
  noun = 'títulos',
  className,
}: PaginatorProps) {
  if (total === 0) return null;
  const pageCount = getPageCount(total, pageSize);
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);
  const go = (p: number) => {
    onPageChange(Math.min(Math.max(1, p), pageCount));
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  const btn =
    'inline-flex h-10 min-w-10 sm:h-9 sm:min-w-9 items-center justify-center rounded-[6px] border px-2 text-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cinema-accent/60';

  return (
    <nav
      aria-label="Paginación"
      className={cn(
        'mt-10 flex flex-col items-center gap-3 border-t border-cinema-border pt-6 text-sm text-cinema-muted',
        className
      )}
    >
      {pageCount > 1 && (
        <div className="flex flex-wrap items-center justify-center gap-1">
          <button
            type="button"
            className={cn(btn, 'border-cinema-border hover:border-cinema-accent/60')}
            onClick={() => go(page - 1)}
            disabled={page <= 1}
            aria-label="Página anterior"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          {getPageWindow(page, pageCount).map((p, i) =>
            p === 'gap' ? (
              <span key={`gap-${i}`} className="px-1 text-cinema-ash" aria-hidden>
                …
              </span>
            ) : (
              <button
                key={p}
                type="button"
                onClick={() => go(p)}
                aria-current={p === page ? 'page' : undefined}
                aria-label={`Página ${p}`}
                className={cn(
                  btn,
                  p === page
                    ? 'border-cinema-accent bg-cinema-accent text-cinema-bg font-semibold'
                    : 'border-cinema-border text-cinema-muted hover:border-cinema-accent/60 hover:text-cinema-chalk'
                )}
              >
                {p}
              </button>
            )
          )}
          <button
            type="button"
            className={cn(btn, 'border-cinema-border hover:border-cinema-accent/60')}
            onClick={() => go(page + 1)}
            disabled={page >= pageCount}
            aria-label="Página siguiente"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
      <p>
        {from}–{to} de {total} {noun} · Página {page} de {pageCount}
      </p>
    </nav>
  );
}
