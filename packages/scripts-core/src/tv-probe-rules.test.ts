import { describe, expect, it } from 'vitest';
import {
  OFFLINE_AFTER_FAILURES,
  detectKind,
  nextChannelState,
  verdictForKind,
} from '../../../scripts/lib/tv-probe-rules.mjs';

const offline = { streamStatus: 'offline' as const, lastStreamError: 'HTTP 503' };

describe('probe hysteresis', () => {
  it('keeps an ONLINE channel online after a single failed run', () => {
    expect(OFFLINE_AFTER_FAILURES).toBeGreaterThanOrEqual(2);
    expect(nextChannelState('ONLINE', 0, offline)).toEqual({ status: 'ONLINE', failures: 1 });
  });

  it('marks OFFLINE after consecutive failed runs', () => {
    expect(nextChannelState('ONLINE', OFFLINE_AFTER_FAILURES - 1, offline)).toEqual({
      status: 'OFFLINE',
      failures: OFFLINE_AFTER_FAILURES,
    });
  });

  it('resets on success and does not resurrect an OFFLINE channel on a failure', () => {
    expect(nextChannelState('OFFLINE', 5, { streamStatus: 'online' as const })).toEqual({
      status: 'ONLINE',
      failures: 0,
    });
    expect(nextChannelState('OFFLINE', 0, offline).status).toBe('OFFLINE');
  });

  it('marks unsupported formats OFFLINE immediately', () => {
    const verdict = verdictForKind('mpegts');
    expect(nextChannelState('ONLINE', 0, verdict).status).toBe('OFFLINE');
  });
});

describe('detectKind (probe matches what the player can play)', () => {
  it('sniffs raw MPEG-TS labeled octet-stream as unsupported', () => {
    const ts = new Uint8Array(376);
    ts[0] = 0x47;
    ts[188] = 0x47;
    const kind = detectKind('http://1.2.3.4/0.ts', 'application/octet-stream', ts);
    expect(kind).toBe('mpegts');
    expect(verdictForKind(kind).streamStatus).toBe('offline');
  });

  it('accepts progressive mp4', () => {
    const mp4 = new Uint8Array([0, 0, 0, 0x20, 0x66, 0x74, 0x79, 0x70]);
    expect(verdictForKind(detectKind('https://x.example/live', null, mp4)).streamStatus).toBe(
      'online'
    );
  });
});
