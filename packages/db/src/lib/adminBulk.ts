import type { MovieQualityFlags } from './movieQuality';

export type BulkPurpose = 'enrich' | 'backdrops';

/** Máximo de películas que acepta una acción masiva sobre todo el filtro. */
export const BULK_MAX_TARGETS = 5000;
/** Tamaño de cada lote que el panel envía al servidor. */
export const BULK_CHUNK_SIZE = 25;

/** Misma elegibilidad que la acción "en esta vista" del panel. */
export function isBulkEligible(
  flags: Pick<
    MovieQualityFlags,
    'isOrphanId' | 'isIncomplete' | 'isMissingImage' | 'isMissingBackdrop'
  >,
  purpose: BulkPurpose
): boolean {
  if (flags.isOrphanId) return false;
  return purpose === 'enrich'
    ? flags.isIncomplete || flags.isMissingImage
    : flags.isMissingBackdrop;
}

export function chunk<T>(items: T[], size = BULK_CHUNK_SIZE): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}
