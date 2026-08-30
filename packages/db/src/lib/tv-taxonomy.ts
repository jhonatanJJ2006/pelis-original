/**
 * Canonical Spanish TV taxonomy + display cleanup.
 * Maps iptv-org semicolon tags and noisy titles onto a small set of
 * Spanish categories. Does not invent or scrape stream URLs.
 */

export const CANONICAL_CATEGORIES = [
  'Fútbol',
  'Fórmula 1',
  'Lucha libre',
  'Deportes',
  'Infantil',
  'Anime',
  'Animación',
  'Noticias',
  'Entretenimiento',
  'Películas',
  'Series',
  'Documentales',
  'Música',
  'Cultura',
  'Religión',
  'Educación',
  'Legislatura',
  'Estilo de vida',
  'Viajes',
  'Cocina',
  'Clásicos',
  'General',
] as const;

export type CanonicalCategory = (typeof CANONICAL_CATEGORIES)[number];

export const FEATURED_CATEGORIES: CanonicalCategory[] = [
  'Fútbol',
  'Infantil',
  'Fórmula 1',
  'Lucha libre',
];

const TAG_TO_CATEGORY: Record<string, CanonicalCategory> = {
  news: 'Noticias',
  sports: 'Deportes',
  sport: 'Deportes',
  kids: 'Infantil',
  family: 'Infantil',
  animation: 'Animación',
  anime: 'Anime',
  movies: 'Películas',
  movie: 'Películas',
  series: 'Series',
  documentary: 'Documentales',
  documentaries: 'Documentales',
  music: 'Música',
  entertainment: 'Entretenimiento',
  culture: 'Cultura',
  religious: 'Religión',
  religion: 'Religión',
  education: 'Educación',
  legislative: 'Legislatura',
  lifestyle: 'Estilo de vida',
  travel: 'Viajes',
  cooking: 'Cocina',
  classic: 'Clásicos',
  classics: 'Clásicos',
  outdoor: 'Deportes',
  business: 'Noticias',
  weather: 'Noticias',
  public: 'General',
  general: 'General',
  undefined: 'General',
  relax: 'Entretenimiento',
  shop: 'Entretenimiento',
  science: 'Documentales',
  comedy: 'Entretenimiento',
};

const ALREADY_CANONICAL = new Set<string>(CANONICAL_CATEGORIES);

const COUNTRY_ALIASES: Record<string, string> = {
  es: 'España',
  esp: 'España',
  spain: 'España',
  españa: 'España',
  espana: 'España',
  mx: 'México',
  mex: 'México',
  mexico: 'México',
  méxico: 'México',
  ar: 'Argentina',
  argentina: 'Argentina',
  cl: 'Chile',
  chile: 'Chile',
  co: 'Colombia',
  colombia: 'Colombia',
  pe: 'Perú',
  peru: 'Perú',
  perú: 'Perú',
  uy: 'Uruguay',
  uruguay: 'Uruguay',
  ve: 'Venezuela',
  venezuela: 'Venezuela',
  bo: 'Bolivia',
  bolivia: 'Bolivia',
  py: 'Paraguay',
  paraguay: 'Paraguay',
  ec: 'Ecuador',
  ecuador: 'Ecuador',
  cr: 'Costa Rica',
  'costa rica': 'Costa Rica',
  pa: 'Panamá',
  panama: 'Panamá',
  panamá: 'Panamá',
  gt: 'Guatemala',
  guatemala: 'Guatemala',
  hn: 'Honduras',
  honduras: 'Honduras',
  sv: 'El Salvador',
  'el salvador': 'El Salvador',
  ni: 'Nicaragua',
  nicaragua: 'Nicaragua',
  do: 'República Dominicana',
  'republica dominicana': 'República Dominicana',
  'república dominicana': 'República Dominicana',
  pr: 'Puerto Rico',
  'puerto rico': 'Puerto Rico',
  cu: 'Cuba',
  cuba: 'Cuba',
  us: 'Estados Unidos',
  usa: 'Estados Unidos',
  'united states': 'Estados Unidos',
  'estados unidos': 'Estados Unidos',
  latam: 'Latinoamérica',
  'latin america': 'Latinoamérica',
  latinoamerica: 'Latinoamérica',
  latinoamérica: 'Latinoamérica',
  fr: 'Francia',
  francia: 'Francia',
  france: 'Francia',
};

const HIDDEN_COUNTRIES = new Set(['desconocido', 'unknown', 'n/a', 'na', '']);

export function cleanTvTitle(raw: string | null | undefined): string {
  if (!raw) return '';
  let s = String(raw).trim();

  const mangled = s.match(/group-title="[^"]*"\s*,\s*(.+)$/i);
  if (mangled?.[1]) s = mangled[1].trim();
  if (/like gecko|user-agent|libvlc|chrome\/\d/i.test(s)) {
    const afterComma = s.split(',').pop();
    if (afterComma && afterComma.trim().length > 2) s = afterComma.trim();
  }

  s = s.replace(/\s*\(\d{3,4}p\)/gi, '');
  s = s.replace(/\s*\[(?:geo-?blocked|not\s*24\/7|geo\s*restriction)\]/gi, '');
  s = s.replace(/\s*\b(?:FHD|UHD|4K|HD|SD)\b\s*$/gi, '');
  s = s.replace(/\s{2,}/g, ' ').trim();
  s = s.replace(/^[\s\-–|,]+|[\s\-–|,]+$/g, '').trim();
  return s;
}

export function isMostlyCyrillic(name: string): boolean {
  const letters = name.replace(/[^A-Za-zÀ-ÿА-яЁё]/g, '');
  if (letters.length < 3) return false;
  const cyr = (name.match(/[А-яЁё]/g) ?? []).length;
  return cyr / letters.length >= 0.5;
}

export function isPublicCatalogName(name: string): boolean {
  const cleaned = cleanTvTitle(name);
  if (!cleaned || cleaned.length < 2) return false;
  if (isMostlyCyrillic(cleaned)) return false;
  if (/user-agent|like gecko|libvlc|group-title/i.test(cleaned)) return false;
  return true;
}

function parseTags(category: string | null | undefined): string[] {
  if (!category) return [];
  return category
    .split(/[;,|/]/)
    .map((t) => t.trim())
    .filter(Boolean);
}

function categoryFromName(name: string): CanonicalCategory | null {
  const n = name.toLowerCase();

  if (
    /\b(wwe|aew|lucha\s*libre|luchalibre|wrestling|aaa\s*lucha|cmll)\b/i.test(n) ||
    /\blucha\b/.test(n)
  ) {
    return 'Lucha libre';
  }
  if (/\b(f[oó]rmula\s*1|formula\s*one|\bf1\b|f1\s*tv|sky\s*f1)\b/i.test(n)) {
    return 'Fórmula 1';
  }
  if (
    /\b(f[uú]tbol|futbol|football|soccer|fifa|tyc\s*sports|futv|liga\s*mx|liga\s*profesional|premier\s*league|champions|copa\s*am[eé]rica|mundial)\b/i.test(
      n,
    )
  ) {
    return 'Fútbol';
  }
  if (
    /\b(disney|nick(?:elodeon)?|nick\s*jr|baby\s*tv|babyfirst|clan|cartoon|discovery\s*kids|canal\s*infantil|peques|funbox|bob\s*esponja|rugrats|hey\s*arnold|icarly|avatar:?\s*la\s*leyenda|tortugas\s*ninja|pluto\s*tv\s*(kids|junior|teen)|xtrema\s*cartoons|13\s*kids)\b/i.test(
      n,
    )
  ) {
    return 'Infantil';
  }
  if (/\b(naruto|one\s*piece|detective\s*conan|anime)\b/i.test(n)) {
    return 'Anime';
  }
  return null;
}

function categoryFromTags(tags: string[]): CanonicalCategory | null {
  const normalized = tags.map((t) => t.toLowerCase());
  if (normalized.includes('anime')) return 'Anime';
  if (normalized.includes('kids') || normalized.includes('family')) return 'Infantil';
  if (normalized.includes('sports') || normalized.includes('sport')) return 'Deportes';
  if (normalized.includes('news')) return 'Noticias';
  if (normalized.includes('movies') || normalized.includes('movie')) return 'Películas';
  if (normalized.includes('series')) return 'Series';
  if (normalized.includes('documentary') || normalized.includes('documentaries')) {
    return 'Documentales';
  }
  if (normalized.includes('music')) return 'Música';
  if (normalized.includes('animation')) return 'Animación';
  if (normalized.includes('religious') || normalized.includes('religion')) return 'Religión';
  if (normalized.includes('culture')) return 'Cultura';
  if (normalized.includes('education')) return 'Educación';
  if (normalized.includes('legislative')) return 'Legislatura';
  if (normalized.includes('lifestyle')) return 'Estilo de vida';
  if (normalized.includes('travel')) return 'Viajes';
  if (normalized.includes('cooking')) return 'Cocina';
  if (normalized.includes('classic') || normalized.includes('classics')) return 'Clásicos';
  if (normalized.includes('entertainment')) return 'Entretenimiento';

  for (const tag of normalized) {
    const mapped = TAG_TO_CATEGORY[tag];
    if (mapped) return mapped;
  }
  return null;
}

export function mapTvCategory(
  rawCategory: string | null | undefined,
  name?: string | null,
): CanonicalCategory {
  const cleanedName = cleanTvTitle(name ?? '');
  const fromName = cleanedName ? categoryFromName(cleanedName) : null;
  if (fromName) return fromName;

  const raw = (rawCategory ?? '').trim();
  if (ALREADY_CANONICAL.has(raw) && raw !== 'General') {
    return raw as CanonicalCategory;
  }
  if (raw === 'Infantil' || raw === 'Anime' || raw === 'Animación') {
    return raw;
  }

  const fromTags = categoryFromTags(parseTags(raw));
  if (fromTags) return fromTags;

  if (ALREADY_CANONICAL.has(raw)) return raw as CanonicalCategory;
  return 'General';
}

export function normalizeCountry(raw: string | null | undefined): string | null {
  if (raw == null) return null;
  const key = raw.trim().toLowerCase();
  if (HIDDEN_COUNTRIES.has(key)) return null;
  return COUNTRY_ALIASES[key] ?? raw.trim();
}

export function normalizeLanguage(raw: string | null | undefined): string {
  const key = (raw ?? '').trim().toLowerCase();
  if (!key || key === 'spa' || key === 'spanish' || key === 'español' || key === 'espanol') {
    return 'es';
  }
  if (key === 'eng' || key === 'english' || key === 'inglés' || key === 'ingles') return 'en';
  if (key === 'por' || key === 'portuguese' || key === 'portugués' || key === 'portugues') {
    return 'pt';
  }
  return key;
}

export function languageLabel(code: string): string {
  if (code === 'es') return 'Español';
  if (code === 'en') return 'Inglés';
  if (code === 'pt') return 'Portugués';
  return code;
}

export function normalizeChannelFields(input: {
  name?: string | null;
  category?: string | null;
  country?: string | null;
  language?: string | null;
}): {
  name: string;
  category: CanonicalCategory;
  country: string | null;
  language: string;
} {
  const name = cleanTvTitle(input.name ?? '') || (input.name ?? '').trim() || 'Canal';
  return {
    name,
    category: mapTvCategory(input.category, name),
    country: normalizeCountry(input.country),
    language: normalizeLanguage(input.language),
  };
}
