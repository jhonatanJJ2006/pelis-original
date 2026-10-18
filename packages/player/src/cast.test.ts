import { afterEach, describe, expect, it, vi } from 'vitest';
import { guessContentType, isCastAvailable, setupCast } from './cast';

const g = globalThis as unknown as { window?: unknown };

afterEach(() => {
  delete g.window;
});

function installFakeCast() {
  const loadMedia = vi.fn(() => Promise.resolve());
  const ctx = {
    setOptions: vi.fn(),
    requestSession: vi.fn(() => Promise.resolve()),
    getCurrentSession: vi.fn(() => ({ loadMedia })),
    endCurrentSession: vi.fn(),
  };
  class MediaInfo {
    metadata?: unknown;
    constructor(
      public contentId: string,
      public contentType: string
    ) {}
  }
  class GenericMediaMetadata {
    title?: string;
    images?: Array<{ url: string }>;
  }
  class LoadRequest {
    currentTime?: number;
    autoplay?: boolean;
    constructor(public media: MediaInfo) {}
  }
  g.window = {
    cast: { framework: { CastContext: { getInstance: () => ctx } } },
    chrome: {
      cast: {
        media: {
          DEFAULT_MEDIA_RECEIVER_APP_ID: 'CC1AD845',
          MediaInfo,
          GenericMediaMetadata,
          LoadRequest,
        },
        AutoJoinPolicy: { ORIGIN_SCOPED: 'origin_scoped' },
      },
    },
  };
  return { ctx, loadMedia };
}

describe('cast', () => {
  it('is unavailable outside the browser', async () => {
    expect(isCastAvailable()).toBe(false);
    const handle = await setupCast();
    expect(handle.isAvailable()).toBe(false);
  });

  it('guesses the content type from the URL', () => {
    expect(guessContentType('https://x/master.m3u8?t=1')).toBe('application/x-mpegurl');
    expect(guessContentType('https://x/movie.mp4')).toBe('video/mp4');
  });

  it('configures the default receiver and loads media with metadata', async () => {
    const { ctx, loadMedia } = installFakeCast();
    const handle = await setupCast();
    expect(handle.isAvailable()).toBe(true);
    expect(ctx.setOptions).toHaveBeenCalledWith({
      receiverApplicationId: 'CC1AD845',
      autoJoinPolicy: 'origin_scoped',
    });

    await handle.request({
      src: 'https://verpelis.pro/a.m3u8',
      title: 'Foo',
      poster: 'https://verpelis.pro/p.webp',
      startTime: 42,
    });
    expect(ctx.requestSession).toHaveBeenCalled();
    const request = (loadMedia.mock.calls[0] as unknown[])[0] as {
      currentTime: number;
      autoplay: boolean;
      media: { contentId: string; contentType: string; metadata: { title: string } };
    };
    expect(request.currentTime).toBe(42);
    expect(request.autoplay).toBe(true);
    expect(request.media.contentType).toBe('application/x-mpegurl');
    expect(request.media.metadata.title).toBe('Foo');

    handle.stop();
    expect(ctx.endCurrentSession).toHaveBeenCalledWith(true);
  });

  it('propagates the cancel rejection when the picker is closed', async () => {
    const { ctx, loadMedia } = installFakeCast();
    ctx.requestSession.mockImplementationOnce(() => Promise.reject('cancel'));
    const handle = await setupCast();
    await expect(handle.request({ src: 'https://x/a.mp4' })).rejects.toBe('cancel');
    expect(loadMedia).not.toHaveBeenCalled();
  });
});
