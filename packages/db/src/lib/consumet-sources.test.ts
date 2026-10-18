import { describe, expect, it } from 'vitest';
import { toConsumetHlsSources } from './consumet-sources';

describe('toConsumetHlsSources', () => {
  it('devuelve URLs directas cuando el CDN no exige Referer', () => {
    const out = toConsumetHlsSources({
      sources: [
        { url: 'https://cdn.example/720.m3u8', quality: '720p' },
        { url: 'https://cdn.example/master.m3u8', quality: 'auto' },
        { url: 'https://cdn.example/720.m3u8', quality: '720p' },
      ],
      subtitles: [
        { url: 'https://cdn.example/es.vtt', lang: 'Spanish' },
        { url: 'https://cdn.example/thumbs.vtt', lang: 'thumbnails' },
      ],
    });
    expect(out.sources.map((s) => s.url)).toEqual([
      'https://cdn.example/master.m3u8',
      'https://cdn.example/720.m3u8',
    ]);
    expect(out.sources[0]).toMatchObject({ isM3U8: true });
    expect(out.sources[0]?.directUrl).toBeUndefined();
    expect(out.subtitles).toEqual([{ url: 'https://cdn.example/es.vtt', lang: 'Spanish' }]);
  });

  it('pasa por el proxy y expone directUrl + headers cuando hace falta Referer', () => {
    const out = toConsumetHlsSources({
      sources: [{ url: 'https://cdn.example/a.m3u8', quality: 'default', isM3U8: true }],
      subtitles: [],
      headers: { Referer: 'https://megacloud.blog/' },
    });
    const [src] = out.sources;
    expect(src?.url.startsWith('/api/anime/stream?u=')).toBe(true);
    expect(src?.url).toContain('r=https%3A%2F%2Fmegacloud.blog%2F');
    expect(src?.directUrl).toBe('https://cdn.example/a.m3u8');
    expect(src?.headers).toEqual({ Referer: 'https://megacloud.blog/' });
  });

  it('descarta fuentes sin URL http(s)', () => {
    const out = toConsumetHlsSources({
      sources: [{ url: 'javascript:alert(1)', quality: 'auto' }],
      subtitles: [],
    });
    expect(out.sources).toEqual([]);
  });
});
