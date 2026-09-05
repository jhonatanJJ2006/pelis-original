import { describe, expect, it } from 'vitest';
import { detectAndroidTv, detectTvDevice } from './device-context';

describe('detectAndroidTv', () => {
  it('detecta Android TV sin Mobile en UA', () => {
    expect(
      detectAndroidTv(
        'Mozilla/5.0 (Linux; Android 11; MiTV-AYFR0 Build/RTT0.211006.001) AppleWebKit/537.36'
      )
    ).toBe(true);
  });

  it('no confunde Android móvil', () => {
    expect(
      detectAndroidTv(
        'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 Mobile Safari/537.36'
      )
    ).toBe(false);
  });
});

describe('detectTvDevice', () => {
  it('detecta Redmi / Mi Box', () => {
    expect(
      detectTvDevice(
        'Mozilla/5.0 (Linux; Android 9; Mi Box S Build/PI) AppleWebKit/537.36 Chrome/91.0.4472.114 Safari/537.36'
      )
    ).toBe(true);
  });
});
