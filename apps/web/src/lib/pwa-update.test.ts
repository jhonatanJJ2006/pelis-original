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
  it('no interrumpe la primera visita', () => {
    expect(
      shouldOfferWebUpdate({
        storedVersion: null,
        latestVersion: 'aaa1111',
        dismissedVersion: null,
        hasWaitingWorker: false,
      })
    ).toBe(false);
  });

  it('ofrece actualizar si version.json cambió', () => {
    expect(
      shouldOfferWebUpdate({
        storedVersion: 'aaa1111',
        latestVersion: 'bbb2222',
        dismissedVersion: null,
        hasWaitingWorker: false,
      })
    ).toBe(true);
  });

  it('ofrece actualizar si hay un service worker en waiting', () => {
    expect(
      shouldOfferWebUpdate({
        storedVersion: 'aaa1111',
        latestVersion: 'aaa1111',
        dismissedVersion: null,
        hasWaitingWorker: true,
      })
    ).toBe(true);
  });

  it('respeta «Más tarde» para esa misma versión', () => {
    expect(
      shouldOfferWebUpdate({
        storedVersion: 'aaa1111',
        latestVersion: 'bbb2222',
        dismissedVersion: 'bbb2222',
        hasWaitingWorker: true,
      })
    ).toBe(false);
  });

  it('vuelve a ofrecer si aparece otra versión después de posponer', () => {
    expect(
      shouldOfferWebUpdate({
        storedVersion: 'aaa1111',
        latestVersion: 'ccc3333',
        dismissedVersion: 'bbb2222',
        hasWaitingWorker: false,
      })
    ).toBe(true);
  });

  it('no ofrece si la versión guardada ya coincide', () => {
    expect(
      shouldOfferWebUpdate({
        storedVersion: 'aaa1111',
        latestVersion: 'aaa1111',
        dismissedVersion: null,
        hasWaitingWorker: false,
      })
    ).toBe(false);
  });
});
