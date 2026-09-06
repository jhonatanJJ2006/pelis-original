import { describe, expect, it } from 'vitest';
import { isQueryLoading, nextQueryState } from './query-state';

describe('nextQueryState', () => {
  it('replaces data on a successful fetch', () => {
    const next = nextQueryState(
      { data: { id: 'old' }, error: null },
      { ok: true, data: { id: 'new' } }
    );
    expect(next).toEqual({ data: { id: 'new' }, error: null });
  });

  it('keeps previous data when a refetch fails', () => {
    const err = new Error('useQuery(movies.getById) failed: 500');
    const next = nextQueryState({ data: { id: 'old' }, error: null }, { ok: false, error: err });
    expect(next.data).toEqual({ id: 'old' });
    expect(next.error).toBe(err);
  });

  it('leaves data undefined when the first fetch fails', () => {
    const err = new Error('network');
    const next = nextQueryState({ data: undefined, error: null }, { ok: false, error: err });
    expect(next.data).toBeUndefined();
    expect(next.error).toBe(err);
  });
});

describe('isQueryLoading', () => {
  it('is true only while the first fetch is in flight', () => {
    expect(isQueryLoading({ data: undefined, error: null }, false)).toBe(true);
    expect(isQueryLoading({ data: { id: '1' }, error: null }, false)).toBe(false);
    expect(isQueryLoading({ data: undefined, error: new Error('fail') }, false)).toBe(false);
    expect(isQueryLoading({ data: undefined, error: null }, true)).toBe(false);
  });
});
