import { describe, expect, it } from 'vitest';
import { resumeSeekSeconds, shouldWritePlaybackProgress } from './resume';

describe('resumeSeekSeconds', () => {
  it('seeks to a mid-movie saved progress', () => {
    expect(resumeSeekSeconds({ progress: 600, duration: 5400 }, 5400)).toBe(600);
  });

  it('does not resume credits or a glance', () => {
    expect(resumeSeekSeconds({ progress: 5200, duration: 5400 }, 5400)).toBeNull();
    expect(resumeSeekSeconds({ progress: 0.4, duration: 5400 }, 5400)).toBeNull();
    expect(resumeSeekSeconds(null, 5400)).toBeNull();
  });

  it('does not resume when saved progress is past the real file', () => {
    expect(resumeSeekSeconds({ progress: 5000, duration: 9000 }, 100)).toBeNull();
  });
});

describe('shouldWritePlaybackProgress', () => {
  it('does not persist ~0 while resume is still pending', () => {
    expect(
      shouldWritePlaybackProgress({
        current: 0.2,
        total: 5400,
        resumeSettled: false,
        resumeTarget: null,
      })
    ).toBe(false);
  });

  it('does not overwrite a saved position with the pre-seek playhead', () => {
    expect(
      shouldWritePlaybackProgress({
        current: 0.2,
        total: 5400,
        resumeSettled: true,
        resumeTarget: 600,
      })
    ).toBe(false);
  });

  it('persists once the playhead lands on the resume point', () => {
    expect(
      shouldWritePlaybackProgress({
        current: 600,
        total: 5400,
        resumeSettled: true,
        resumeTarget: 600,
      })
    ).toBe(true);
  });

  it('persists if the viewer watches from the start instead', () => {
    expect(
      shouldWritePlaybackProgress({
        current: 5,
        total: 5400,
        resumeSettled: true,
        resumeTarget: 600,
      })
    ).toBe(true);
  });
});
