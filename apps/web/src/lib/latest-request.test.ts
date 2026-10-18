import { describe, expect, it } from 'vitest';
import {
  animeProviderButtonId,
  animeStreamRequestKey,
  createLatestRequestGuard,
} from './latest-request';

describe('createLatestRequestGuard', () => {
  it('ignores a stale response that arrives after a newer request', async () => {
    const guard = createLatestRequestGuard();
    const applied: string[] = [];
    const load = async (label: string, delay: number) => {
      const token = guard.begin();
      await new Promise((r) => setTimeout(r, delay));
      if (guard.isCurrent(token)) applied.push(label);
    };
    await Promise.all([load('old-episode', 30), load('new-episode', 5)]);
    expect(applied).toEqual(['new-episode']);
  });

  it('cancel() drops whatever is in flight', () => {
    const guard = createLatestRequestGuard();
    const token = guard.begin();
    guard.cancel();
    expect(guard.isCurrent(token)).toBe(false);
  });
});

describe('animeStreamRequestKey', () => {
  it('is stable for the same episode/server/language regardless of exclusion order', () => {
    const a = animeStreamRequestKey({
      animeId: 'x',
      episodeNumber: 3,
      provider: 'vidnest',
      dub: false,
      excludeProviders: ['b', 'a'],
    });
    const b = animeStreamRequestKey({
      animeId: 'x',
      episodeNumber: 3,
      provider: 'vidnest',
      dub: false,
      excludeProviders: ['a', 'b'],
    });
    expect(a).toBe(b);
    expect(
      animeStreamRequestKey({
        animeId: 'x',
        episodeNumber: 3,
        provider: 'vidnest',
        dub: true,
        excludeProviders: ['a', 'b'],
      })
    ).not.toBe(a);
  });
});

describe('animeProviderButtonId', () => {
  it('maps the VidNest HLS id back to the VidNest button', () => {
    expect(animeProviderButtonId('vidnest-hls')).toBe('vidnest');
    expect(animeProviderButtonId('mega')).toBe('mega');
    expect(animeProviderButtonId(undefined)).toBeUndefined();
  });
});
