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

describe('vidnest v2 nonce + cipher', () => {
  it('adds a random _n nonce only to VidNest API urls', async () => {
    const { withVidnestNonce } = await import('./vidnest-client');
    expect(withVidnestNonce('https://new.vidnest.fun/aniwave_hls/21/1/sub')).toMatch(
      /\?_n=[\w-]{20,}$/
    );
    expect(withVidnestNonce('https://example.com/x')).toBe('https://example.com/x');
  });

  it('decrypts a v2 AES-GCM payload', async () => {
    const crypto = await import('node:crypto');
    const { decryptVidnestV2 } = await import('./vidnest-client');
    const n = 'nonce123';
    const key = crypto.createHash('sha256').update(`${n}|secret`).digest();
    const iv = crypto.randomBytes(12);
    const c = crypto.createCipheriv('aes-256-gcm', key, iv);
    const enc = Buffer.concat([c.update(JSON.stringify({ sources: [{ url: 'a' }] })), c.final()]);
    const d = Buffer.concat([iv, enc, c.getAuthTag()]).toString('base64url');
    expect(decryptVidnestV2(d, n, 'secret')).toEqual({ sources: [{ url: 'a' }] });
  });
});
