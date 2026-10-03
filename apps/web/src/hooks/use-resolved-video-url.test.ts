import { afterEach, describe, expect, it, vi } from 'vitest';
import { resolveVideoUrl } from './use-resolved-video-url';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('resolveVideoUrl', () => {
  it('uses the token manifest for a flat legacy playlist', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.startsWith('/api/stream/resolve')) {
        return new Response(JSON.stringify({ url: '/api/stream/tok/tok/playlist.m3u8' }), {
          status: 200,
        });
      }
      return new Response(null, { status: 404 });
    });
    vi.stubGlobal('fetch', fetchMock);

    await expect(resolveVideoUrl('/api/stream/tok/playlist.m3u8', 'tok')).resolves.toBe(
      '/api/stream/tok/tok/playlist.m3u8'
    );
  });

  it('keeps a working flat videoUrl when the token has no manifest', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.startsWith('/api/stream/resolve')) {
        return new Response(JSON.stringify({ url: null }), { status: 200 });
      }
      if (init?.method === 'HEAD') return new Response(null, { status: 200 });
      return new Response(null, { status: 404 });
    });
    vi.stubGlobal('fetch', fetchMock);

    await expect(resolveVideoUrl('/api/stream/tok/playlist.m3u8', 'tok')).resolves.toBe(
      '/api/stream/tok/playlist.m3u8'
    );
  });

  it('falls back to the token when a nested playlist HEAD fails', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.startsWith('/api/stream/resolve')) {
        return new Response(JSON.stringify({ url: '/api/stream/tok/tok/index.m3u8' }), {
          status: 200,
        });
      }
      if (init?.method === 'HEAD') throw new Error('network');
      return new Response(null, { status: 404 });
    });
    vi.stubGlobal('fetch', fetchMock);

    await expect(resolveVideoUrl('/api/stream/tok/tok/playlist.m3u8', 'tok')).resolves.toBe(
      '/api/stream/tok/tok/index.m3u8'
    );
  });

  it('returns a direct file url without asking the stream resolver', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    await expect(resolveVideoUrl('https://cdn.example/movie.mp4', 'tok')).resolves.toBe(
      'https://cdn.example/movie.mp4'
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('resolves by token when videoUrl is empty', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(
        async () =>
          new Response(JSON.stringify({ url: '/api/stream/tok/master.m3u8' }), { status: 200 })
      )
    );
    await expect(resolveVideoUrl('  ', 'tok')).resolves.toBe('/api/stream/tok/master.m3u8');
  });
});
