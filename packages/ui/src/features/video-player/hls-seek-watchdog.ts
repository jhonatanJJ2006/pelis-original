import Hls from 'hls.js';

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

/**
 * Restarts the hls.js loader only when a seek is stuck AND nothing is
 * downloading. Segment buffering itself is left entirely to hls.js
 * (maxBufferLength); there is no custom segment prefetch layer anymore:
 * it downloaded extra segments in parallel with the one needed to start
 * and competed for the home uplink.
 */
export function attachHlsSeekWatchdog(hls: Hls, video: HTMLVideoElement): () => void {
  let seekWatchdog: ReturnType<typeof setTimeout> | null = null;

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

  video.addEventListener('seeking', armSeekWatchdog);

  return () => {
    if (seekWatchdog) clearTimeout(seekWatchdog);
    video.removeEventListener('seeking', armSeekWatchdog);
  };
}
