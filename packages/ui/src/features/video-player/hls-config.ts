import type { HlsConfig } from 'hls.js';

/**
 * Forward buffer hls.js keeps ahead of the playhead. hls.js downloads
 * segments sequentially until this much is buffered, so no extra prefetch
 * layer is needed (and parallel prefetch starved the first segment).
 */
export const HLS_TARGET_FORWARD_BUFFER_SECONDS = 30;

/** 180MB holds ~30s of a ~50Mbps encode, which the default 60MB does not. */
export const HLS_MAX_BUFFER_SIZE_BYTES = 180 * 1000 * 1000;

export function createVodHlsConfig(): Partial<HlsConfig> {
  return {
    enableWorker: true,
    startFragPrefetch: true,
    maxBufferLength: HLS_TARGET_FORWARD_BUFFER_SECONDS,
    maxMaxBufferLength: HLS_TARGET_FORWARD_BUFFER_SECONDS * 2,
    maxBufferSize: HLS_MAX_BUFFER_SIZE_BYTES,
    maxBufferHole: 0.5,
    manifestLoadingMaxRetry: 4,
    levelLoadingMaxRetry: 4,
    fragLoadingMaxRetry: 6,
    // A 5MB first segment on the home tunnel can take longer than the 20s default.
    fragLoadingTimeOut: 60_000,
  };
}
