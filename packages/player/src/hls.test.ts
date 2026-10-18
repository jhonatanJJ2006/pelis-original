import { beforeEach, describe, expect, it, vi } from 'vitest';

type Listener = (event: string, data: unknown) => void;

const instances: FakeHls[] = [];
let supported = true;

class FakeHls {
  static Events = { ERROR: 'hlsError', FRAG_LOADED: 'hlsFragLoaded' };
  static ErrorTypes = { NETWORK_ERROR: 'networkError', MEDIA_ERROR: 'mediaError' };
  static isSupported = () => supported;

  listeners = new Map<string, Listener[]>();
  config: unknown;
  loadSource = vi.fn();
  attachMedia = vi.fn();
  destroy = vi.fn();
  recoverMediaError = vi.fn();
  startLoad = vi.fn();

  constructor(config: unknown) {
    this.config = config;
    instances.push(this);
  }

  on(event: string, cb: Listener) {
    this.listeners.set(event, [...(this.listeners.get(event) ?? []), cb]);
  }

  emit(event: string, data: unknown) {
    for (const cb of this.listeners.get(event) ?? []) cb(event, data);
  }
}

vi.mock('hls.js', () => ({ default: FakeHls }));

const { attachHls, isHlsSource } = await import('./hls');

function fakeVideo(canPlayNative = '') {
  return {
    src: '',
    canPlayType: vi.fn(() => canPlayNative),
    removeAttribute: vi.fn(),
    load: vi.fn(),
  } as unknown as HTMLVideoElement & { removeAttribute: ReturnType<typeof vi.fn> };
}

beforeEach(() => {
  instances.length = 0;
  supported = true;
});

describe('isHlsSource', () => {
  it('detects .m3u8 ignoring query and hash', () => {
    expect(isHlsSource('https://cdn/x/master.m3u8')).toBe(true);
    expect(isHlsSource('/api/stream/1/index.M3U8?token=a#t=1')).toBe(true);
    expect(isHlsSource('/movie.mp4?x=.m3u8')).toBe(false);
  });

  it('honours explicit source types', () => {
    expect(isHlsSource('/api/stream/1', 'hls')).toBe(true);
    expect(isHlsSource('/a.m3u8', 'file')).toBe(false);
  });
});

describe('attachHls', () => {
  it('assigns files directly and clears src on destroy', async () => {
    const video = fakeVideo();
    const result = await attachHls({ video, src: '/movie.mp4' });
    expect(result.native).toBe(true);
    expect(video.src).toBe('/movie.mp4');
    result.destroy();
    expect(video.removeAttribute).toHaveBeenCalledWith('src');
    expect(instances).toHaveLength(0);
  });

  it('uses hls.js with the provided config when MSE is available', async () => {
    const video = fakeVideo('maybe');
    const result = await attachHls({
      video,
      src: '/master.m3u8',
      hlsConfig: { maxBufferLength: 30 },
    });
    expect(result.native).toBe(false);
    const hls = instances[0]!;
    expect(hls.config).toEqual({ maxBufferLength: 30 });
    expect(hls.loadSource).toHaveBeenCalledWith('/master.m3u8');
    expect(hls.attachMedia).toHaveBeenCalledWith(video);
    result.destroy();
    result.destroy();
    expect(hls.destroy).toHaveBeenCalledTimes(1);
  });

  it('falls back to native HLS when hls.js is unsupported', async () => {
    supported = false;
    const video = fakeVideo('maybe');
    const result = await attachHls({ video, src: '/master.m3u8' });
    expect(result.native).toBe(true);
    expect(video.src).toBe('/master.m3u8');
  });

  it('reports an error when HLS cannot play at all', async () => {
    supported = false;
    const onError = vi.fn();
    await attachHls({ video: fakeVideo(''), src: '/master.m3u8', onError });
    expect(onError).toHaveBeenCalledOnce();
  });

  it('recovers fatal media/network errors before giving up', async () => {
    const onError = vi.fn();
    await attachHls({ video: fakeVideo(), src: '/master.m3u8', onError });
    const hls = instances[0]!;

    hls.emit('hlsError', { fatal: false, type: 'mediaError', details: 'x' });
    expect(hls.recoverMediaError).not.toHaveBeenCalled();

    hls.emit('hlsError', { fatal: true, type: 'mediaError', details: 'x' });
    hls.emit('hlsError', { fatal: true, type: 'mediaError', details: 'x' });
    expect(hls.recoverMediaError).toHaveBeenCalledTimes(2);
    expect(onError).not.toHaveBeenCalled();

    hls.emit('hlsError', { fatal: true, type: 'mediaError', details: 'bufferAppendError' });
    expect(onError).toHaveBeenCalledOnce();
    expect(hls.destroy).toHaveBeenCalledOnce();
  });

  it('retries network errors and resets the budget after a fragment loads', async () => {
    const onError = vi.fn();
    await attachHls({ video: fakeVideo(), src: '/master.m3u8', onError });
    const hls = instances[0]!;
    for (let i = 0; i < 3; i += 1) {
      hls.emit('hlsError', { fatal: true, type: 'networkError', details: 'fragLoadError' });
    }
    hls.emit('hlsFragLoaded', {});
    hls.emit('hlsError', { fatal: true, type: 'networkError', details: 'fragLoadError' });
    expect(hls.startLoad).toHaveBeenCalledTimes(4);
    expect(onError).not.toHaveBeenCalled();
  });
});
