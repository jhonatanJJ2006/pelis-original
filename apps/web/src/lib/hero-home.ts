import { displayTitle } from '@pelis/db/displayTitle';

/** Anchos que acepta el optimizador de Next (los mismos que usa la app de TV). */
const NEXT_WIDTHS = [64, 96, 128, 256, 384, 640, 750, 828, 1080, 1200, 1920] as const;

export const HERO_IMAGE_DEBOUNCE_MS = 200;
export const HERO_TRAILER_REST_MS = 2000;

export function nextImageWidth(px: number): number {
  return NEXT_WIDTHS.find((width) => width >= px) ?? NEXT_WIDTHS[NEXT_WIDTHS.length - 1]!;
}

/** Píxeles del fondo: el ancho real de la pantalla, con tope Full HD. */
export function heroRequestWidth(viewportCssPx: number, devicePixelRatio = 1): number {
  const px = Math.round(viewportCssPx * (devicePixelRatio > 0 ? devicePixelRatio : 1));
  return nextImageWidth(Math.min(1920, Math.max(640, px)));
}

/**
 * Fondo del hero por el optimizador (`/_next/image`), nunca el archivo original.
 * URLs de otro dominio (pósters externos) se dejan igual.
 */
export function heroBackdropSrc(src: string | null | undefined, widthPx: number): string | null {
  const value = src?.trim();
  if (!value) return null;
  const path = localPath(value);
  if (!path) return value;
  if (!path.startsWith('/uploads/') && !path.startsWith('/peliculas/')) return path;
  const width = nextImageWidth(Math.min(1920, Math.max(64, widthPx)));
  return `/_next/image?url=${encodeURIComponent(path)}&w=${width}&q=70`;
}

function localPath(value: string): string | null {
  if (value.startsWith('/')) return value;
  try {
    const url = new URL(value);
    if (url.pathname.startsWith('/uploads/') || url.pathname.startsWith('/peliculas/')) {
      return url.pathname;
    }
  } catch {
    return null;
  }
  return null;
}

export function heroTitle(raw: string | null | undefined): string {
  return displayTitle(raw);
}

/** «2 h 46 min», a partir de minutos enteros. */
export function heroDurationLabel(totalMinutes: number | null | undefined): string | null {
  if (totalMinutes == null || !Number.isFinite(totalMinutes) || totalMinutes <= 0) return null;
  const total = Math.round(totalMinutes);
  const hours = Math.floor(total / 60);
  const minutes = total % 60;
  if (hours > 0 && minutes > 0) return `${hours} h ${minutes} min`;
  if (hours > 0) return `${hours} h`;
  return `${minutes} min`;
}

export function heroDurationFromSeconds(totalSeconds: number | null | undefined): string | null {
  if (totalSeconds == null || !Number.isFinite(totalSeconds) || totalSeconds <= 0) return null;
  return heroDurationLabel(Math.round(totalSeconds / 60));
}

export function heroMetaLine(parts: Array<string | null | undefined>): string {
  return parts
    .map((part) => part?.trim())
    .filter((part): part is string => Boolean(part))
    .join('  ·  ');
}

export function shouldPlayTrailer(input: {
  rested: boolean;
  forced: boolean;
  youtubeKey: string | null | undefined;
  reducedMotion: boolean;
}): boolean {
  if (!input.youtubeKey) return false;
  if (input.forced) return true;
  if (input.reducedMotion) return false;
  return input.rested;
}
