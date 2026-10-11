'use client';

import { useState } from 'react';
import { X } from 'lucide-react';
import { Button, Spinner } from '@pelis/ui/components';
import { cn } from '@pelis/ui/utils';
import { bulkConfirmText, type BulkScope } from '../lib/bulk-scope';

interface BulkActionDialogProps {
  title: string;
  description: string;
  viewCount: number;
  /** undefined mientras se cuenta el filtro completo. */
  filterCount: number | undefined;
  filterTruncatedAt?: number;
  running: boolean;
  progress?: { done: number; total: number };
  onConfirm: (scope: BulkScope) => void;
  onClose: () => void;
}

/** Confirmación explícita de una acción masiva: elegir alcance y confirmar la cantidad. */
export function BulkActionDialog({
  title,
  description,
  viewCount,
  filterCount,
  filterTruncatedAt,
  running,
  progress,
  onConfirm,
  onClose,
}: BulkActionDialogProps) {
  const [scope, setScope] = useState<BulkScope>('view');
  const [acknowledged, setAcknowledged] = useState(false);
  const count = scope === 'view' ? viewCount : (filterCount ?? 0);
  const canConfirm =
    !running && count > 0 && (scope === 'view' || (filterCount !== undefined && acknowledged));

  const options: Array<{ value: BulkScope; label: string; detail: string }> = [
    { value: 'view', label: 'Solo en esta vista', detail: `${viewCount} elegibles en esta página` },
    {
      value: 'filter',
      label: 'Todo el filtro',
      detail:
        filterCount === undefined
          ? 'Contando…'
          : `${filterCount} elegibles con la búsqueda y filtros actuales${
              filterTruncatedAt ? ` (máximo ${filterTruncatedAt} por tanda)` : ''
            }`,
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="bulk-title"
        className="w-full max-w-lg rounded-lg border border-cinema-border bg-cinema-surface shadow-2xl"
      >
        <div className="flex items-start justify-between gap-4 border-b border-cinema-border p-5">
          <div>
            <p className="text-label uppercase text-cinema-accent mb-1">Acción masiva</p>
            <h2 id="bulk-title" className="font-display text-xl font-semibold text-cinema-chalk">
              {title}
            </h2>
            <p className="mt-1 text-sm text-cinema-muted">{description}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={running}
            className="p-1 text-cinema-muted hover:text-cinema-chalk"
            aria-label="Cerrar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-3 p-5" role="radiogroup" aria-label="Alcance">
          {options.map((o) => (
            <label
              key={o.value}
              className={cn(
                'flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors',
                scope === o.value
                  ? 'border-cinema-accent bg-cinema-accent/10'
                  : 'border-cinema-border hover:border-cinema-silver/40'
              )}
            >
              <input
                type="radio"
                name="bulk-scope"
                value={o.value}
                checked={scope === o.value}
                disabled={running}
                onChange={() => {
                  setScope(o.value);
                  setAcknowledged(false);
                }}
                className="mt-1 accent-[#C4A35A]"
              />
              <span>
                <span className="block text-sm font-medium text-cinema-chalk">{o.label}</span>
                <span className="block text-xs text-cinema-muted">{o.detail}</span>
              </span>
            </label>
          ))}

          {scope === 'filter' && filterCount !== undefined && filterCount > 0 && (
            <label className="flex items-start gap-2 rounded-lg border border-cinema-danger/50 bg-cinema-danger/10 p-3 text-sm text-cinema-chalk">
              <input
                type="checkbox"
                checked={acknowledged}
                disabled={running}
                onChange={(e) => setAcknowledged(e.target.checked)}
                className="mt-0.5 accent-[#C4A35A]"
              />
              Entiendo que esto modificará {filterCount} películas, incluidas las de otras páginas.
            </label>
          )}

          {progress && (
            <div>
              <div className="h-1 overflow-hidden rounded-full bg-cinema-elevated">
                <div
                  className="h-full bg-cinema-accent transition-all"
                  style={{
                    width: `${progress.total ? (progress.done / progress.total) * 100 : 0}%`,
                  }}
                />
              </div>
              <p className="mt-1.5 text-xs text-cinema-muted">
                {progress.done} de {progress.total} procesadas
              </p>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 border-t border-cinema-border p-5">
          <Button variant="secondary" size="sm" onClick={onClose} disabled={running}>
            Cancelar
          </Button>
          <Button size="sm" disabled={!canConfirm} onClick={() => onConfirm(scope)}>
            {running ? (
              <>
                <Spinner className="h-4 w-4" />
                Procesando…
              </>
            ) : (
              bulkConfirmText(scope, count)
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
