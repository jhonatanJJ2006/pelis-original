import type { HlsConfig } from 'hls.js';

/**
 * Forward buffer hls.js keeps ahead of the playhead. hls.js downloads
 * segments sequentially until this much is buffered, so no extra prefetch
 * layer is needed (and parallel prefetch starved the first segment).
 */
export const HLS_TARGET_FORWARD_BUFFER_SECONDS = 30;

/**
 * hls.js default (60 MB). Fire TV / Android TV boxes have little RAM; the
 * previous 180 MB override could get the tab/app killed. maxBufferLength
 * still bounds the buffer by time.
 */
export const HLS_MAX_BUFFER_SIZE_BYTES = 60 * 1000 * 1000;

export function createVodHlsConfig(): Partial<HlsConfig> {
  return {
    enableWorker: true,
    startFragPrefetch: true,
    maxBufferLength: HLS_TARGET_FORWARD_BUFFER_SECONDS,
    maxMaxBufferLength: HLS_TARGET_FORWARD_BUFFER_SECONDS * 2,
    maxBufferSize: HLS_MAX_BUFFER_SIZE_BYTES,
    // With a multi-variant master.m3u8, never pick a rendition larger than the
    // player on screen (a 720p TV box does not download 1080p).
    capLevelToPlayerSize: true,
    maxBufferHole: 0.5,
    manifestLoadingMaxRetry: 4,
    levelLoadingMaxRetry: 4,
    fragLoadingMaxRetry: 6,
    // A 5MB first segment on the home tunnel can take longer than the 20s default.
    fragLoadingTimeOut: 60_000,
  };
}
