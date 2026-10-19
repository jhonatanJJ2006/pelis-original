/**
 * Títulos coherentes en todas las apps: los guardados TODO EN MAYÚSCULAS o
 * todo en minúsculas se normalizan al mostrarlos (la DB no se toca).
 *  - minúsculas  → primera letra en mayúscula («volver al futuro 1» → «Volver al futuro 1»)
 *  - MAYÚSCULAS  → cada palabra capitalizada, salvo siglas cortas, palabras con
 *    números o puntos y conectores («COCAINE BEAR» → «Cocaine Bear»).
 *  - Títulos de una sola palabra de ≤ 5 letras (GOAT, AIR, M3GAN, FLCL) se dejan:
 *    suelen ser la grafía oficial.
 *  Cualquier otro título (mezcla de mayúsculas y minúsculas) se devuelve igual.
 */
const MINOR = new Set([
  'a',
  'al',
  'de',
  'del',
  'el',
  'en',
  'la',
  'las',
  'los',
  'y',
  'o',
  'e',
  'con',
  'por',
  'para',
  'un',
  'una',
  'of',
  'the',
  'to',
  'in',
  'on',
  'and',
  'or',
  'with',
  'vs',
  'vs.',
]);

function hasLetters(s: string) {
  return /\p{L}/u.test(s);
}

function capitalize(word: string): string {
  return word.replace(/^(\P{L}*)(\p{L})/u, (_m, pre: string, ch: string) => pre + ch.toUpperCase());
}

export function displayTitle(raw: string | null | undefined): string {
  const name = (raw ?? '').trim();
  if (!name || !hasLetters(name)) return raw ?? '';
  const upper = name.toUpperCase();
  const lower = name.toLowerCase();
  if (name === lower && name !== upper) return /^\p{L}/u.test(name) ? capitalize(name) : name;
  if (name !== upper || name === lower) return raw ?? '';
  const letters = name.replace(/[^\p{L}]/gu, '');
  if (!/\s/.test(name) && letters.length <= 5) return name;
  const words = name.split(/(\s+)/);
  let index = 0;
  return words
    .map((w) => {
      if (/^\s+$/.test(w)) return w;
      const first = index++ === 0;
      if (/\d|\./.test(w) || (/^\p{Lu}{1,2}[:!?]?$/u.test(w) && !MINOR.has(w.toLowerCase())))
        return w;
      const lw = w.toLowerCase();
      if (!first && MINOR.has(lw)) return lw;
      return lw
        .split(/([-_/'’])/)
        .map((part, i, arr) => (i > 0 && /['’]/.test(arr[i - 1] ?? '') ? part : capitalize(part)))
        .join('');
    })
    .join('');
}
