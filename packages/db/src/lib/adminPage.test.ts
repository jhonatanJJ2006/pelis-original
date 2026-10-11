import { describe, expect, it } from 'vitest';
import { normalizePageArgs, sliceAdminPage } from './adminPage';

describe('adminPage', () => {
  it('defaults to 40 and caps the limit', () => {
    expect(normalizePageArgs()).toEqual({ offset: 0, limit: 40 });
    expect(normalizePageArgs(-5, 1000)).toEqual({ offset: 0, limit: 100 });
  });

  it('slices and reports hasMore', () => {
    const all = Array.from({ length: 45 }, (_, i) => i);
    expect(sliceAdminPage(all, 0, 40)).toMatchObject({ total: 45, hasMore: true });
    expect(sliceAdminPage(all, 40, 40).items).toEqual([40, 41, 42, 43, 44]);
    expect(sliceAdminPage(all, 40, 40).hasMore).toBe(false);
  });
});
