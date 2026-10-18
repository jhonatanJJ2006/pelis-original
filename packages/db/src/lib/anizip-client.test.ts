import { describe, expect, it } from 'vitest';
import { mapAnizipEpisodes } from './anizip-client';

describe('mapAnizipEpisodes', () => {
  it('uses the AniList-relative key for "Part 2" entries, not the TVDB season number', () => {
    // Shape returned by api.ani.zip for AniList 131681 (AoT Final Season Part 2).
    const episodes = mapAnizipEpisodes({
      episodes: {
        '1': { episodeNumber: 17, absoluteEpisodeNumber: 76, seasonNumber: 4, title: { en: 'A' } },
        '2': { episodeNumber: 18, absoluteEpisodeNumber: 77, seasonNumber: 4, title: { en: 'B' } },
        '12': { episodeNumber: 28, absoluteEpisodeNumber: 87, seasonNumber: 4 },
      },
    });
    expect(episodes.map((ep) => ep.number)).toEqual([1, 2, 12]);
    expect(episodes.map((ep) => ep.seasonEpisodeNumber)).toEqual([17, 18, 28]);
    expect(episodes.map((ep) => ep.absoluteNumber)).toEqual([76, 77, 87]);
    expect(episodes[0]!.title).toBe('A');
  });

  it('keeps plain first seasons unchanged and skips specials', () => {
    const episodes = mapAnizipEpisodes({
      episodes: {
        '1': { episodeNumber: 1, absoluteEpisodeNumber: 1, seasonNumber: 1 },
        '2': { episodeNumber: 2, absoluteEpisodeNumber: 2, seasonNumber: 1 },
        S1: { episodeNumber: 1, seasonNumber: 0 },
      },
    });
    expect(episodes.map((ep) => ep.number)).toEqual([1, 2]);
    expect(episodes[1]!.title).toBe('Episodio 2');
  });

  it('sorts numerically', () => {
    const episodes = mapAnizipEpisodes({ episodes: { '10': {}, '2': {}, '1': {} } });
    expect(episodes.map((ep) => ep.number)).toEqual([1, 2, 10]);
  });
});
