import { describe, expect, it } from 'vitest';
import { contentTypeForTvUpstream, isHlsManifestResponse } from './tv-stream-proxy';

const segment = 'https://mcdn.example/clip/hls_1000-00030.ts';
const playlist =
  'https://stitcher.example/channel/609ae5cd48d3200007b0a98e/1539795/playlist.m3u8?sid=1';

describe('isHlsManifestResponse', () => {
  it('does not treat a mislabeled MPEG-TS segment as a playlist', () => {
    expect(isHlsManifestResponse(segment, 'application/x-mpegURL')).toBe(false);
    expect(isHlsManifestResponse(segment, 'application/vnd.apple.mpegurl')).toBe(false);
  });

  it('still treats real playlists as manifests', () => {
    expect(isHlsManifestResponse(playlist, 'application/x-mpegURL')).toBe(true);
    expect(isHlsManifestResponse('https://cdn.example/live', 'application/vnd.apple.mpegurl')).toBe(
      true
    );
  });
});

describe('contentTypeForTvUpstream', () => {
  it('replaces a playlist content-type on media segments with video/mp2t', () => {
    expect(contentTypeForTvUpstream(segment, 'application/x-mpegURL')).toBe('video/mp2t');
  });

  it('keeps a real playlist content-type', () => {
    expect(contentTypeForTvUpstream(playlist, 'application/x-mpegURL')).toBe(
      'application/vnd.apple.mpegurl'
    );
  });

  it('keeps an honest upstream media type', () => {
    expect(contentTypeForTvUpstream(segment, 'video/mp2t')).toBe('video/mp2t');
  });
});
