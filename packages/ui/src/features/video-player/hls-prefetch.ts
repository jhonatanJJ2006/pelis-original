import Hls from 'hls.js';
import {
  HLS_ASSUMED_SEGMENT_SECONDS,
  HLS_PREFETCH_SEGMENTS,
  nextHlsSegmentUrls,
  parseHlsPlaylist,
  prefetchHlsFragmentUrls,
} from './hls-config';

const SEEK_RESTART_MS = 1200;

function loaderEntryIsInFlight(entry: unknown): boolean {
  if (entry == null) return false;
  // hls.js 1.6 keeps `{ frag, state }` even when nothing is downloading.
  // `frag` is null while idle, so a bare null-check never lets a stuck seek recover.
  if (typeof entry === 'object' && entry !== null && 'frag' in entry) {
    return (entry as { frag?: unknown }).frag != null;
  }
  return true;
}

export function hasInFlightHlsFragment(
  fragments: Record<string, unknown> | null | undefined
): boolean {
  if (!fragments) return false;
  return Object.values(fragments).some(loaderEntryIsInFlight);
}

/**
 * startLoad() calls stopLoad() first. Doing that while a segment is still
 * downloading aborts it. A healthy VOD first fragment (several MB) is often
 * still in flight at 1.2s, and restarting it forever leaves the playhead at 0:00.
 */
export function shouldRestartHlsLoad(input: {
  seeking: boolean;
  readyState: number;
  hasInFlightFragment: boolean;
}): boolean {
  if (!input.seeking || input.readyState >= 2) return false;
  return !input.hasInFlightFragment;
}

function fragmentIndexAtTime(
  fragments: Array<{ start: number; duration: number; url: string }>,
  time: number
): number {
  const exact = fragments.findIndex(
    (frag) => time >= frag.start && time < frag.start + frag.duration
  );
  if (exact >= 0) return exact;
  return fragments.findIndex((frag) => frag.start >= time);
}

export function attachHlsForwardPrefetch(hls: Hls, video?: HTMLVideoElement): () => void {
  const abort = new AbortController();
  const warmed = new Set<string>();
  let seekWatchdog: ReturnType<typeof setTimeout> | null = null;

  const warmUrls = (urls: string[]) => {
    prefetchHlsFragmentUrls(urls, { signal: abort.signal, warmed });
  };

  const warmAroundIndex = (
    details: {
      fragments: Array<{ start: number; duration: number; url: string }>;
      initSegment?: { url: string } | null;
    },
    index: number,
    includeCurrent: boolean
  ) => {
    if (details.initSegment?.url) warmUrls([details.initSegment.url]);
    const from = index < 0 ? 0 : includeCurrent ? index : index + 1;
    const extra = includeCurrent ? 1 : 0;
    warmUrls(
      details.fragments.slice(from, from + HLS_PREFETCH_SEGMENTS + extra).map((frag) => frag.url)
    );
  };

  const onLevelLoaded = (
    _event: unknown,
    data: { details: { fragments: Array<{ url: string }>; initSegment?: { url: string } | null } }
  ) => {
    if (data.details.initSegment?.url) warmUrls([data.details.initSegment.url]);
    // hls.js already downloads fragment 0. Prefetching it again doubles a
    // multi-megabyte VOD segment and the playhead never leaves 0:00.
    warmUrls(data.details.fragments.slice(1, 1 + HLS_PREFETCH_SEGMENTS).map((frag) => frag.url));
  };

  const onFragChanged = (
    _event: unknown,
    data: { frag: { sn: number | 'initSegment'; url: string; level: number } }
  ) => {
    const details = hls.levels[data.frag.level]?.details;
    if (!details) return;
    const idx = details.fragments.findIndex(
      (frag) => frag.url === data.frag.url || frag.sn === data.frag.sn
    );
    warmAroundIndex(details, idx, false);
  };

  hls.on(Hls.Events.LEVEL_LOADED, onLevelLoaded as never);
  hls.on(Hls.Events.FRAG_CHANGED, onFragChanged as never);

  const onSeeking = () => {
    if (!video) return;
    const level = hls.currentLevel >= 0 ? hls.currentLevel : 0;
    const details = hls.levels[level]?.details ?? hls.levels[0]?.details;
    if (details) {
      const idx = fragmentIndexAtTime(details.fragments, video.currentTime);
      warmAroundIndex(details, idx, true);
    }
    const armSeekWatchdog = () => {
      if (seekWatchdog) clearTimeout(seekWatchdog);
      seekWatchdog = setTimeout(() => {
        seekWatchdog = null;
        const restart = shouldRestartHlsLoad({
          seeking: video.seeking,
          readyState: video.readyState,
          hasInFlightFragment: hasInFlightHlsFragment(hls.inFlightFragments),
        });
        if (restart) {
          hls.startLoad(video.currentTime);
          return;
        }
        // Still seeking while the segment downloads. Check again; do not abort it.
        if (video.seeking && video.readyState < 2) armSeekWatchdog();
      }, SEEK_RESTART_MS);
    };
    armSeekWatchdog();
  };

  if (video) video.addEventListener('seeking', onSeeking);

  return () => {
    abort.abort();
    if (seekWatchdog) clearTimeout(seekWatchdog);
    hls.off(Hls.Events.LEVEL_LOADED, onLevelLoaded as never);
    hls.off(Hls.Events.FRAG_CHANGED, onFragChanged as never);
    if (video) video.removeEventListener('seeking', onSeeking);
  };
}

export function attachNativeHlsPrefetch(video: HTMLVideoElement, manifestUrl: string): () => void {
  const abort = new AbortController();
  const warmed = new Set<string>();
  let segmentUrls: string[] = [];
  let durations: number[] = [];

  const warmFromTime = () => {
    if (!segmentUrls.length) return;
    const time = video.currentTime;
    let acc = 0;
    let idx = 0;
    for (let i = 0; i < segmentUrls.length; i++) {
      const duration = durations[i] ?? HLS_ASSUMED_SEGMENT_SECONDS;
      if (acc + duration > time) {
        idx = i;
        break;
      }
      acc += duration;
      idx = i;
    }
    prefetchHlsFragmentUrls(nextHlsSegmentUrls(segmentUrls, idx, HLS_PREFETCH_SEGMENTS), {
      signal: abort.signal,
      warmed,
    });
  };

  const load = async () => {
    try {
      const res = await fetch(manifestUrl, { credentials: 'include', signal: abort.signal });
      if (!res.ok) return;
      const text = await res.text();
      const parsed = parseHlsPlaylist(text, manifestUrl);
      if (parsed.isMaster && parsed.urls[0]) {
        const nested = await fetch(parsed.urls[0], {
          credentials: 'include',
          signal: abort.signal,
        });
        if (!nested.ok) return;
        const media = parseHlsPlaylist(await nested.text(), parsed.urls[0]);
        segmentUrls = media.urls;
        durations = media.durations;
      } else {
        segmentUrls = parsed.urls;
        durations = parsed.durations;
      }
      prefetchHlsFragmentUrls(segmentUrls.slice(0, HLS_PREFETCH_SEGMENTS), {
        signal: abort.signal,
        warmed,
      });
    } catch {
      // aborted or network — native playback can still proceed
    }
  };

  void load();
  video.addEventListener('timeupdate', warmFromTime);
  video.addEventListener('seeking', warmFromTime);

  return () => {
    abort.abort();
    video.removeEventListener('timeupdate', warmFromTime);
    video.removeEventListener('seeking', warmFromTime);
  };
}
