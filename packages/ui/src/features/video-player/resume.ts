/** Saved watch row used to resume a movie (history.getByUserAndMovie). */
export interface SavedPlayback {
  progress: number;
  duration: number;
}

/**
 * Where to seek when opening a movie the user already started.
 * Returns null for empty, near-zero, or almost-finished rows (same 95% cutoff
 * as continue-watching).
 */
export function resumeSeekSeconds(
  saved: SavedPlayback | null | undefined,
  mediaDuration: number
): number | null {
  if (!saved) return null;
  const progress = saved.progress;
  if (!Number.isFinite(progress) || progress <= 1) return null;

  const known =
    Number.isFinite(mediaDuration) && mediaDuration > 0 ? mediaDuration : saved.duration;
  if (Number.isFinite(known) && known > 0 && progress >= known * 0.95) return null;

  if (Number.isFinite(mediaDuration) && mediaDuration > 0) {
    return Math.min(progress, Math.max(0, mediaDuration - 0.25));
  }
  return progress;
}

/**
 * The player used to upsert history on the first timeupdate (~0s) because
 * lastSaved starts at 0. That wiped a real resume point before seek could run.
 * Hold writes until the history query has settled and the playhead has either
 * landed on the resume point or the viewer has actually watched from the start.
 */
export function shouldWritePlaybackProgress(input: {
  current: number;
  total: number;
  resumeSettled: boolean;
  resumeTarget: number | null;
}): boolean {
  if (!input.resumeSettled) return false;
  if (!Number.isFinite(input.total) || input.total <= 0) return false;
  if (!Number.isFinite(input.current) || input.current < 0) return false;

  const target = input.resumeTarget;
  if (target != null && target > 1) {
    const landed = input.current >= target - 1.5;
    const watchedFromStart = input.current >= 5;
    if (!landed && !watchedFromStart) return false;
  }
  return true;
}
