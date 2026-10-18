import { afterEach, describe, expect, it, vi } from 'vitest';
import { createDlnaHandle, detectDlnaSupport } from './dlna';

const g = globalThis as unknown as { window?: unknown };

afterEach(() => {
  delete g.window;
});

describe('dlna / remote playback', () => {
  it('reports no support outside the browser', () => {
    expect(detectDlnaSupport().supported).toBe(false);
  });

  it('prefers the AirPlay picker when available', async () => {
    g.window = {};
    const picker = vi.fn();
    const prompt = vi.fn();
    const video = {
      webkitShowPlaybackTargetPicker: picker,
      remote: { prompt },
      disableRemotePlayback: false,
    } as unknown as HTMLVideoElement;
    const handle = createDlnaHandle(video);
    expect(handle.supported).toBe(true);
    await handle.pick();
    expect(picker).toHaveBeenCalled();
    expect(prompt).not.toHaveBeenCalled();
  });

  it('uses the Remote Playback API otherwise and surfaces its errors', async () => {
    g.window = {};
    const error = Object.assign(new Error('mse'), { name: 'NotSupportedError' });
    const video = {
      remote: { prompt: vi.fn(() => Promise.reject(error)) },
      disableRemotePlayback: false,
    } as unknown as HTMLVideoElement;
    const handle = createDlnaHandle(video);
    expect(handle.supported).toBe(true);
    await expect(handle.pick()).rejects.toBe(error);
  });

  it('is unsupported when remote playback is disabled', async () => {
    g.window = {};
    const video = {
      remote: { prompt: vi.fn() },
      disableRemotePlayback: true,
    } as unknown as HTMLVideoElement;
    const handle = createDlnaHandle(video);
    expect(handle.supported).toBe(false);
    await expect(handle.pick()).rejects.toThrow();
  });
});
