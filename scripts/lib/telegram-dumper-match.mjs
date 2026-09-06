/**
 * Pure helpers for matching Telegram dumper mp4 captions → catalog movie names.
 * Used by scripts/link-telegram-dumper-videos.mjs
 */

const ACCENT_MAP = {
  á: 'a', à: 'a', ä: 'a', â: 'a', ã: 'a',
  é: 'e', è: 'e', ë: 'e', ê: 'e',
  í: 'i', ì: 'i', ï: 'i', î: 'i',
  ó: 'o', ò: 'o', ö: 'o', ô: 'o', õ: 'o',
  ú: 'u', ù: 'u', ü: 'u', û: 'u',
  ñ: 'n', ç: 'c',
};

/** Strip diacritics / punctuation and collapse whitespace for fuzzy title compare. */
export function normalizeTitle(input) {
  if (!input) return '';
  let s = String(input).toLowerCase().normalize('NFD').replace(/\p{M}/gu, '');
  s = s.replace(/[áàäâãéèëêíìïîóòöôõúùüûñç]/g, (ch) => ACCENT_MAP[ch] ?? ch);
  s = s
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\b(the|el|la|los|las|un|una|de|del|y|and|le|les|des)\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return s;
}

/**
 * Parse title candidates + year from a Telegram caption.
 * Returns { titles: string[], year: string|null, rawFirstLine: string }
 */
export function parseCaptionMeta(text) {
  const raw = String(text ?? '').replace(/\r\n/g, '\n').trim();
  if (!raw) return { titles: [], year: null, rawFirstLine: '' };

  const lines = raw.split('\n').map((l) => l.trim()).filter(Boolean);
  const firstLine = lines[0] ?? '';

  let year = null;
  const yearLine = raw.match(/\bAño\s*:\s*([12]\d{3})\b/i)
    ?? raw.match(/\bAño\s+([12]\.?\d{3})\b/i)
    ?? firstLine.match(/\(([12]\d{3})\)/)
    ?? firstLine.match(/\[([12]\d{3})(?:,[^\]]*)?\]/)
    ?? firstLine.match(/(?:^|[^\d])([12]\d{3})(?:[^\d]|$)/)
    ?? raw.match(/(?:^|[^\d])([12]\d{3})(?:[^\d]|$)/);
  if (yearLine) {
    year = yearLine[1].replace(/\./g, '');
    if (year.length === 4) {
      // ok
    } else {
      year = null;
    }
  }
  // "Año 1.930" → already handled via replace dots above when capture has dots
  const dotted = raw.match(/\bAño\s+1\.(\d{3})\b/i);
  if (!year && dotted) year = `1${dotted[1]}`;

  const titles = new Set();

  const pushTitle = (t) => {
    let cleaned = String(t ?? '')
      .replace(/^[\s|📽🎬🎥#*-]+/u, '')
      .replace(/[\s|#-]+$/u, '')
      .replace(/\s*[\[(]\s*(?:VOSE|LAT|CAS|SUB|Castellano|Latino|subtitulad[ao]|short horror|USA|VO)[^)\]]*[)\]]/gi, '')
      .replace(/\s*[\[(]\s*[A-Z]{2,3}[\p{Emoji_Presentation}\p{Emoji}\uFE0F]*\s*[)\]]/gu, '')
      .replace(/#\S+/g, '')
      .replace(/https?:\/\/\S+/gi, '')
      .replace(/\s+/g, ' ')
      .trim();
    // Drop trailing year leftovers
    cleaned = cleaned.replace(/[.\s]*\(?\b[12]\d{3}\)?[.\s]*$/g, '').trim();
    cleaned = cleaned.replace(/[.\s]+$/g, '').trim();
    if (cleaned.length >= 2 && cleaned.length <= 120) titles.add(cleaned);
  };

  // "ES / EN" or "ES | EN"
  const slashParts = firstLine.split(/\s+\/\s+/);
  if (slashParts.length >= 2) {
    for (const p of slashParts) pushTitle(p.replace(/\s*\([12]\d{3}\).*$/, '').replace(/\s*Año:.*$/i, ''));
  }

  const pipeParts = firstLine.split(/\s+\|\s+/);
  if (pipeParts.length >= 2) {
    for (const p of pipeParts) {
      // skip donate / noise pipes
      if (/paypal|aportar|contenido/i.test(p)) continue;
      pushTitle(p.replace(/\s*\([12]\d{3}\).*$/, ''));
    }
  }

  // "nombre en español: X"
  const esName = raw.match(/nombre en español\s*:\s*([^\n.]+)/i);
  if (esName) pushTitle(esName[1]);

  // Base: first line without year / bracket tags
  let base = firstLine
    .replace(/\s*\[[^\]]*\]\s*/g, ' ')
    .replace(/\s*\([12]\d{3}\)\s*/g, ' ')
    .replace(/\s*Año\s*:?\s*[12.]?\d{3}.*$/i, '')
    .replace(/\.\s*[12]\d{3}\.?\s*$/g, '')
    .replace(/\s+[12]\d{3}\.?\s*$/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  // If still has "Title. Year." style leftover
  base = base.replace(/\.\s*$/, '').trim();
  pushTitle(base);

  // Also take segment before first " (" if useful
  const beforeParen = firstLine.split('(')[0];
  if (beforeParen && beforeParen !== firstLine) pushTitle(beforeParen);

  return {
    titles: [...titles],
    year,
    rawFirstLine: firstLine,
  };
}

/**
 * Build lookup maps from catalog movies (missing video only).
 * Returns { byNorm: Map<norm, movie[]>, movies }
 */
export function indexMoviesByNormalizedName(movies) {
  const byNorm = new Map();
  for (const movie of movies) {
    const norm = normalizeTitle(movie.name);
    if (!norm) continue;
    if (!byNorm.has(norm)) byNorm.set(norm, []);
    byNorm.get(norm).push(movie);
  }
  return byNorm;
}

/**
 * Conservative match: unique normalized title hit.
 * If year is known and multiple catalog rows share the name, require year.
 * If year is known and a unique year+name hit exists among candidates, use it.
 * Returns { movie, reason } | { movie: null, reason, ambiguous? }
 */
export function matchDumperToMovie({ titles, year }, byNorm) {
  const candidates = [];
  const seen = new Set();

  for (const title of titles) {
    const norm = normalizeTitle(title);
    if (!norm) continue;
    const hits = byNorm.get(norm) ?? [];
    for (const m of hits) {
      if (seen.has(m.id)) continue;
      seen.add(m.id);
      candidates.push({ movie: m, via: title, norm });
    }
  }

  if (candidates.length === 0) {
    return { movie: null, reason: 'no-match' };
  }

  if (year) {
    const yearHits = candidates.filter(
      (c) => String(c.movie.releaseYear ?? '') === String(year),
    );
    if (yearHits.length === 1) {
      return { movie: yearHits[0].movie, reason: 'unique-name+year', via: yearHits[0].via };
    }
    if (yearHits.length > 1) {
      return { movie: null, reason: 'ambiguous-year', ambiguous: yearHits.map((c) => c.movie) };
    }
    // Year known but no catalog year match — do not force a name-only match
    // when any candidate has a conflicting year; allow name-only only if all
    // candidates lack year OR we have exactly one candidate without year conflict.
    const noYearOrMatch = candidates.filter((c) => {
      const y = c.movie.releaseYear;
      return y == null || String(y).trim() === '' || String(y) === String(year);
    });
    if (noYearOrMatch.length === 1) {
      return { movie: noYearOrMatch[0].movie, reason: 'unique-name-year-compat', via: noYearOrMatch[0].via };
    }
    if (candidates.length === 1) {
      // Single name hit but year mismatch — skip (conservative)
      const cy = candidates[0].movie.releaseYear;
      if (cy != null && String(cy).trim() !== '' && String(cy) !== String(year)) {
        return { movie: null, reason: 'year-mismatch', candidate: candidates[0].movie };
      }
    }
    return { movie: null, reason: 'ambiguous-or-year', ambiguous: candidates.map((c) => c.movie) };
  }

  if (candidates.length === 1) {
    return { movie: candidates[0].movie, reason: 'unique-name', via: candidates[0].via };
  }

  return { movie: null, reason: 'ambiguous', ambiguous: candidates.map((c) => c.movie) };
}

export function nestedMp4VideoUrl(token) {
  return `/api/stream/${token}/${token}/video.mp4`;
}

export function relativeMp4Path(token) {
  return `${token}/${token}/video.mp4`;
}

// Self-check when executed directly
const isMain = process.argv[1] && fileURLToPathSafe(import.meta.url) === process.argv[1];

function fileURLToPathSafe(url) {
  try {
    return new URL(url).pathname;
  } catch {
    return '';
  }
}

if (isMain) {
  const asserts = [];
  const ok = (cond, msg) => {
    if (!cond) throw new Error(`FAIL: ${msg}`);
    asserts.push(msg);
  };

  ok(normalizeTitle('El Viaje a la Luna') === normalizeTitle('viaje a la luna'), 'normalize drops articles');
  const p1 = parseCaptionMeta('Le voyage dans la lune / El viaje a la luna\nAño: 1902\nFrancia');
  ok(p1.year === '1902', 'year from Año:');
  ok(p1.titles.some((t) => /viaje a la luna/i.test(t)), 'es title from slash');
  const p2 = parseCaptionMeta('Steamboat Willie | Barco de Vapor Willie (1928)');
  ok(p2.year === '1928', 'year from (YYYY)');
  const p3 = parseCaptionMeta('John Tucker Must Die (2006) [CAS🇪🇸] ULD240p');
  ok(p3.year === '2006', 'year + CAS tag');
  ok(p3.titles.some((t) => normalizeTitle(t) === normalizeTitle('John Tucker Must Die')), 'title cleaned');

  const movies = [
    { id: '1', token: 'aaa', name: 'El viaje a la luna', releaseYear: '1902' },
    { id: '2', token: 'bbb', name: 'Chronopolis', releaseYear: '1983' },
    { id: '3', token: 'ccc', name: 'Dune', releaseYear: '2021' },
    { id: '4', token: 'ddd', name: 'Dune', releaseYear: '1984' },
  ];
  const byNorm = indexMoviesByNormalizedName(movies);
  const m1 = matchDumperToMovie(parseCaptionMeta('Le voyage dans la lune / El viaje a la luna\nAño: 1902'), byNorm);
  ok(m1.movie?.id === '1', 'match viaje');
  const m2 = matchDumperToMovie(parseCaptionMeta('Chronopolis (1983)'), byNorm);
  ok(m2.movie?.id === '2', 'match chronopolis');
  const m3 = matchDumperToMovie(parseCaptionMeta('Dune (2021)'), byNorm);
  ok(m3.movie?.id === '3', 'dune year disambiguates');
  const m4 = matchDumperToMovie(parseCaptionMeta('Dune'), byNorm);
  ok(m4.movie == null && m4.reason === 'ambiguous', 'dune without year skipped');

  console.log(`self-test OK (${asserts.length} checks)`);
}
