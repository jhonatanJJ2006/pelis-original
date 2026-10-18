import { afterEach, describe, expect, it, vi } from 'vitest';
import { ANIME_STREAM_BUDGET_MS, TimeBudget, withTimeout } from './time-budget';

describe('withTimeout', () => {
  afterEach(() => vi.useRealTimers());

  it('returns the value when it arrives in time', async () => {
    await expect(withTimeout(Promise.resolve(1), 100, 0)).resolves.toBe(1);
  });

  it('returns the fallback on timeout or rejection', async () => {
    vi.useFakeTimers();
    const slow = withTimeout(new Promise<number>(() => {}), 1000, -1);
    vi.advanceTimersByTime(1000);
    await expect(slow).resolves.toBe(-1);
    await expect(withTimeout(Promise.reject(new Error('x')), 100, -2)).resolves.toBe(-2);
  });
});

describe('TimeBudget', () => {
  it('stays well under the 100 s Cloudflare limit', () => {
    expect(ANIME_STREAM_BUDGET_MS).toBeLessThanOrEqual(30_000);
  });

  it('caps each step by the remaining overall time', async () => {
    let now = 0;
    const budget = new TimeBudget(10_000, () => now);
    now = 9_990;
    expect(budget.remaining()).toBe(10);
    now = 10_000;
    expect(budget.expired()).toBe(true);
    const step = vi.fn(async () => 'value');
    await expect(budget.run(step, 5_000, 'fallback')).resolves.toBe('fallback');
    expect(step).not.toHaveBeenCalled();
  });

  it('runs a step while time remains', async () => {
    const budget = new TimeBudget(1_000);
    await expect(budget.run(async () => 'ok', 500, 'fallback')).resolves.toBe('ok');
    await expect(
      budget.run(
        () => {
          throw new Error('sync');
        },
        500,
        'fallback'
      )
    ).resolves.toBe('fallback');
  });
});
