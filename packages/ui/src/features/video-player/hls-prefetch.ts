import Hls from 'hls.js';
import {
  HLS_ASSUMED_SEGMENT_SECONDS,
  HLS_PREFETCH_SEGMENTS,
  nextHlsSegmentUrls,
  parseHlsPlaylist,
  prefetchHlsFragmentUrls,
} from './hls-config';

function fragmentIndexAtTime(
  fragments: Array<{ start: number; duration: number; url: string }>,
  time: number,
): number {
  const exact = fragments.findIndex((frag) => time >= frag.start && time < frag.start + frag.duration);
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
    includeCurrent: boolean,
  ) => {
    if (details.initSegment?.url) warmUrls([details.initSegment.url]);
    const from = index < 0 ? 0 : includeCurrent ? index : index + 1;
    const extra = includeCurrent ? 1 : 0;
    warmUrls(
      details.fragments.slice(from, from + HLS_PREFETCH_SEGMENTS + extra).map((frag) => frag.url),
    );
  };

  const onLevelLoaded = (
    _event: unknown,
    data: { details: { fragments: Array<{ url: string }>; initSegment?: { url: string } | null } },
  ) => {
    if (data.details.initSegment?.url) warmUrls([data.details.initSegment.url]);
    warmUrls(data.details.fragments.slice(0, HLS_PREFETCH_SEGMENTS).map((frag) => frag.url));
  };

  const onFragChanged = (
    _event: unknown,
    data: { frag: { sn: number | 'initSegment'; url: string; level: number } },
  ) => {
    const details = hls.levels[data.frag.level]?.details;
    if (!details) return;
    const idx = details.fragments.findIndex(
      (frag) => frag.url === data.frag.url || frag.sn === data.frag.sn,
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
    if (seekWatchdog) clearTimeout(seekWatchdog);
    seekWatchdog = setTimeout(() => {
      if (video.seeking && video.readyState < 2) {
        hls.startLoad(video.currentTime);
      }
    }, 1200);
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
        const nested = await fetch(parsed.urls[0], { credentials: 'include', signal: abort.signal });
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
