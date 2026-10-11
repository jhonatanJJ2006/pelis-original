import { describe, expect, it } from 'vitest';
import { chunk, isBulkEligible } from './adminBulk';

const base = {
  isOrphanId: false,
  isIncomplete: false,
  isMissingImage: false,
  isMissingBackdrop: false,
};

describe('isBulkEligible', () => {
  it('excluye ids huérfanos', () => {
    expect(isBulkEligible({ ...base, isOrphanId: true, isIncomplete: true }, 'enrich')).toBe(false);
  });
  it('enriquecer: incompletas o sin imagen', () => {
    expect(isBulkEligible({ ...base, isIncomplete: true }, 'enrich')).toBe(true);
    expect(isBulkEligible({ ...base, isMissingImage: true }, 'enrich')).toBe(true);
    expect(isBulkEligible(base, 'enrich')).toBe(false);
  });
  it('backdrops: solo sin backdrop', () => {
    expect(isBulkEligible({ ...base, isMissingBackdrop: true }, 'backdrops')).toBe(true);
    expect(isBulkEligible({ ...base, isIncomplete: true }, 'backdrops')).toBe(false);
  });
});

describe('chunk', () => {
  it('parte en lotes', () => {
    expect(chunk([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
  });
});
