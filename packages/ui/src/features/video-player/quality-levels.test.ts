import { describe, expect, it } from 'vitest';
import { hlsQualityOptions, qualityButtonLabel, shouldShowQualitySelector } from './quality-levels';

describe('hlsQualityOptions', () => {
  it('lists every rendition of a master playlist, highest first', () => {
    const options = hlsQualityOptions([
      { height: 480, bitrate: 1_200_000 },
      { height: 1080, bitrate: 6_000_000 },
      { height: 720, bitrate: 3_000_000 },
    ]);
    expect(options).toEqual([
      { index: 1, label: '1080p' },
      { index: 2, label: '720p' },
      { index: 0, label: '480p' },
    ]);
    expect(shouldShowQualitySelector(options)).toBe(true);
  });

  it('hides the selector for a single-rendition playlist', () => {
    const options = hlsQualityOptions([{ height: 1080, bitrate: 8_000_000 }]);
    expect(shouldShowQualitySelector(options)).toBe(false);
    expect(shouldShowQualitySelector(hlsQualityOptions([{}]))).toBe(false);
  });

  it('keeps one entry per height (highest bitrate)', () => {
    const options = hlsQualityOptions([
      { height: 720, bitrate: 2_000_000 },
      { height: 720, bitrate: 3_500_000 },
    ]);
    expect(options).toEqual([{ index: 1, label: '720p' }]);
  });
});

describe('qualityButtonLabel', () => {
  const options = [
    { index: 1, label: '1080p' },
    { index: 0, label: '480p' },
  ];

  it('shows the manual pick or Auto with the playing level', () => {
    expect(qualityButtonLabel(options, 0, 1)).toBe('480p');
    expect(qualityButtonLabel(options, -1, 1)).toBe('Auto (1080p)');
    expect(qualityButtonLabel(options, -1, -1)).toBe('Auto');
  });
});
