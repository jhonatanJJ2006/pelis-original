import { describe, expect, it } from 'vitest';
import { clampPage, getPageCount, getPageWindow } from './admin-pagination';

describe('admin pagination', () => {
  it('counts pages of 40 and never returns zero', () => {
    expect(getPageCount(0)).toBe(1);
    expect(getPageCount(40)).toBe(1);
    expect(getPageCount(41)).toBe(2);
  });

  it('clamps the page into range', () => {
    expect(clampPage(0, 100)).toBe(1);
    expect(clampPage(9, 100)).toBe(3);
  });

  it('builds a window with gaps for long lists', () => {
    expect(getPageWindow(1, 5)).toEqual([1, 2, 3, 4, 5]);
    expect(getPageWindow(10, 20)).toEqual([1, 'gap', 9, 10, 11, 'gap', 20]);
  });
});
