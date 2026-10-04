import { describe, expect, it } from 'vitest';
import { hasInFlightHlsFragment, shouldRestartHlsLoad } from './hls-prefetch';

describe('shouldRestartHlsLoad', () => {
  it('does not abort a healthy segment that is still downloading', () => {
    expect(shouldRestartHlsLoad({ seeking: true, readyState: 0, hasInFlightFragment: true })).toBe(
      false
    );
    expect(hasInFlightHlsFragment({ main: { url: '000.ts' }, audio: null })).toBe(true);
  });

  it('restarts only when the seek is stuck and the loader is idle', () => {
    expect(shouldRestartHlsLoad({ seeking: true, readyState: 1, hasInFlightFragment: false })).toBe(
      true
    );
    expect(hasInFlightHlsFragment({ main: null, audio: null })).toBe(false);
    expect(
      hasInFlightHlsFragment({ main: { frag: null, state: 'IDLE' }, audio: { frag: null } })
    ).toBe(false);
    expect(
      hasInFlightHlsFragment({
        main: { frag: { url: '000.ts' }, state: 'LOADING' },
      })
    ).toBe(true);
  });

  it('does not restart once a frame is available or the seek ended', () => {
    expect(shouldRestartHlsLoad({ seeking: true, readyState: 2, hasInFlightFragment: false })).toBe(
      false
    );
    expect(
      shouldRestartHlsLoad({ seeking: false, readyState: 0, hasInFlightFragment: false })
    ).toBe(false);
  });
});
