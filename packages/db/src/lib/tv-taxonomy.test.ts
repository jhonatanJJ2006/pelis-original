import { describe, expect, it } from 'vitest';
import {
  channelMatchesCategory,
  cleanTvTitle,
  isPublicCatalogName,
  mapTvCategory,
  normalizeCountry,
  normalizeLanguage,
  normalizeChannelFields,
} from './tv-taxonomy';

describe('cleanTvTitle', () => {
  it('strips quality and geo tags', () => {
    expect(cleanTvTitle('Clan Internacional Americas (1080p) [Geo-blocked]')).toBe(
      'Clan Internacional Americas',
    );
    expect(cleanTvTitle('BabyTV Latin America (720p)')).toBe('BabyTV Latin America');
    expect(cleanTvTitle('Teledeporte (720p) [Geo-blocked]')).toBe('Teledeporte');
  });

  it('rescues mangled M3U leftovers', () => {
    expect(
      cleanTvTitle(
        'like Gecko) Chrome/124.0.0.0 Safari/537.36" group-title="General",Global TV (1080p)',
      ),
    ).toBe('Global TV');
  });
});

describe('mapTvCategory', () => {
  it('collapses English semicolon tags into one Spanish category', () => {
    expect(mapTvCategory('Classic;Comedy;Public;Series')).toBe('Series');
    expect(mapTvCategory('Animation;Kids')).toBe('Infantil');
    expect(mapTvCategory('Animation;Anime')).toBe('Anime');
    expect(mapTvCategory('News;Sports')).toBe('Deportes');
    expect(mapTvCategory('Undefined')).toBe('General');
    expect(mapTvCategory('Religious')).toBe('Religión');
    expect(mapTvCategory('Entertainment')).toBe('Entretenimiento');
  });

  it('uses the name for featured groupings', () => {
    expect(mapTvCategory('Deportes', 'FIFA+ Spain')).toBe('Fútbol');
    expect(mapTvCategory('Deportes', 'TyC Sports')).toBe('Fútbol');
    expect(mapTvCategory('General', 'Disney Channel LatAm')).toBe('Infantil');
    expect(mapTvCategory('General', 'Sky F1')).toBe('Fórmula 1');
    expect(mapTvCategory('Deportes', 'WWE Raw')).toBe('Lucha libre');
  });

  it('keeps already-canonical Spanish categories', () => {
    expect(mapTvCategory('Noticias', 'France 24 Español')).toBe('Noticias');
    expect(mapTvCategory('Infantil', 'Pluto TV Kids')).toBe('Infantil');
  });
});

describe('normalizeCountry / language', () => {
  it('merges ES and España', () => {
    expect(normalizeCountry('ES')).toBe('España');
    expect(normalizeCountry('España')).toBe('España');
    expect(normalizeCountry('Desconocido')).toBeNull();
  });

  it('normalizes language codes', () => {
    expect(normalizeLanguage('Spanish')).toBe('es');
    expect(normalizeLanguage('es')).toBe('es');
  });
});

describe('isPublicCatalogName', () => {
  it('rejects Cyrillic-heavy titles', () => {
    expect(isPublicCatalogName('Первый канал')).toBe(false);
    expect(isPublicCatalogName('Caracol TV')).toBe(true);
  });
});

describe('normalizeChannelFields', () => {
  it('returns a clean row', () => {
    const row = normalizeChannelFields({
      name: 'Disney Channel Latin America (1080p)',
      category: 'Undefined',
      country: 'ES',
      language: 'Spanish',
    });
    expect(row.name).toBe('Disney Channel Latin America');
    expect(row.category).toBe('Infantil');
    expect(row.country).toBe('España');
    expect(row.language).toBe('es');
  });
});

describe('channelMatchesCategory', () => {
  it('matches display category even when DB still has English tags', () => {
    expect(
      channelMatchesCategory({ name: 'Euronews', category: 'News' }, 'Noticias'),
    ).toBe(true);
    expect(
      channelMatchesCategory({ name: 'Random', category: 'News' }, 'Deportes'),
    ).toBe(false);
  });

  it('matches name-derived featured categories', () => {
    expect(
      channelMatchesCategory({ name: 'FIFA+ Spain', category: 'Deportes' }, 'Fútbol'),
    ).toBe(true);
    expect(
      channelMatchesCategory({ name: 'WWE Raw', category: 'Deportes' }, 'Lucha libre'),
    ).toBe(true);
    expect(
      channelMatchesCategory({ name: 'Disney Channel LatAm', category: 'Undefined' }, 'Infantil'),
    ).toBe(true);
  });
});
