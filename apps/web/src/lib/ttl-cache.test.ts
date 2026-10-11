import { describe, expect, it } from 'vitest';
import { TtlCache } from './ttl-cache';

describe('TtlCache', () => {
  it('expires entries after the TTL', () => {
    const c = new TtlCache<number>();
    c.set('a', 1, 1000, 0);
    expect(c.get('a', 500)).toBe(1);
    expect(c.get('a', 1000)).toBeUndefined();
  });
  it('keeps null values distinct from misses', () => {
    const c = new TtlCache<null>();
    c.set('a', null, 1000, 0);
    expect(c.get('a', 1)).toBeNull();
    expect(c.get('b', 1)).toBeUndefined();
  });
  it('evicts the oldest entry at capacity', () => {
    const c = new TtlCache<number>(2);
    c.set('a', 1, 1000, 0);
    c.set('b', 2, 1000, 0);
    c.set('c', 3, 1000, 0);
    expect(c.get('a', 1)).toBeUndefined();
    expect(c.get('c', 1)).toBe(3);
  });
});
