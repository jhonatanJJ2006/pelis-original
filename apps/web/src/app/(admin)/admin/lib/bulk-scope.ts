export type BulkScope = 'view' | 'filter';

export function chunkIds<T>(items: T[], size = 25): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

export interface BulkTally {
  ok: number;
  failed: number;
  skipped: number;
}

export function addTally(acc: BulkTally, r: Partial<BulkTally> | null | undefined): BulkTally {
  return {
    ok: acc.ok + (r?.ok ?? 0),
    failed: acc.failed + (r?.failed ?? 0),
    skipped: acc.skipped + (r?.skipped ?? 0),
  };
}

/** Texto de confirmación explícita para la acción masiva. */
export function bulkConfirmText(scope: BulkScope, count: number): string {
  const noun = count === 1 ? 'película' : 'películas';
  return scope === 'view'
    ? `Aplicar a ${count} ${noun} de esta vista`
    : `Aplicar a las ${count} ${noun} de todo el filtro`;
}
