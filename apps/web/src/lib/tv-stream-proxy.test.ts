import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  buildTvProxyUrl,
  contentTypeForTvUpstream,
  detectTvStreamKind,
  fetchUpstream,
  isHlsManifestResponse,
  probeVerdictForKind,
  rewriteTvManifest,
  upstreamUrlFromSearchParams,
  withIdleTimeout,
} from './tv-stream-proxy';

const segment = 'https://mcdn.example/clip/hls_1000-00030.ts';
const playlist =
  'https://stitcher.example/channel/609ae5cd48d3200007b0a98e/1539795/playlist.m3u8?sid=1';

describe('isHlsManifestResponse', () => {
  it('does not treat a mislabeled MPEG-TS segment as a playlist', () => {
    expect(isHlsManifestResponse(segment, 'application/x-mpegURL')).toBe(false);
    expect(isHlsManifestResponse(segment, 'application/vnd.apple.mpegurl')).toBe(false);
  });

  it('still treats real playlists as manifests', () => {
    expect(isHlsManifestResponse(playlist, 'application/x-mpegURL')).toBe(true);
    expect(isHlsManifestResponse('https://cdn.example/live', 'application/vnd.apple.mpegurl')).toBe(
      true
    );
  });
});

describe('contentTypeForTvUpstream', () => {
  it('replaces a playlist content-type on media segments with video/mp2t', () => {
    expect(contentTypeForTvUpstream(segment, 'application/x-mpegURL')).toBe('video/mp2t');
  });

  it('keeps a real playlist content-type', () => {
    expect(contentTypeForTvUpstream(playlist, 'application/x-mpegURL')).toBe(
      'application/vnd.apple.mpegurl'
    );
  });

  it('keeps an honest upstream media type', () => {
    expect(contentTypeForTvUpstream(segment, 'video/mp2t')).toBe('video/mp2t');
  });
});

describe('signed upstream URLs through the proxy', () => {
  const signed =
    'https://cdn.example/live/seg-001.ts?token=ab%2Fcd%3D%3D&sig=x+y%2Bz&exp=1700000000';

  it('round-trips a signed URL with %2F, %3D and + through a single decode', () => {
    const proxied = buildTvProxyUrl('chan1', signed, 'https://verpelis.pro');
    const parsed = new URL(proxied);
    expect(upstreamUrlFromSearchParams(parsed.searchParams)).toBe(signed);
  });

  it('keeps signed segment URLs intact after a manifest rewrite', () => {
    const manifest = ['#EXTM3U', '#EXTINF:6,', signed].join('\n');
    const rewritten = rewriteTvManifest(
      manifest,
      'https://cdn.example/live/index.m3u8',
      'chan1',
      'https://verpelis.pro'
    );
    const segmentLine = rewritten.split('\n')[2]!;
    expect(upstreamUrlFromSearchParams(new URL(segmentLine).searchParams)).toBe(signed);
  });

  it('a second decodeURIComponent would corrupt the URL (regression guard)', () => {
    const proxied = new URL(buildTvProxyUrl('chan1', signed, 'https://verpelis.pro'));
    const once = proxied.searchParams.get('u')!;
    expect(decodeURIComponent(once)).not.toBe(signed);
    expect(upstreamUrlFromSearchParams(proxied.searchParams)).toBe(once);
  });

  it('returns null when there is no u param', () => {
    expect(upstreamUrlFromSearchParams(new URLSearchParams())).toBeNull();
  });
});

describe('fetchUpstream timeouts', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it('times out only the connect phase, not the body', async () => {
    let seenSignal: AbortSignal | undefined;
    vi.stubGlobal(
      'fetch',
      vi.fn(async (_url: string, init: RequestInit) => {
        seenSignal = init.signal ?? undefined;
        return new Response('ok');
      })
    );
    vi.useFakeTimers();
    await fetchUpstream('https://cdn.example/live.ts', { connectTimeoutMs: 1000 });
    vi.advanceTimersByTime(60_000);
    expect(seenSignal?.aborted).toBe(false);
  });

  it('aborts when the upstream does not answer headers in time', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(
        (_url: string, init: RequestInit) =>
          new Promise((_resolve, reject) => {
            init.signal?.addEventListener('abort', () => reject(new Error('aborted')));
          })
      )
    );
    await expect(
      fetchUpstream('https://cdn.example/live.ts', { connectTimeoutMs: 20 })
    ).rejects.toThrow();
  });

  it('forwards an external abort (viewer left)', async () => {
    let seenSignal: AbortSignal | undefined;
    vi.stubGlobal(
      'fetch',
      vi.fn(async (_url: string, init: RequestInit) => {
        seenSignal = init.signal ?? undefined;
        return new Response('ok');
      })
    );
    const outer = new AbortController();
    await fetchUpstream('https://cdn.example/live.ts', { signal: outer.signal });
    outer.abort();
    expect(seenSignal?.aborted).toBe(true);
  });
});

describe('withIdleTimeout', () => {
  it('passes a long stream through as long as chunks keep arriving', async () => {
    let n = 0;
    const source = new ReadableStream<Uint8Array>({
      async pull(controller) {
        await new Promise((r) => setTimeout(r, 5));
        if (n++ >= 10) controller.close();
        else controller.enqueue(new Uint8Array([n]));
      },
    });
    const onIdle = vi.fn();
    const text = await new Response(withIdleTimeout(source, 50, onIdle)).arrayBuffer();
    expect(new Uint8Array(text).length).toBe(10);
    expect(onIdle).not.toHaveBeenCalled();
  });

  it('stops and reports when the upstream goes silent', async () => {
    const source = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new Uint8Array([1]));
      },
    });
    const onIdle = vi.fn();
    const reader = withIdleTimeout(source, 20, onIdle).getReader();
    expect((await reader.read()).value).toEqual(new Uint8Array([1]));
    await reader.read().catch(() => undefined);
    expect(onIdle).toHaveBeenCalledTimes(1);
  });
});

describe('detectTvStreamKind / probeVerdictForKind', () => {
  const ts = new Uint8Array(376);
  ts[0] = 0x47;
  ts[188] = 0x47;
  const mp4 = new Uint8Array([0, 0, 0, 0x20, 0x66, 0x74, 0x79, 0x70, 0x69, 0x73, 0x6f, 0x6d]);

  it('sniffs raw MPEG-TS served as application/octet-stream', () => {
    const kind = detectTvStreamKind({
      url: 'http://186.0.0.1:8000/play/a00d',
      contentType: 'application/octet-stream',
      firstBytes: ts,
    });
    expect(kind).toBe('mpegts');
    expect(probeVerdictForKind(kind).streamStatus).toBe('offline');
  });

  it('marks progressive mp4 as playable', () => {
    const kind = detectTvStreamKind({
      url: 'https://cdn.example/live',
      contentType: 'application/octet-stream',
      firstBytes: mp4,
    });
    expect(kind).toBe('native');
    expect(probeVerdictForKind(kind).streamStatus).toBe('online');
  });

  it('recognises playlists and unknown content', () => {
    expect(detectTvStreamKind({ url: playlist, contentType: 'application/x-mpegURL' })).toBe('hls');
    expect(
      detectTvStreamKind({
        url: 'https://cdn.example/x',
        contentType: 'text/html',
        firstBytes: new TextEncoder().encode('<html>'),
      })
    ).toBe('unknown');
    expect(probeVerdictForKind('unknown').streamStatus).toBe('offline');
  });
});
