/**
 * Utilidades puras de subtítulos y tiempo.
 *
 * @module @pelis/player/captions
 */

import type { CaptionTrack } from './types';

/** Siguiente subtítulo en el ciclo `off → 1 → 2 → … → off`. */
export function nextCaptionId(
  captions: ReadonlyArray<CaptionTrack> | undefined,
  active: string | null
): string | null {
  if (!captions || captions.length === 0) return null;
  if (active === null) return captions[0]?.id ?? null;
  const index = captions.findIndex((c) => c.id === active);
  if (index === -1 || index === captions.length - 1) return null;
  return captions[index + 1]?.id ?? null;
}

/** `75` → `1:15`, `3725` → `1:02:05`. Valores no finitos → `0:00`. */
export function formatTime(totalSeconds: number): string {
  if (!Number.isFinite(totalSeconds) || totalSeconds < 0) return '0:00';
  const s = Math.floor(totalSeconds);
  const hours = Math.floor(s / 3600);
  const minutes = Math.floor((s % 3600) / 60);
  const seconds = s % 60;
  const ss = String(seconds).padStart(2, '0');
  if (hours > 0) return `${hours}:${String(minutes).padStart(2, '0')}:${ss}`;
  return `${minutes}:${ss}`;
}
