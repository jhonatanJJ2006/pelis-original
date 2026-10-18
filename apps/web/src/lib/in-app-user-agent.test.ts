import { describe, expect, it } from 'vitest';
import { isPelisAppUserAgent } from './in-app-user-agent';

describe('isPelisAppUserAgent', () => {
  it('reconoce la app de TV y la app nativa', () => {
    expect(isPelisAppUserAgent('PelisTV/1.2.0 (Android TV; pro.verpelis.tv)')).toBe(true);
    expect(isPelisAppUserAgent('PelisTV-Updater')).toBe(true);
    expect(isPelisAppUserAgent('PelisAndroid/1.0 (native)')).toBe(true);
  });

  it('no bloquea navegadores (incluido Downloader en Fire TV)', () => {
    expect(isPelisAppUserAgent(null)).toBe(false);
    expect(
      isPelisAppUserAgent(
        'Mozilla/5.0 (Linux; Android 9; AFTMM Build/PS7233; wv) AppleWebKit/537.36 Chrome/112.0 Mobile Safari/537.36'
      )
    ).toBe(false);
    expect(
      isPelisAppUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/130.0 Safari/537.36')
    ).toBe(false);
  });
});
