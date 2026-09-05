/**
 * Spanish-only TV import filter.
 * Reject BR/PT/EN (and other non-Spanish) even when a playlist mislabels language=es.
 * A working Portuguese feed labeled Spanish is worse than dropping the channel.
 */

export interface SpanishChannelInput {
  name: string;
  country?: string;
  language?: string;
  streamUrl: string;
  tvgId?: string;
}

const SPANISH_LANG = new Set(['es', 'spa', 'spanish', 'español', 'espanol']);

const NON_SPANISH_LANG = new Set([
  'en', 'eng', 'english', 'pt', 'por', 'portuguese', 'fr', 'fra', 'french',
  'de', 'ger', 'german', 'it', 'hi', 'ar', 'ru', 'zh', 'ja', 'ko', 'tr', 'nl',
  'pl', 'sv', 'no', 'da', 'fi', 'el', 'he', 'th', 'vi', 'id', 'ms', 'uk', 'cs',
  'ro', 'hu', 'bg', 'hr', 'sr', 'sk', 'sl',
]);

const SPANISH_COUNTRY_NAMES = new Set([
  'argentina', 'bolivia', 'chile', 'colombia', 'costa rica', 'cuba', 'ecuador',
  'el salvador', 'españa', 'spain', 'méxico', 'mexico', 'nicaragua', 'panamá',
  'panama', 'paraguay', 'perú', 'peru', 'puerto rico', 'república dominicana',
  'republica dominicana', 'uruguay', 'venezuela', 'latinoamérica', 'latinoamerica',
  'latin america', 'latam', 'guatemala', 'honduras', 'equatorial guinea',
  'guinea ecuatorial',
]);

const SPANISH_COUNTRY_CODES = new Set([
  'es', 'mx', 'ar', 'cl', 'co', 'pe', 've', 'bo', 'py', 'uy', 'ec', 'cr', 'pa',
  'gt', 'hn', 'sv', 'ni', 'do', 'pr', 'cu', 'gq',
]);

const NON_SPANISH_NAME_RE =
  /\b(english|arabic|french|hebrew|greek|italian|korean|turkish|turk|deutsch|german|chinese|japanese|polish|russian|portuguese|dutch|hindi|bulgarian|ukrainian|mongolian|hungarian|romanian|czech|slovak|swedish|norwegian|danish|finnish|vietnamese|thai|indonesian|malay|filipino|tagalog|urdu|bengali|swahili|persian|farsi|kurdish|azerbaijani|armenian|georgian|serbian|croatian|slovenian|bosnian|macedonian|albanian|lithuanian|latvian|estonian|catalan|basque|galician)\b/i;

const BRAZILIAN_NAME_RE =
  /\b(globo tv|globonews|bandnews|bandamax|gnt|rede tv|sbt|multishow|sportv|telecine|combate|gloob|megapix|woohoo|futura|curta|rede brasil|tv brasil|canal brasil|espn brasil|record tv|rede record|cnn brasil|discovery kids br|cartoon network br|nickelodeon br|star channel br|paramount br|tnt br|warner br|fox brasil|cultura 24|cine premiere|tv off|agromais|aratu on|br8 tv|tv show fortaleza)\b/i;

const KNOWN_FOREIGN_NAME_RE =
  /\b(bfm tv|bharat24|cnbc mongolia|eagle news|etv|mnc|my-ukraina|bulgaria on air|euronews bulgaria|kinokazka|m1 hd|vision 6 tv|diaspora tv|telesur english|real madrid tv english|pop world tv|fox news channel|nbc news now|cnbc|bloomberg|cnn international|al jazeera|france 24 english|rt english|sky news|abc news|euronews english|euronews german|cgtn|trt world|al arabiya|ary news|geo news|dawn news|hispantv|tv5 monde|arte|ndtv|dd news|india tv)\b/i;

const BR_HINT_RE = /\.br@|\bbrazil\b|\bbrasil\b|\bportuguese\b|\bportugu[eê]s\b/i;

const SPANISH_REGION_HINT_RE =
  /@latam|@spain|@es\b|latinamerica|latinoam[eé]rica|\.es@|\.mx@|\.ar@|\.cl@|\.co@|\.pe@|\.ve@|\.do@|\.pr@|\.uy@|\.bo@|\.py@|\.ec@|\.cr@|\.pa@|\.gt@|\.hn@|\.sv@|\.ni@|\.cu@/i;

const US_EAST_ENGLISH_RE = /@east\b|usa_/i;

/** Pluto IDs verified as FR/DE/BR audio, often mislabeled LatAm/es. */
const NON_SPANISH_PLUTO_IDS = new Set([
  '62f3e8ad2a8e8000077b013d', // Detective Conan France
  '6380c94947c72b0007ee9a13', // One Piece France
  '609ae66b359b270007869ff1', // South Park Brazil
  '64c92f965580090008084968', // Naruto Shippuden Brazil
  '5e8b580a233dc90007f0cb9d', // iCarly Germany
]);


function tvgCountryCode(tvgId: string): string | null {
  const m = tvgId.match(/\.([a-z]{2})(?:@|$)/i);
  return m?.[1]?.toLowerCase() ?? null;
}

function countryLooksSpanish(country: string): boolean {
  const c = country.toLowerCase().trim();
  if (!c) return false;
  if (SPANISH_COUNTRY_NAMES.has(c)) return true;
  const codes = c.split(/[;,|/]+/).map((p) => p.trim().toLowerCase());
  return codes.some((p) => SPANISH_COUNTRY_CODES.has(p) || SPANISH_COUNTRY_NAMES.has(p));
}

/**
 * True when a channel is confirmed Spanish (LatAm or Spain).
 * Rejects Brazil/PT/EN and other non-Spanish even if language is mislabeled es.
 */
export function isSpanishChannel(
  ch: SpanishChannelInput,
  fallbackCountry = '',
): { accept: boolean; reason?: string; language: string; country: string } {
  const name = ch.name ?? '';
  const lang = (ch.language ?? '').toLowerCase().trim();
  const country = (ch.country ?? fallbackCountry ?? '').toLowerCase().trim();
  const tvgId = (ch.tvgId ?? '').toLowerCase();
  const url = ch.streamUrl ?? '';
  const blob = `${name} ${tvgId} ${country} ${url}`;
  const plu = url.match(/jmp2\.uk\/plu-([a-f0-9]+)/i)?.[1]?.toLowerCase();
  if (plu && NON_SPANISH_PLUTO_IDS.has(plu)) {
    return { accept: false, reason: 'pluto id FR/DE/BR conocido', language: lang, country };
  }

  if (BR_HINT_RE.test(blob) || BRAZILIAN_NAME_RE.test(name)) {
    return { accept: false, reason: 'canal brasileño/portugués', language: lang || 'pt', country };
  }
  if (/\.in@/i.test(tvgId)) {
    return { accept: false, reason: 'tvg-country IN (no español)', language: lang, country };
  }
  if (US_EAST_ENGLISH_RE.test(blob)) {
    return { accept: false, reason: 'feed US East/inglés', language: lang || 'en', country };
  }
  if (NON_SPANISH_NAME_RE.test(name)) {
    return { accept: false, reason: 'nombre en idioma no-español', language: lang, country };
  }
  if (KNOWN_FOREIGN_NAME_RE.test(name)) {
    return { accept: false, reason: 'canal extranjero conocido', language: lang, country };
  }
  if (lang && NON_SPANISH_LANG.has(lang) && !SPANISH_LANG.has(lang)) {
    return { accept: false, reason: `idioma=${lang} explícito`, language: lang, country };
  }

  if (/espa[nñ]ol|\bspanish\b/i.test(name) && !NON_SPANISH_LANG.has(lang)) {
    return { accept: true, language: 'es', country: country || 'Latinoamérica' };
  }

  const code = tvgCountryCode(tvgId);
  if (code === 'us') {
    if (/@east|@brazil|@br\b|@fr\b|@germany|@english/i.test(tvgId)) {
      return { accept: false, reason: 'feed US/BR/FR no español', language: lang || 'en', country };
    }
    if (/@us\b/.test(tvgId) && !SPANISH_REGION_HINT_RE.test(tvgId) && !/espa[nñ]ol|spanish/i.test(blob)) {
      return { accept: false, reason: 'feed US inglés', language: lang || 'en', country };
    }
  } else if (code && !SPANISH_COUNTRY_CODES.has(code)) {
    const spanishException =
      SPANISH_REGION_HINT_RE.test(tvgId) ||
      (code === 'de' && /@es/.test(tvgId)) ||
      (code === 'fr' && /spanish|espa[nñ]ol/i.test(blob)) ||
      (code === 'uk' && /latinam/.test(tvgId)) ||
      (code === 'at' && /@es/.test(tvgId));
    if (!spanishException) {
      return { accept: false, reason: `tvg-country=${code} no hispanohablante`, language: lang, country };
    }
  }

  if (SPANISH_LANG.has(lang) || lang === '') {
    if (countryLooksSpanish(country) || SPANISH_REGION_HINT_RE.test(blob)) {
      return { accept: true, language: 'es', country: country || 'Latinoamérica' };
    }
    if (SPANISH_LANG.has(lang) && code && SPANISH_COUNTRY_CODES.has(code)) {
      return { accept: true, language: 'es', country };
    }
    // Pluto LATAM often uses .us@SD with language=Spanish and a Spanish title.
    if (SPANISH_LANG.has(lang) && code === 'us' && !/@east|@us\b/.test(tvgId)) {
      return { accept: true, language: 'es', country: country || 'Latinoamérica' };
    }
    if (SPANISH_LANG.has(lang) && countryLooksSpanish(fallbackCountry)) {
      return { accept: true, language: 'es', country: country || fallbackCountry };
    }
  }

  if (countryLooksSpanish(country) && !NON_SPANISH_LANG.has(lang)) {
    return { accept: true, language: 'es', country };
  }

  if (SPANISH_REGION_HINT_RE.test(blob) && !NON_SPANISH_LANG.has(lang)) {
    return { accept: true, language: 'es', country: country || 'Latinoamérica' };
  }

  // jmp2.uk/plu- alone is NOT Spanish — Pluto BR/FR/DE/US share the same mirror.
  return { accept: false, reason: 'no se pudo confirmar español', language: lang, country };
}

export {
  NON_SPANISH_NAME_RE,
  BRAZILIAN_NAME_RE,
  KNOWN_FOREIGN_NAME_RE,
  BR_HINT_RE,
};
