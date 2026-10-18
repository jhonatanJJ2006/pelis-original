import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  MANIFEST_CANDIDATES,
  getOutputRoots,
  resolveStreamPath,
  findManifestForToken,
  rewriteM3u8Manifest,
  parseByteRange,
} from './movie-stream-paths';

describe('getOutputRoots', () => {
  const originalMulti = process.env.MOVIE_OUTPUT_ROOTS;
  const originalSingle = process.env.MOVIE_OUTPUT_ROOT;

  afterEach(() => {
    if (originalMulti === undefined) delete process.env.MOVIE_OUTPUT_ROOTS;
    else process.env.MOVIE_OUTPUT_ROOTS = originalMulti;
    if (originalSingle === undefined) delete process.env.MOVIE_OUTPUT_ROOT;
    else process.env.MOVIE_OUTPUT_ROOT = originalSingle;
  });

  it('returns MOVIE_OUTPUT_ROOTS split by colon when set', () => {
    process.env.MOVIE_OUTPUT_ROOTS = '/root/a:/root/b:';
    expect(getOutputRoots()).toEqual(['/root/a', '/root/b']);
  });

  it('falls back to MOVIE_OUTPUT_ROOT when only that is set', () => {
    delete process.env.MOVIE_OUTPUT_ROOTS;
    process.env.MOVIE_OUTPUT_ROOT = '/single/root';
    expect(getOutputRoots()).toEqual(['/single/root']);
  });

  it('returns default roots when no env vars are set', () => {
    delete process.env.MOVIE_OUTPUT_ROOTS;
    delete process.env.MOVIE_OUTPUT_ROOT;
    expect(getOutputRoots()).toEqual([
      '/run/media/det/Pelis-A/output',
      '/run/media/det/Pelis-B/output',
    ]);
  });
});

describe('resolveStreamPath', () => {
  let tmpRoot: string;

  beforeEach(() => {
    tmpRoot = mkdtempSync(join(tmpdir(), 'pelis-stream-test-'));
    process.env.MOVIE_OUTPUT_ROOT = tmpRoot;
    delete process.env.MOVIE_OUTPUT_ROOTS;
  });

  afterEach(() => {
    rmSync(tmpRoot, { recursive: true, force: true });
    delete process.env.MOVIE_OUTPUT_ROOT;
  });

  it('resolves an existing file under the root', async () => {
    writeFileSync(join(tmpRoot, 'hello.txt'), 'hi');
    const result = await resolveStreamPath('hello.txt');
    expect(result?.filePath).toBe(join(tmpRoot, 'hello.txt'));
    expect(result?.root).toBe(tmpRoot);
  });

  it('returns null for missing files', async () => {
    expect(await resolveStreamPath('missing.txt')).toBeNull();
  });

  it('rejects traversal attempts', async () => {
    expect(await resolveStreamPath('../etc/passwd')).toBeNull();
    expect(await resolveStreamPath('a/../../b')).toBeNull();
  });
});

describe('findManifestForToken', () => {
  let tmpRoot: string;

  beforeEach(() => {
    tmpRoot = mkdtempSync(join(tmpdir(), 'pelis-manifest-test-'));
    process.env.MOVIE_OUTPUT_ROOT = tmpRoot;
    delete process.env.MOVIE_OUTPUT_ROOTS;
  });

  afterEach(() => {
    rmSync(tmpRoot, { recursive: true, force: true });
    delete process.env.MOVIE_OUTPUT_ROOT;
  });

  it('finds token/token/playlist.m3u8 when there is no master', async () => {
    const dir = join(tmpRoot, 'token-1', 'token-1');
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, 'playlist.m3u8'), '#EXTM3U');
    const result = await findManifestForToken('token-1');
    expect(result?.apiPath).toBe('token-1/token-1/playlist.m3u8');
    expect(result?.filePath).toBe(join(dir, 'playlist.m3u8'));
  });

  it('finds token/master.m3u8 when nested candidate is missing', async () => {
    mkdirSync(join(tmpRoot, 'token-2'), { recursive: true });
    writeFileSync(join(tmpRoot, 'token-2', 'master.m3u8'), '#EXTM3U');
    const result = await findManifestForToken('token-2');
    expect(result?.apiPath).toBe('token-2/master.m3u8');
  });

  it('iterates every manifest candidate', async () => {
    mkdirSync(join(tmpRoot, 'token-3', 'token-3'), { recursive: true });
    writeFileSync(join(tmpRoot, 'token-3', 'token-3', 'index.m3u8'), '#EXTM3U');
    const result = await findManifestForToken('token-3');
    expect(result?.apiPath).toBe('token-3/token-3/index.m3u8');
    expect(MANIFEST_CANDIDATES).toContain('index.m3u8');
  });

  it('prefers a master.m3u8 with variants over the single-rendition playlist', async () => {
    const dir = join(tmpRoot, 'token-4', 'token-4');
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, 'playlist.m3u8'), '#EXTM3U');
    writeFileSync(join(dir, 'master.m3u8'), '#EXTM3U\n#EXT-X-STREAM-INF:BANDWIDTH=1');
    expect((await findManifestForToken('token-4'))?.apiPath).toBe('token-4/token-4/master.m3u8');
    expect(MANIFEST_CANDIDATES[0]).toBe('master.m3u8');
  });

  it('prefers a master.m3u8 in the token folder over a nested playlist', async () => {
    const nested = join(tmpRoot, 'token-5', 'token-5');
    mkdirSync(nested, { recursive: true });
    writeFileSync(join(nested, 'playlist.m3u8'), '#EXTM3U');
    writeFileSync(join(tmpRoot, 'token-5', 'master.m3u8'), '#EXTM3U');
    expect((await findManifestForToken('token-5'))?.apiPath).toBe('token-5/master.m3u8');
  });

  it('returns null for unsafe tokens', async () => {
    expect(await findManifestForToken('../escape')).toBeNull();
    expect(await findManifestForToken('')).toBeNull();
  });
});

describe('rewriteM3u8Manifest', () => {
  it('rewrites relative segment paths against the manifest directory', () => {
    const input = ['#EXTM3U', '#EXTINF:10,', 'seg_001.ts', '#EXTINF:10,', 'seg_002.ts'].join('\n');
    const output = rewriteM3u8Manifest(input, 'token/token/playlist.m3u8');
    expect(output).toContain('/api/stream/token/token/seg_001.ts');
    expect(output).toContain('/api/stream/token/token/seg_002.ts');
  });

  it('keeps comments and EXT tags intact', () => {
    const input = ['#EXTM3U', '#EXT-X-VERSION:3', '#EXTINF:10,', 'seg.ts'].join('\n');
    const output = rewriteM3u8Manifest(input, 'dir/playlist.m3u8');
    expect(output).toContain('#EXTM3U');
    expect(output).toContain('#EXT-X-VERSION:3');
  });

  it('keeps absolute http(s) URLs untouched', () => {
    const input = ['#EXTM3U', 'https://cdn.example.com/video/master.m3u8'].join('\n');
    const output = rewriteM3u8Manifest(input, 'playlist.m3u8');
    expect(output).toContain('https://cdn.example.com/video/master.m3u8');
    expect(output).not.toContain('/api/stream/https://');
  });

  it('strips a matching root prefix from absolute paths', () => {
    const input = ['#EXTM3U', '/run/media/det/Pelis-A/output/token/video.m3u8'].join('\n');
    const output = rewriteM3u8Manifest(input, 'token/playlist.m3u8', [
      '/run/media/det/Pelis-A/output',
    ]);
    expect(output).toContain('/api/stream/token/video.m3u8');
  });

  it('falls back to basename for absolute paths outside known roots', () => {
    const input = ['#EXTM3U', '/elsewhere/file.m3u8'].join('\n');
    const output = rewriteM3u8Manifest(input, 'token/playlist.m3u8');
    expect(output).toContain('/api/stream/token/file.m3u8');
  });
});

describe('parseByteRange', () => {
  it('parses start-end and open-ended ranges', () => {
    expect(parseByteRange('bytes=0-499', 1000)).toEqual({ start: 0, end: 499 });
    expect(parseByteRange('bytes=500-', 1000)).toEqual({ start: 500, end: 999 });
  });

  it('parses suffix ranges and rejects invalid input', () => {
    expect(parseByteRange('bytes=-200', 1000)).toEqual({ start: 800, end: 999 });
    expect(parseByteRange('bytes=1000-1001', 1000)).toBeNull();
    expect(parseByteRange(null, 1000)).toBeNull();
  });
});
