/**
 * Teclado del celular para la búsqueda de la TV (lógica pura, sin base de datos).
 * La TV crea una sesión corta con un código; el celular solo manda texto.
 */
export const TV_KEYBOARD_TTL_MS = 10 * 60 * 1000;
export const TV_KEYBOARD_MAX_TEXT = 80;
/** Escrituras máximas por sesión (cada pulsación del celular es una). */
export const TV_KEYBOARD_MAX_UPDATES = 2000;
/** Sesiones nuevas por IP y hora. */
export const TV_KEYBOARD_CREATE_PER_HOUR = 60;

/**
 * Deja el texto listo para guardar: sin caracteres de control, espacios
 * colapsados y como máximo `TV_KEYBOARD_MAX_TEXT` caracteres.
 * Devuelve `null` si no es texto.
 */
export function sanitizeKeyboardText(input: unknown): string | null {
  if (typeof input !== 'string') return null;
  const clean = input
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u001f\u007f-\u009f\u200b-\u200f\u2028-\u202e\u2066-\u2069]/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/^\s+/, '');
  return Array.from(clean).slice(0, TV_KEYBOARD_MAX_TEXT).join('');
}

export function buildTvKeyboardUrl(origin: string, code: string): string {
  return `${origin.replace(/\/$/, '')}/tv-teclado?code=${encodeURIComponent(code)}`;
}
