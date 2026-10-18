import { describe, expect, it } from 'vitest';
import * as hlsConfig from './hls-config';
import {
  HLS_MAX_BUFFER_SIZE_BYTES,
  HLS_TARGET_FORWARD_BUFFER_SECONDS,
  createVodHlsConfig,
} from './hls-config';

describe('createVodHlsConfig', () => {
  it('relies on hls.js buffering with a sane forward buffer', () => {
    const config = createVodHlsConfig();
    expect(HLS_TARGET_FORWARD_BUFFER_SECONDS).toBe(30);
    expect(config.maxBufferLength).toBe(30);
    expect(config.maxMaxBufferLength).toBeGreaterThanOrEqual(config.maxBufferLength!);
    expect(config.maxMaxBufferLength).toBeLessThanOrEqual(60);
    expect(config.maxBufferSize).toBe(HLS_MAX_BUFFER_SIZE_BYTES);
    // hls.js default: low-memory TV boxes.
    expect(config.maxBufferSize).toBeLessThanOrEqual(60 * 1000 * 1000);
    expect(config.capLevelToPlayerSize).toBe(true);
    expect(config.fragLoadingTimeOut).toBeGreaterThanOrEqual(60_000);
  });

  it('no longer exposes a custom segment prefetch layer', () => {
    expect('prefetchHlsFragmentUrls' in hlsConfig).toBe(false);
    expect('HLS_PREFETCH_SEGMENTS' in hlsConfig).toBe(false);
  });
});
