import { describe, expect, it } from 'vitest';
import { parseAvailabilityVersion, parseVersionPayload, shouldOfferWebUpdate } from './pwa-update';

describe('parseVersionPayload', () => {
  it('lee version.json válido', () => {
    expect(parseVersionPayload({ version: 'abc1234', builtAt: '2026-09-05' })).toEqual({
      version: 'abc1234',
    });
  });

  it('lee webVersion de /api/app/availability', () => {
    expect(
      parseAvailabilityVersion({
        webVersion: 'ec00d50',
        webBuiltAt: '2026-09-05T00:00:00.000Z',
        apkAvailable: true,
      })
    ).toEqual({ version: 'ec00d50' });
  });

  it('ignora availability sin webVersion', () => {
    expect(parseAvailabilityVersion({ apkAvailable: true })).toEqual({ version: null });
    expect(parseAvailabilityVersion(null)).toEqual({ version: null });
  });

  it('ignora payloads vacíos o mal formados', () => {
    expect(parseVersionPayload(null)).toEqual({ version: null });
    expect(parseVersionPayload({})).toEqual({ version: null });
    expect(parseVersionPayload({ version: '   ' })).toEqual({ version: null });
    expect(parseVersionPayload({ version: 12 })).toEqual({ version: null });
  });
});

describe('shouldOfferWebUpdate', () => {
  const cases = [
    {
      name: 'primera visita',
      storedVersion: null,
      latestVersion: 'aaa1111',
      dismissedVersion: null,
      hasWaitingWorker: false,
    },
    {
      name: 'version.json cambió',
      storedVersion: 'aaa1111',
      latestVersion: 'bbb2222',
      dismissedVersion: null,
      hasWaitingWorker: false,
    },
    {
      name: 'service worker en waiting',
      storedVersion: 'aaa1111',
      latestVersion: 'aaa1111',
      dismissedVersion: null,
      hasWaitingWorker: true,
    },
    {
      name: 'versión pospuesta y worker en waiting',
      storedVersion: 'aaa1111',
      latestVersion: 'bbb2222',
      dismissedVersion: 'bbb2222',
      hasWaitingWorker: true,
    },
    {
      name: 'otra versión después de posponer',
      storedVersion: 'aaa1111',
      latestVersion: 'ccc3333',
      dismissedVersion: 'bbb2222',
      hasWaitingWorker: false,
    },
    {
      name: 'versión guardada ya coincide',
      storedVersion: 'aaa1111',
      latestVersion: 'aaa1111',
      dismissedVersion: null,
      hasWaitingWorker: false,
    },
  ] as const;

  it.each(cases)('no muestra el aviso web ($name)', (input) => {
    expect(shouldOfferWebUpdate(input)).toBe(false);
  });
});
