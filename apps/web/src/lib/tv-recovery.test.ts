import { describe, expect, it } from 'vitest';
import { TV_MAX_NETWORK_RECOVERIES, tvRecoveryDelayMs } from './tv-recovery';

describe('tvRecoveryDelayMs', () => {
  it('backs off exponentially and caps at 8 s', () => {
    expect([0, 1, 2, 3, 4, 10].map(tvRecoveryDelayMs)).toEqual([
      1000, 2000, 4000, 8000, 8000, 8000,
    ]);
  });

  it('limits retries so a dead channel ends in a visible error', () => {
    expect(TV_MAX_NETWORK_RECOVERIES).toBeGreaterThan(0);
    expect(TV_MAX_NETWORK_RECOVERIES).toBeLessThanOrEqual(5);
  });
});
