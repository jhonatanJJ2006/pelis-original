import { describe, expect, it } from 'vitest';
import {
  parseTvApkAvailability,
  readInstalledTvApk,
  shouldOfferTvApkUpdate,
  tvApkVersionKey,
} from './tv-apk-update';

describe('parseTvApkAvailability', () => {
  it('lee availability de TV APK', () => {
    expect(
      parseTvApkAvailability({
        tvApkAvailable: true,
        tvApkVersionCode: 4,
        tvApkVersionName: '1.2.0',
      })
    ).toEqual({
      tvApkAvailable: true,
      tvApkVersionCode: 4,
      tvApkVersionName: '1.2.0',
    });
  });

  it('ignora payloads vacíos', () => {
    expect(parseTvApkAvailability(null)).toEqual({
      tvApkAvailable: false,
      tvApkVersionCode: null,
      tvApkVersionName: null,
    });
  });
});

describe('readInstalledTvApk', () => {
  it('prioriza query string del WebView', () => {
    expect(
      readInstalledTvApk({ search: '?apkVersionCode=3&apkVersion=1.1.0', bridge: null })
    ).toEqual({
      apkVersionCode: 3,
      apkVersionName: '1.1.0',
    });
  });

  it('usa el bridge nativo si no hay query', () => {
    expect(
      readInstalledTvApk({
        search: '',
        bridge: { apkVersionCode: 2, apkVersionName: '1.0.0-debug' },
      })
    ).toEqual({ apkVersionCode: 2, apkVersionName: '1.0.0-debug' });
  });
});

describe('shouldOfferTvApkUpdate', () => {
  it('no interrumpe la primera visita', () => {
    expect(
      shouldOfferTvApkUpdate({
        storedVersion: null,
        latestVersion: 'code:4',
        dismissedVersion: null,
        apkAvailable: true,
      })
    ).toBe(false);
  });

  it('ofrece si cambió el version code', () => {
    expect(
      shouldOfferTvApkUpdate({
        storedVersion: 'code:1',
        latestVersion: 'code:4',
        dismissedVersion: null,
        apkAvailable: true,
      })
    ).toBe(true);
  });

  it('respeta Más tarde para esa versión', () => {
    expect(
      shouldOfferTvApkUpdate({
        storedVersion: 'code:1',
        latestVersion: 'code:4',
        dismissedVersion: 'code:4',
        apkAvailable: true,
      })
    ).toBe(false);
  });

  it('no ofrece si no hay APK en disco', () => {
    expect(
      shouldOfferTvApkUpdate({
        storedVersion: 'code:1',
        latestVersion: 'code:4',
        dismissedVersion: null,
        apkAvailable: false,
      })
    ).toBe(false);
  });
});

describe('tvApkVersionKey', () => {
  it('prefiere versionCode', () => {
    expect(tvApkVersionKey({ apkVersionCode: 3, apkVersionName: '1.1.0' })).toBe('code:3');
    expect(tvApkVersionKey({ apkVersionCode: null, apkVersionName: '1.1.0' })).toBe('1.1.0');
  });
});
