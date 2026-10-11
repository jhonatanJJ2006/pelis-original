import { describe, expect, it } from 'vitest';
import { addTally, bulkConfirmText, chunkIds } from './bulk-scope';

describe('bulk-scope', () => {
  it('parte ids en lotes', () => {
    expect(chunkIds(['a', 'b', 'c'], 2)).toEqual([['a', 'b'], ['c']]);
  });
  it('suma resultados', () => {
    expect(addTally({ ok: 1, failed: 0, skipped: 2 }, { ok: 3, failed: 1 })).toEqual({
      ok: 4,
      failed: 1,
      skipped: 2,
    });
  });
  it('confirma con el alcance y la cantidad', () => {
    expect(bulkConfirmText('view', 1)).toBe('Aplicar a 1 película de esta vista');
    expect(bulkConfirmText('filter', 320)).toBe('Aplicar a las 320 películas de todo el filtro');
  });
});
