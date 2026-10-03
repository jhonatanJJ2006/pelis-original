import { gzipSync } from 'node:zlib';
import { describe, expect, it } from 'vitest';
import {
  decodeVidnestCipher,
  decodeVidnestCipherBytes,
  normalizeVidnestEpisodeData,
  VIDNEST_B64_ALPHABET,
} from './vidnest-client';

/** Encode UTF-8 with VidNest's custom alphabet (test helper, inverse of the decoder). */
function encodeVidnest(text: string): string {
  const bytes = Buffer.from(text, 'utf8');
  let bits = 0;
  let value = 0;
  let out = '';
  for (const byte of bytes) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 6) {
      bits -= 6;
      out += VIDNEST_B64_ALPHABET[(value >> bits) & 63];
    }
  }
  if (bits > 0) {
    out += VIDNEST_B64_ALPHABET[(value << (6 - bits)) & 63];
  }
  while (out.length % 4 !== 0) out += '=';
  return out;
}

describe('decodeVidnestCipher', () => {
  it('round-trips JSON with the custom alphabet', () => {
    const json = JSON.stringify({
      sources: [{ file: 'https://cdn.example/master.m3u8', type: 'hls' }],
    });
    expect(decodeVidnestCipher(encodeVidnest(json))).toBe(json);
  });

  it('inflates gzip payloads before returning text', () => {
    const json = '{"sources":[{"file":"https://cdn.example/a.m3u8"}]}';
    const bytes = gzipSync(Buffer.from(json));
    let bits = 0;
    let value = 0;
    let out = '';
    for (const byte of bytes) {
      value = (value << 8) | byte;
      bits += 8;
      while (bits >= 6) {
        bits -= 6;
        out += VIDNEST_B64_ALPHABET[(value >> bits) & 63];
      }
    }
    if (bits > 0) out += VIDNEST_B64_ALPHABET[(value << (6 - bits)) & 63];
    while (out.length % 4 !== 0) out += '=';

    expect(decodeVidnestCipherBytes(out)[0]).toBe(0x1f);
    expect(decodeVidnestCipher(out)).toBe(json);
  });
});

describe('normalizeVidnestEpisodeData', () => {
  it('reads Aniwave file/url/referer and subtitle aliases', () => {
    const data = normalizeVidnestEpisodeData(
      {
        sources: [
          {
            url: 'https://px.example/cdn/abc?t.m3u8',
            type: 'SUB',
            referer: 'https://play.echovideo.ru/',
          },
        ],
        subtitles: [{ url: 'https://cdn.example/a.vtt', lang: 'English', kind: 'subtitles' }],
      },
      { server: 'aniwave', defaultReferer: 'https://play.echovideo.ru/' }
    );
    expect(data.server).toBe('aniwave');
    expect(data.sources[0]).toMatchObject({
      file: 'https://px.example/cdn/abc?t.m3u8',
      referer: 'https://play.echovideo.ru/',
    });
    expect(data.tracks[0]).toMatchObject({
      file: 'https://cdn.example/a.vtt',
      label: 'English',
      kind: 'subtitles',
    });
  });

  it('applies the server default referer when the payload omits one', () => {
    const data = normalizeVidnestEpisodeData(
      { sources: [{ file: 'https://cdn.example/master.m3u8' }] },
      { server: 'aniwave', defaultReferer: 'https://play.echovideo.ru/' }
    );
    expect(data.sources[0]?.referer).toBe('https://play.echovideo.ru/');
  });
});
