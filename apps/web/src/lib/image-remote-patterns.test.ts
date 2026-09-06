import { describe, expect, it } from 'vitest';
import { imageRemotePatterns } from '../../image-remote-patterns.mjs';

const KNOWN_IMAGE_URLS = [
  'https://image.tmdb.org/t/p/w342/poster.jpg',
  'https://cdn.myanimelist.net/images/anime/1565/111305l.jpg',
  'https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx16498-73IhOXpJZiMF.jpg',
  'https://images.pluto.tv/channels/60d3583ef310610007fb02b1/colorLogoPNG.png',
  'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8d/France_24_logo_2018.svg/512px-France_24_logo_2018.svg.png',
  'https://i.imgur.com/XsvbAWR.png',
  'https://images.unsplash.com/photo-1534796636912-3b95b3ab5986?w=600',
  'https://lh3.googleusercontent.com/a/default-user',
];

describe('imageRemotePatterns', () => {
  it('allows every host used by real poster / logo / avatar URLs', () => {
    const hosts = new Set(imageRemotePatterns.map((p) => p.hostname));
    for (const url of KNOWN_IMAGE_URLS) {
      expect(hosts.has(new URL(url).hostname)).toBe(true);
    }
  });

  it('only lists https remotes', () => {
    expect(imageRemotePatterns.every((p) => p.protocol === 'https')).toBe(true);
  });
});
