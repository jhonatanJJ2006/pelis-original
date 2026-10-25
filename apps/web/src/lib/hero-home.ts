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

/** Marcas de reparto o créditos: desde aquí ya no es sinopsis. */
const CREDITS_START =
  /\*\*|(?:^|\n)[ \t]*(?:reparto|elenco|cast|starring|protagonistas|protagonizada por|dirigid[ao] por|direcci[oó]n|director(?:a)?|guion|música|país)\b/i;
/** Frases sueltas que solo enumeran el reparto. */
const CREDITS_SENTENCE =
  /\b(?:reparto|starring)\b|\b(?:completan|encabezan|lideran|forman)\b[^.]*\belenco\b/i;

export const HERO_SYNOPSIS_MAX = 220;

function sentenceCase(text: string): string {
  const letters = text.replace(/[^\p{L}]/gu, '');
  const upper = letters.replace(/[^\p{Lu}]/gu, '').length;
  let out = text;
  if (letters.length >= 12 && upper / letters.length > 0.8) {
    out = text
      .toLocaleLowerCase('es')
      .replace(
        /(^|[.!?¡¿]\s+)(\p{Ll})/gu,
        (_m, pre: string, ch: string) => pre + ch.toLocaleUpperCase('es')
      );
  }
  return out.replace(
    /^([¡¿«"'(]*)(\p{Ll})/u,
    (_m, pre: string, ch: string) => pre + ch.toLocaleUpperCase('es')
  );
}

/**
 * Sinopsis corta y limpia para el hero: sin reparto ni créditos, en tipo oración y
 * cortada por palabra con «…». Vacía si no queda texto útil.
 */
export function heroSynopsis(raw: string | null | undefined, max = HERO_SYNOPSIS_MAX): string {
  let text = raw ?? '';
  const cut = text.search(CREDITS_START);
  if (cut >= 0) text = text.slice(0, cut);
  text = text
    .replace(/[*_#]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  // Frases: corte tras . ! ? … seguido de mayúscula, salvo iniciales («Samuel L. Jackson»).
  const sentences = text.split(/(?<![\s.]\p{Lu}\.)(?<=[.!?…]["»”')]*)\s+(?=[¡¿«"'(]*\p{Lu})/u);
  text = sentences
    .map((s) => s.trim())
    .filter((s) => s && !CREDITS_SENTENCE.test(s))
    .join(' ')
    .trim();
  if (!/\p{L}/u.test(text)) return '';
  text = sentenceCase(text);
  if (text.length <= max) return text;
  const head = text.slice(0, max);
  const end = Math.max(head.lastIndexOf('. '), head.lastIndexOf('! '), head.lastIndexOf('? '));
  if (end >= max * 0.55) return head.slice(0, end + 1);
  const space = head.lastIndexOf(' ');
  const base = (space > max * 0.5 ? head.slice(0, space) : head.slice(0, max - 1)).replace(
    /[\s,;:.\-–—]+$/u,
    ''
  );
  return `${base}…`;
}

/** Fondo muy oscuro (luminancia media 0–255): mejor el póster. */
export const HERO_DARK_LUMA = 22;

export function isTooDark(meanLuma: number | null | undefined): boolean {
  return meanLuma != null && Number.isFinite(meanLuma) && meanLuma < HERO_DARK_LUMA;
}

/** Etiqueta «Estreno destacado» solo para un título marcado como destacado. */
export function isFeaturedTitle(movie: { featured?: unknown } | null | undefined): boolean {
  return movie?.featured === true;
}

/** Ids de las filas para pedir la duración de una vez (tope del API: 40). */
export function heroRuntimeIds(
  lists: Array<ReadonlyArray<{ _id?: string }> | null | undefined>,
  max = 40
): string[] {
  const ids: string[] = [];
  const seen = new Set<string>();
  for (const list of lists) {
    for (const item of list ?? []) {
      const id = item?._id;
      if (!id || seen.has(id)) continue;
      seen.add(id);
      ids.push(id);
      if (ids.length >= max) return ids;
    }
  }
  return ids;
}
