import { describe, expect, it, vi } from 'vitest';
import { throttle } from './progress';

function clock(start = 0) {
  let t = start;
  return { now: () => t, advance: (ms: number) => (t += ms) };
}

describe('throttle', () => {
  it('saves at most once per interval', () => {
    const save = vi.fn();
    const c = clock();
    const saver = throttle(save, { intervalMs: 5000, now: c.now });
    saver.call(1, 100);
    saver.call(2, 100);
    c.advance(4999);
    saver.call(3, 100);
    expect(save).toHaveBeenCalledTimes(1);
    c.advance(1);
    saver.call(4, 100);
    expect(save).toHaveBeenLastCalledWith(4, 100);
    expect(save).toHaveBeenCalledTimes(2);
  });

  it('saves once when crossing the near-end threshold, not on every tick', () => {
    const save = vi.fn();
    const c = clock();
    const saver = throttle(save, { intervalMs: 5000, now: c.now });
    saver.call(10, 100);
    saver.call(95, 100);
    saver.call(96, 100);
    saver.call(97, 100);
    expect(save.mock.calls).toEqual([
      [10, 100],
      [95, 100],
    ]);
  });

  it('flush persists the latest unsaved position', async () => {
    const save = vi.fn();
    const c = clock();
    const saver = throttle(save, { intervalMs: 5000, now: c.now });
    saver.call(1, 100);
    saver.call(3, 100);
    await saver.flush();
    expect(save).toHaveBeenLastCalledWith(3, 100);
    await saver.flush();
    expect(save).toHaveBeenCalledTimes(2);
  });

  it('ignores invalid durations and swallows saver failures', async () => {
    const save = vi.fn(() => Promise.reject(new Error('offline')));
    const saver = throttle(save);
    saver.call(5, Number.NaN);
    saver.call(5, 0);
    expect(save).not.toHaveBeenCalled();
    saver.call(5, 100);
    await expect(saver.flush()).resolves.toBeUndefined();
  });
});
