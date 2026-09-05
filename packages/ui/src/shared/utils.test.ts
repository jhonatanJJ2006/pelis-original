import { describe, it, expect } from 'vitest';
import { cn, formatDate, formatDuration, getProgressPercentage } from './utils';

describe('cn', () => {
  it('merges class names', () => {
    expect(cn('a', 'b')).toBe('a b');
  });

  it('filters falsy values', () => {
    expect(cn('a', false && 'b', undefined, null, 'c')).toBe('a c');
  });

  it('resolves tailwind-merge conflicts', () => {
    expect(cn('px-2', 'px-4')).toBe('px-4');
  });
});

describe('formatDate', () => {
  it('formats timestamps in Spanish', () => {
    const date = new Date(2024, 0, 15).getTime();
    expect(formatDate(date)).toMatch(/15 de enero/i);
  });
});

describe('formatDuration', () => {
  it('formats hours and minutes', () => {
    expect(formatDuration(3661)).toBe('1h 1m');
  });

  it('formats minutes and seconds below an hour', () => {
    expect(formatDuration(125)).toBe('2m 5s');
  });

  it('handles zero', () => {
    expect(formatDuration(0)).toBe('0m 0s');
  });
});

describe('getProgressPercentage', () => {
  it('computes rounded percentage', () => {
    expect(getProgressPercentage(50, 100)).toBe(50);
    expect(getProgressPercentage(33, 100)).toBe(33);
  });

  it('returns 0 when duration is 0', () => {
    expect(getProgressPercentage(10, 0)).toBe(0);
  });
});
