import { afterEach, describe, expect, it, vi } from 'vitest';
import { resolveVideoPlayback, resolveVideoUrl } from './use-resolved-video-url';

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

describe('resolveVideoPlayback errors', () => {
  const stub = (handler: (url: string, init?: RequestInit) => Response | Promise<Response>) =>
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => handler(String(input), init))
    );
  const json = (body: unknown, status: number) =>
    new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

  it('401 → inicia sesión', async () => {
    stub(() => json({ error: 'No autenticado', code: 'unauthenticated' }, 401));
    const result = await resolveVideoPlayback('/api/stream/tok/tok/playlist.m3u8', 'tok');
    expect(result.url).toBeNull();
    expect(result.error?.kind).toBe('unauthenticated');
    expect(result.error?.message).toMatch(/Inicia sesión/);
  });

  it('403 → necesitas un plan activo', async () => {
    stub(() => json({ error: 'Requiere plan activo', code: 'no_plan' }, 403));
    const result = await resolveVideoPlayback(undefined, 'tok');
    expect(result.error?.kind).toBe('no_plan');
  });

  it('404 → video no disponible en el servidor', async () => {
    stub((url) =>
      url.startsWith('/api/stream/resolve')
        ? json({ url: null, code: 'video_missing' }, 404)
        : new Response(null, { status: 404 })
    );
    const result = await resolveVideoPlayback('/api/stream/tok/tok/playlist.m3u8', 'tok');
    expect(result.error?.kind).toBe('missing');
    expect(result.error?.message).toMatch(/servidor/);
  });

  it('disk not mounted → disk (retryable)', async () => {
    stub((url) =>
      url.startsWith('/api/stream/resolve')
        ? json({ url: null, code: 'disk_unavailable' }, 503)
        : new Response(null, { status: 503 })
    );
    const result = await resolveVideoPlayback('/api/stream/tok/tok/playlist.m3u8', 'tok');
    expect(result.error?.kind).toBe('disk');
    expect(result.error?.retryable).toBe(true);
  });

  it('network failure → error de conexión + reintentar', async () => {
    stub(() => {
      throw new TypeError('Failed to fetch');
    });
    const result = await resolveVideoPlayback(undefined, 'tok');
    expect(result.error?.kind).toBe('network');
    expect(result.error?.retryable).toBe(true);
  });

  it('prefers the resolver (master.m3u8) over a working single-rendition videoUrl', async () => {
    stub((url) =>
      url.startsWith('/api/stream/resolve')
        ? json({ url: '/api/stream/tok/tok/master.m3u8' }, 200)
        : new Response(null, { status: 200 })
    );
    await expect(resolveVideoPlayback('/api/stream/tok/tok/playlist.m3u8', 'tok')).resolves.toEqual(
      { url: '/api/stream/tok/tok/master.m3u8' }
    );
  });
});
