import { describe, expect, it } from 'vitest';
import { isSpanishChannel } from './tv-spanish';

const base = { logo: '', category: 'Infantil', streamUrl: 'https://example.com/a.m3u8' };

describe('isSpanishChannel', () => {
  it('rejects known French Pluto Disney mislabel', () => {
    const r = isSpanishChannel({
      name: 'Disney Channel LatAm',
      language: 'es',
      country: 'Latinoamérica',
      streamUrl: 'https://jmp2.uk/plu-62f3e8ad2a8e8000077b013d.m3u8',
      tvgId: 'DisneyChannelLatinAmerica.ar@PanregionalHD',
    });
    expect(r.accept).toBe(false);
  });

  it('rejects Brazil tvg and Portuguese Pluto', () => {
    expect(
      isSpanishChannel({
        name: 'AgroMais',
        language: 'es',
        streamUrl: 'http://example/a.m3u8',
        tvgId: 'AgroMais.br@SD',
      }).accept,
    ).toBe(false);
    expect(
      isSpanishChannel({
        name: 'South Park LatAm',
        language: 'es',
        streamUrl: 'https://jmp2.uk/plu-609ae66b359b270007869ff1.m3u8',
        tvgId: 'ComedyCentralSouthPark.us@LatAm',
      }).accept,
    ).toBe(false);
  });

  it('rejects English language and US East', () => {
    expect(
      isSpanishChannel({
        name: 'Cartoon Network',
        language: 'en',
        country: 'Estados Unidos',
        streamUrl: 'https://amagi.tv/x.m3u8',
      }).accept,
    ).toBe(false);
    expect(
      isSpanishChannel({
        name: 'Disney Junior',
        language: 'es',
        streamUrl: 'http://23.237.104.106:8080/USA_DISNEY_JUNIOR/index.m3u8',
        tvgId: 'DisneyJunior.us@East',
      }).accept,
    ).toBe(false);
  });

  it('accepts Spanish Pluto LATAM and France 24 ES', () => {
    expect(
      isSpanishChannel({
        name: 'Pluto TV Kids',
        language: 'es',
        streamUrl: 'https://jmp2.uk/plu-5dd6dae8ce788b0009eaf77b.m3u8',
        tvgId: 'PlutoTVKids.us@LatAm',
      }).accept,
    ).toBe(true);
    expect(
      isSpanishChannel({
        name: 'France 24 Español',
        language: 'es',
        country: 'Francia',
        streamUrl: 'https://static.france24.com/live/F24_ES_LO_HLS/live_web.m3u8',
      }).accept,
    ).toBe(true);
    expect(
      isSpanishChannel({
        name: 'Euronews Spanish',
        language: 'es',
        streamUrl: 'https://jmp2.uk/plu-60d3583ef310610007fb02b1.m3u8',
        tvgId: 'EuronewsSpanish.fr@SD',
      }).accept,
    ).toBe(true);
    expect(
      isSpanishChannel({
        name: 'Latina Clasicos',
        language: 'es',
        streamUrl: 'http://example/latina.m3u8',
        tvgId: 'LatinaClasicos.pe',
      }).accept,
    ).toBe(true);
  });

  it('does not treat all jmp2.uk Pluto URLs as Spanish', () => {
    expect(
      isSpanishChannel({
        name: 'Some Channel',
        language: '',
        streamUrl: 'https://jmp2.uk/plu-aaaaaaaaaaaaaaaaaaaaaaaa.m3u8',
        tvgId: '',
      }).accept,
    ).toBe(false);
  });
});
