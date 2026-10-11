/**
 * AnimeFLV client: resolves the episode page URL (`/ver/{slug}-{episode}`) for
 * a catalog row.
 *
 * AnimeFLV splits series per season with the same naming convention AniList
 * uses ("Attack on Titan Season 2" -> `shingeki-no-kyojin-season-2`), so the
 * row title maps to the right page. The episode page itself is embedded in the
 * user's browser (it only serves its player to audience networks), but the
 * search and the episode lists are reachable from our server, which is all we
 * need to build the URL.
 */
import type { EmbedContext } from './anime-providers';

const BROWSER_USER_AGENT =
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36';

const ANIMEFLV_BASE = 'https://www4.animeflv.net';

const NAV_SLUGS = new Set([
  'anime',
  'browse',
  'directorio',
  'emision',
  'generos',
  'peliculas',
  'ovas',
  'especiales',
  'estrenos',
  'foro',
  'contacto',
]);

interface SlugCacheEntry {
  at: number;
  slug: string | null;
  episodeNumbers: number[];
}

const slugCache = new Map<string, SlugCacheEntry>();
const SLUG_TTL_MS = 24 * 60 * 60 * 1000;
const SLUG_NULL_TTL_MS = 60 * 60 * 1000;
const MAX_PAGES_TO_CHECK = 5;

async function fetchHtml(url: string, timeoutMs = 10000): Promise<string | null> {
  try {
    const response = await fetch(url, {
      signal: AbortSignal.timeout(timeoutMs),
      redirect: 'follow',
      headers: {
        'User-Agent': BROWSER_USER_AGENT,
        Accept: 'text/html',
        'Accept-Language': 'es-ES,es;q=0.9',
      },
    });
    if (!response.ok) return null;
    return response.text();
  } catch {
    return null;
  }
}

/** Parse the `episodes = [[n,id],...]` array embedded in anime pages. */
function parseEpisodeNumbers(html: string): number[] {
  const match = html.match(/episodes\s*=\s*(\[\[[\s\S]*?\]\])/);
  const raw = match?.[1];
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as Array<[number, number]>;
    return parsed.map(([number]) => number).filter((n) => Number.isFinite(n));
  } catch {
    return [];
  }
}

/** Slugs of the anime cards in a browse/search page, in relevance order. */
function parseSearchSlugs(html: string): string[] {
  const slugs: string[] = [];
  for (const match of html.matchAll(/\/anime\/([a-z0-9-]+)/g)) {
    const slug = match[1];
    if (!slug || !slug.includes('-') || NAV_SLUGS.has(slug)) continue;
    if (!slugs.includes(slug)) slugs.push(slug);
  }
  return slugs;
}

function normalizeTitle(title: string): string {
  return title
    .replace(/[^a-z0-9]+/gi, ' ')
    .toLowerCase()
    .trim();
}

/**
 * Find the AnimeFLV page (slug) for a season row. The page whose episode list
 * contains the requested episode number wins; otherwise the page with the
 * highest episode count that covers it is used.
 */
async function resolveAnimeflvSlug(title: string, episodeNumber: number): Promise<string | null> {
  const key = normalizeTitle(title);
  if (!key) return null;

  const cached = slugCache.get(key);
  if (cached) {
    const ttl = cached.slug ? SLUG_TTL_MS : SLUG_NULL_TTL_MS;
    if (Date.now() - cached.at < ttl) {
      if (cached.episodeNumbers.includes(episodeNumber)) return cached.slug;
      if (cached.slug && cached.episodeNumbers.length > 0) {
        const max = Math.max(...cached.episodeNumbers);
        if (episodeNumber <= max) return cached.slug;
      }
      return null;
    }
  }

  const searchHtml = await fetchHtml(`${ANIMEFLV_BASE}/browse?q=${encodeURIComponent(title)}`);
  const candidates = searchHtml ? parseSearchSlugs(searchHtml) : [];
  if (candidates.length === 0) {
    slugCache.set(key, { at: Date.now(), slug: null, episodeNumbers: [] });
    return null;
  }

  let best: { slug: string; episodeNumbers: number[] } | null = null;
  for (const slug of candidates.slice(0, MAX_PAGES_TO_CHECK)) {
    const pageHtml = await fetchHtml(`${ANIMEFLV_BASE}/anime/${slug}`);
    if (!pageHtml) continue;
    const episodeNumbers = parseEpisodeNumbers(pageHtml);
    if (episodeNumbers.length === 0) continue;
    if (episodeNumbers.includes(episodeNumber)) {
      slugCache.set(key, { at: Date.now(), slug, episodeNumbers });
      return slug;
    }
    if (!best || Math.max(...episodeNumbers) > Math.max(...best.episodeNumbers)) {
      best = { slug, episodeNumbers };
    }
  }

  const chosen = best && episodeNumber <= Math.max(...best.episodeNumbers) ? best : null;
  slugCache.set(key, {
    at: Date.now(),
    slug: chosen?.slug ?? null,
    episodeNumbers: chosen?.episodeNumbers ?? [],
  });
  return chosen?.slug ?? null;
}

/** Full iframe URL for an AnimeFLV episode, or null when the series is absent. */
export async function resolveAnimeflvEmbedUrl(
  ctx: EmbedContext,
  opts: { title: string }
): Promise<string | null> {
  const slug = await resolveAnimeflvSlug(opts.title, ctx.episodeNumber);
  if (!slug) return null;
  return `${ANIMEFLV_BASE}/ver/${slug}-${ctx.episodeNumber}`;
}
