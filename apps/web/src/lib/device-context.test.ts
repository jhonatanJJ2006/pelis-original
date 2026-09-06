import { describe, expect, it } from 'vitest';
import {
  detectAndroidTv,
  detectTvDevice,
  detectTvExperience,
  readDeviceOverride,
  tvColdStartPath,
} from './device-context';

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

describe('detectTvExperience', () => {
  it('respeta ?device=tv aunque el UA sea de móvil', () => {
    expect(
      detectTvExperience({
        ua: 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 Mobile Safari/537.36',
        search: '?device=tv',
      })
    ).toBe(true);
  });

  it('respeta ?device=web aunque el UA sea de tele', () => {
    expect(
      detectTvExperience({
        ua: 'Mozilla/5.0 (Linux; Android 11; MiTV-AYFR0 Build/RTT0.211006.001)',
        search: 'device=web',
      })
    ).toBe(false);
  });
});

describe('readDeviceOverride / tvColdStartPath', () => {
  it('lee device=tv', () => {
    expect(readDeviceOverride('?device=tv&apkVersionCode=2')).toBe('tv');
    expect(readDeviceOverride('')).toBeNull();
  });

  it('manda el arranque en frío a /tv', () => {
    expect(tvColdStartPath('/', true)).toBe('/tv');
    expect(tvColdStartPath('/movies', true)).toBeNull();
    expect(tvColdStartPath('/', false)).toBeNull();
  });
});
