import { describe, expect, it, vi } from 'vitest';
import {
  createTmdbFetcher,
  lookupHeroExtras,
  pickYoutubeKey,
  sanitizeYoutubeKey,
} from './hero-extras';

describe('sanitizeYoutubeKey', () => {
  it('acepta el id de 11 caracteres y rechaza el resto', () => {
    expect(sanitizeYoutubeKey('dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
    expect(sanitizeYoutubeKey('corto')).toBeNull();
    expect(sanitizeYoutubeKey('javascript:alert(1)')).toBeNull();
    expect(sanitizeYoutubeKey(12)).toBeNull();
  });
});

describe('pickYoutubeKey', () => {
  it('prefiere el tráiler oficial en español', () => {
    expect(
      pickYoutubeKey([
        { site: 'YouTube', type: 'Teaser', key: 'teaserteas1', official: true, iso_639_1: 'en' },
        { site: 'YouTube', type: 'Trailer', key: 'trailertra1', official: false, iso_639_1: 'en' },
        { site: 'YouTube', type: 'Trailer', key: 'traileresp1', official: true, iso_639_1: 'es' },
        { site: 'Vimeo', type: 'Trailer', key: 'vimeovimeo1', official: true, iso_639_1: 'es' },
      ])
    ).toBe('traileresp1');
  });

  it('ignora claves que no son de YouTube', () => {
    expect(pickYoutubeKey([{ site: 'YouTube', type: 'Trailer', key: 'no es valida' }])).toBeNull();
  });
});

describe('lookupHeroExtras', () => {
  it('no llama a la red si el título está vacío', async () => {
    const fetchJson = vi.fn(async () => null);
    await expect(lookupHeroExtras({ name: '   ', mediaType: 'movie' }, fetchJson)).resolves.toEqual(
      { runtimeMinutes: null, youtubeKey: null }
    );
    expect(fetchJson).not.toHaveBeenCalled();
  });

  it('busca una serie en TV y devuelve duración y tráiler', async () => {
    const paths: string[] = [];
    const fetchJson = async (path: string) => {
      paths.push(path);
      if (path.startsWith('search/tv')) {
        return { results: [{ id: 99 }] };
      }
      if (path.startsWith('tv/99?')) {
        return {
          episode_run_time: [52],
          videos: {
            results: [
              {
                site: 'YouTube',
                type: 'Trailer',
                key: 'abc_def-123',
                official: true,
                iso_639_1: 'es',
              },
            ],
          },
        };
      }
      return null;
    };
    await expect(
      lookupHeroExtras({ name: 'Los asesinos', year: '2023', mediaType: 'series' }, fetchJson)
    ).resolves.toEqual({ runtimeMinutes: 52, youtubeKey: 'abc_def-123' });
    expect(paths[0]).toContain('search/tv?');
    expect(paths[0]).toContain('first_air_date_year=2023');
    expect(paths.some((path) => path.includes('api_key'))).toBe(false);
  });

  it('si el detalle en español no trae tráiler, mira los vídeos en inglés', async () => {
    const fetchJson = async (path: string) => {
      if (path.startsWith('search/movie')) return { results: [{ id: 7 }] };
      if (path.startsWith('movie/7?')) return { runtime: 166, videos: { results: [] } };
      if (path.startsWith('movie/7/videos')) {
        return {
          results: [{ site: 'YouTube', type: 'Trailer', key: 'oppenheimr1', iso_639_1: 'en' }],
        };
      }
      return null;
    };
    await expect(
      lookupHeroExtras({ name: 'Oppenheimer', year: '2023', mediaType: 'movie' }, fetchJson)
    ).resolves.toEqual({ runtimeMinutes: 166, youtubeKey: 'oppenheimr1' });
  });
});

describe('createTmdbFetcher', () => {
  it('añade la clave en la petición y no la deja en el resultado', async () => {
    const fetchImpl = vi.fn(async () => ({
      ok: true,
      json: async () => ({ runtime: 90 }),
    })) as unknown as typeof fetch;
    const fetchJson = createTmdbFetcher('test-key-no-es-real', fetchImpl);
    await expect(fetchJson('movie/1?language=es-ES')).resolves.toEqual({ runtime: 90 });
    const url = String(
      (fetchImpl as unknown as { mock: { calls: string[][] } }).mock.calls[0]?.[0]
    );
    expect(url).toContain('api_key=test-key-no-es-real');
    expect(url).toContain('/movie/1?language=es-ES');
  });
});
