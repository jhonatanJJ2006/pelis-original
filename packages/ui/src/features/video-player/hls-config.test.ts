import { describe, it, expect } from 'vitest';
import {
  HLS_ASSUMED_SEGMENT_SECONDS,
  HLS_MAX_BUFFER_SIZE_BYTES,
  HLS_PREFETCH_SEGMENTS,
  HLS_TARGET_FORWARD_BUFFER_SECONDS,
  createVodHlsConfig,
  nextHlsSegmentUrls,
  parseHlsPlaylist,
} from './hls-config';

describe('createVodHlsConfig', () => {
  it('prefetches fragments and keeps at least 3 segments of buffer ahead', () => {
    const config = createVodHlsConfig();
    expect(HLS_PREFETCH_SEGMENTS).toBe(3);
    expect(config.startFragPrefetch).toBe(true);
    expect(config.maxBufferLength).toBe(HLS_TARGET_FORWARD_BUFFER_SECONDS);
    expect(config.maxBufferLength).toBe(HLS_PREFETCH_SEGMENTS * HLS_ASSUMED_SEGMENT_SECONDS);
    expect(config.maxMaxBufferLength).toBeGreaterThanOrEqual(config.maxBufferLength!);
    expect(config.maxBufferSize).toBe(HLS_MAX_BUFFER_SIZE_BYTES);
    expect(config.maxBufferSize).toBeGreaterThan(60 * 1000 * 1000);
  });
});

describe('nextHlsSegmentUrls', () => {
  const urls = ['a.ts', 'b.ts', 'c.ts', 'd.ts', 'e.ts'];

  it('returns the next 3 URLs after the playhead index', () => {
    expect(nextHlsSegmentUrls(urls, 0)).toEqual(['b.ts', 'c.ts', 'd.ts']);
    expect(nextHlsSegmentUrls(urls, 2)).toEqual(['d.ts', 'e.ts']);
  });

  it('returns the first 3 when the playhead has not started', () => {
    expect(nextHlsSegmentUrls(urls, -1)).toEqual(['a.ts', 'b.ts', 'c.ts']);
  });
});

describe('parseHlsPlaylist', () => {
  it('resolves media segment URLs and EXTINF durations', () => {
    const manifest = [
      '#EXTM3U',
      '#EXT-X-TARGETDURATION:10',
      '#EXTINF:9.6,',
      'seg0.ts',
      '#EXTINF:10,',
      'https://cdn.example/seg1.ts',
    ].join('\n');
    const parsed = parseHlsPlaylist(manifest, 'https://play.example/vod/index.m3u8');
    expect(parsed.isMaster).toBe(false);
    expect(parsed.urls).toEqual([
      'https://play.example/vod/seg0.ts',
      'https://cdn.example/seg1.ts',
    ]);
    expect(parsed.durations).toEqual([9.6, 10]);
  });

  it('detects master playlists', () => {
    const manifest = ['#EXTM3U', '#EXT-X-STREAM-INF:BANDWIDTH=800000', 'media.m3u8'].join('\n');
    const parsed = parseHlsPlaylist(manifest, 'https://play.example/master.m3u8');
    expect(parsed.isMaster).toBe(true);
    expect(parsed.urls).toEqual(['https://play.example/media.m3u8']);
  });
});
