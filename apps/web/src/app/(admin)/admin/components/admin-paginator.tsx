'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@pelis/ui/utils';
import { getPageCount, getPageWindow } from '../lib/admin-pagination';

interface AdminPaginatorProps {
  page: number;
  total: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  noun?: string;
}

export function AdminPaginator({
  page,
  total,
  pageSize,
  onPageChange,
  noun = 'registros',
}: AdminPaginatorProps) {
  if (total === 0) return null;
  const pageCount = getPageCount(total, pageSize);
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);
  const btn =
    'inline-flex h-8 min-w-8 items-center justify-center rounded-[6px] border px-2 text-meta transition-colors disabled:opacity-40 disabled:cursor-not-allowed';

  return (
    <nav
      aria-label="Paginación"
      className="flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-cinema-border px-4 py-3 text-meta text-cinema-muted"
    >
      <p>
        Mostrando{' '}
        <span className="text-cinema-accent font-semibold">
          {from}-{to}
        </span>{' '}
        de <span className="text-cinema-chalk font-semibold">{total}</span> {noun}
      </p>
      {pageCount > 1 && (
        <div className="flex items-center gap-1">
          <button
            type="button"
            className={cn(btn, 'border-cinema-border hover:border-cinema-accent/60')}
            onClick={() => onPageChange(page - 1)}
            disabled={page <= 1}
            aria-label="Página anterior"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          {getPageWindow(page, pageCount).map((p, i) =>
            p === 'gap' ? (
              <span key={`gap-${i}`} className="px-1 text-cinema-ash">
                ...
              </span>
            ) : (
              <button
                key={p}
                type="button"
                onClick={() => onPageChange(p)}
                aria-current={p === page ? 'page' : undefined}
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
            onClick={() => onPageChange(page + 1)}
            disabled={page >= pageCount}
            aria-label="Página siguiente"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </nav>
  );
}
