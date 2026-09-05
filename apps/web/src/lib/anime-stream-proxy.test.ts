import { describe, it, expect } from 'vitest';
import { getMimeForUrl, isSafeAnimeUpstreamUrl } from './anime-stream-proxy';

describe('isSafeAnimeUpstreamUrl', () => {
  it('allows the current VidNest master host and disguised segments', () => {
    expect(
      isSafeAnimeUpstreamUrl(
        'https://cdn.kryntal.top/anime/f899139df5e1059396431415e770c6dd/61b87186ab260d05003427e16ccf5657/master.m3u8',
      ),
    ).toBe(true);
    expect(
      isSafeAnimeUpstreamUrl(
        'https://03nc1.livedns.my/anime/f899139df5e1059396431415e770c6dd/61b87186ab260d05003427e16ccf5657/seg-1-f1-v1-a1.jpg',
      ),
    ).toBe(true);
  });

  it('rejects private hosts and unrelated sites', () => {
    expect(isSafeAnimeUpstreamUrl('https://127.0.0.1/master.m3u8')).toBe(false);
    expect(isSafeAnimeUpstreamUrl('https://example.com/video.m3u8')).toBe(false);
  });
});

describe('getMimeForUrl', () => {
  it('treats disguised CDN segments as MPEG-TS', () => {
    expect(getMimeForUrl('https://cdn.example/seg.css')).toBe('video/mp2t');
    expect(getMimeForUrl('https://cdn.example/seg.txt')).toBe('video/mp2t');
    expect(getMimeForUrl('https://cdn.example/seg.webp')).toBe('video/mp2t');
    expect(getMimeForUrl('https://cdn.example/master.m3u8')).toBe('application/vnd.apple.mpegurl');
  });
});
