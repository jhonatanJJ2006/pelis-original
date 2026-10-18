import { describe, expect, it } from 'vitest';
import { tvStreamKindFromUrl } from './tv-stream-kind';

describe('tvStreamKindFromUrl', () => {
  it('detects HLS, progressive files and raw MPEG-TS by extension', () => {
    expect(tvStreamKindFromUrl('https://cdn.example/live/index.m3u8?token=a%2Fb')).toBe('hls');
    expect(tvStreamKindFromUrl('https://cdn.example/clip.mp4')).toBe('native');
    expect(tvStreamKindFromUrl('https://cdn.example/clip.webm?x=1')).toBe('native');
    expect(tvStreamKindFromUrl('http://190.0.0.1/0.ts')).toBe('mpegts');
  });

  it('defaults extensionless URLs to HLS', () => {
    expect(tvStreamKindFromUrl('https://cdn.example/live?id=3')).toBe('hls');
    expect(tvStreamKindFromUrl(undefined)).toBe('hls');
  });
});
