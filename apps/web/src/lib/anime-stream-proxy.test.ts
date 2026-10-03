import { describe, it, expect } from 'vitest';
import {
  buildAnimeProxyUrl,
  getMimeForUrl,
  isSafeAnimeUpstreamUrl,
  rewriteAnimeManifest,
  sanitizeAnimeReferer,
} from './anime-stream-proxy';

describe('isSafeAnimeUpstreamUrl', () => {
  it('allows the current VidNest master host and disguised segments', () => {
    expect(
      isSafeAnimeUpstreamUrl(
        'https://cdn.kryntal.top/anime/f899139df5e1059396431415e770c6dd/61b87186ab260d05003427e16ccf5657/master.m3u8'
      )
    ).toBe(true);
    expect(
      isSafeAnimeUpstreamUrl(
        'https://03nc1.livedns.my/anime/f899139df5e1059396431415e770c6dd/61b87186ab260d05003427e16ccf5657/seg-1-f1-v1-a1.jpg'
      )
    ).toBe(true);
  });

  it('rejects private hosts and unrelated sites', () => {
    expect(isSafeAnimeUpstreamUrl('https://127.0.0.1/master.m3u8')).toBe(false);
    expect(isSafeAnimeUpstreamUrl('https://example.com/video.m3u8')).toBe(false);
    // Suffixes must not match a lookalike that merely ends with the same string.
    expect(isSafeAnimeUpstreamUrl('https://notkryntal.top/master.m3u8')).toBe(false);
    expect(isSafeAnimeUpstreamUrl('https://evilmegacloud.animanga.fun/master.m3u8')).toBe(false);
  });

  it('allows the current Aniwave CDN path and prefix-less masters', () => {
    expect(
      isSafeAnimeUpstreamUrl(
        'https://px.dpopdrop89.store/cdn/092e3d2d14736a0ad53867906eb1495fdefdbcea5dbde581b5705e2a3180d495?t.m3u8'
      )
    ).toBe(true);
    expect(
      isSafeAnimeUpstreamUrl(
        'https://megap.shiora.top/f899139df5e1059396431415e770c6dd/61b87186ab260d05003427e16ccf5657/master.m3u8'
      )
    ).toBe(true);
    // Poisoned playlists point at arbitrary image CDNs — those stay blocked.
    expect(
      isSafeAnimeUpstreamUrl(
        'https://p19-ad-site-sign-sg.tiktokcdn.com/ad-site-i18n-sg/202606155d0d54ea0e810611479aaf28~tplv.image'
      )
    ).toBe(false);
  });
});

describe('rewriteAnimeManifest', () => {
  it('proxies extensionless Aniwave variants and keeps a safe referer', () => {
    const manifest = [
      '#EXTM3U',
      '#EXT-X-STREAM-INF:BANDWIDTH=546000,RESOLUTION=854x480,NAME="480"',
      '/cdn/092e3d2d14736a0ad538679025a0e7a471197ed78a7c2d6b1ead66d63180d495ae3b6d76',
    ].join('\n');
    const rewritten = rewriteAnimeManifest(
      manifest,
      'https://px.dpopdrop89.store/cdn/092e3d2d14736a0ad53867906eb1495f?t.m3u8',
      undefined,
      'https://play.echovideo.ru/'
    );
    expect(rewritten).toContain('/api/anime/stream?');
    expect(rewritten).toContain('px.dpopdrop89.store');
    expect(rewritten).toContain('r=https');
    expect(sanitizeAnimeReferer('https://evil.example/')).toBeUndefined();
    expect(sanitizeAnimeReferer('https://play.echovideo.ru/watch')).toBe(
      'https://play.echovideo.ru/'
    );
    const proxied = buildAnimeProxyUrl(
      'https://px.dpopdrop89.store/cdn/abc',
      undefined,
      'https://not-allowed.example/'
    );
    expect(proxied.startsWith('/api/anime/stream?')).toBe(true);
    expect(proxied).not.toContain('not-allowed');
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
