import { describe, expect, it } from 'vitest';
import { formatTime, nextCaptionId } from './captions';

const tracks = [
  { id: 'es', label: 'Español', language: 'es', src: '/es.vtt' },
  { id: 'en', label: 'English', language: 'en', src: '/en.vtt' },
];

describe('nextCaptionId', () => {
  it('cycles off → es → en → off', () => {
    expect(nextCaptionId(tracks, null)).toBe('es');
    expect(nextCaptionId(tracks, 'es')).toBe('en');
    expect(nextCaptionId(tracks, 'en')).toBeNull();
  });

  it('handles missing tracks and stale ids', () => {
    expect(nextCaptionId(undefined, null)).toBeNull();
    expect(nextCaptionId([], 'es')).toBeNull();
    expect(nextCaptionId(tracks, 'fr')).toBeNull();
  });
});

describe('formatTime', () => {
  it('formats minutes and hours', () => {
    expect(formatTime(0)).toBe('0:00');
    expect(formatTime(75.9)).toBe('1:15');
    expect(formatTime(3725)).toBe('1:02:05');
  });

  it('guards against NaN, Infinity and negatives', () => {
    expect(formatTime(Number.NaN)).toBe('0:00');
    expect(formatTime(Number.POSITIVE_INFINITY)).toBe('0:00');
    expect(formatTime(-5)).toBe('0:00');
  });
});
