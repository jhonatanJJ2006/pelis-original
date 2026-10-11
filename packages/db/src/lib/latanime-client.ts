/**
 * latanime.org client.
 *
 * latanime is a LATAM index site whose episode pages (`/ver/{slug}-episodio-{n}`)
 * list one base64-encoded iframe URL per hosting server inside
 * `<a class="play-video repro-item cap" data-player="...">name</a>` anchors,
 * plus download mirrors (`a.direct-link`) that include Mega `#!id!key` links.
 *
 * We scrape those lists server-side and hand back the raw embed URLs for the
 * file hosts we surface as providers: YourUpload, Mega and VOE. Availability
 * varies per title (older uploads tend to have YourUpload/Mega, newer ones
 * Mega/VOE), so callers treat a missing entry as "this episode is not on
 * that host".
 */
import type { EmbedContext } from './anime-providers';

const BROWSER_USER_AGENT =
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36';

const BASE = 'https://latanime.org';

export type LatAnimeHostId = 'yourupload' | 'mega' | 'voe';

interface SlugCacheEntry {
  at: number;
  slug: string | null;
}

const slugCache = new Map<string, SlugCacheEntry>();
const SLUG_TTL_MS = 24 * 60 * 60 * 1000;
const SLUG_NULL_TTL_MS = 60 * 60 * 1000;

interface ServersCacheEntry {
  at: number;
  servers: Partial<Record<LatAnimeHostId, string>>;
}

const serversCache = new Map<string, ServersCacheEntry>();
const SERVERS_TTL_MS = 10 * 60 * 1000;

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

function normalizeTitle(title: string): string {
  return title
    .replace(/[^a-z0-9]+/gi, ' ')
    .toLowerCase()
    .trim();
}

/** Slugs (`/anime/{slug}`) of the cards on a search result page. */
function parseSearchSlugs(html: string): string[] {
  const slugs: string[] = [];
  for (const match of html.matchAll(/latanime\.org\/anime\/([a-z0-9-]+)/g)) {
    const slug = match[1];
    if (slug && !slugs.includes(slug)) slugs.push(slug);
  }
  return slugs;
}

/** Episode numbers linked from an anime page (`/ver/{slug}-episodio-{n}`). */
function parseEpisodeNumbers(html: string): number[] {
  const numbers: number[] = [];
  for (const match of html.matchAll(/\/ver\/([a-z0-9-]+)-episodio-(\d+)/g)) {
    const n = Number(match[2]);
    if (Number.isFinite(n) && !numbers.includes(n)) numbers.push(n);
  }
  return numbers;
}

/**
 * Find the latanime slug whose episode list covers `episodeNumber`. Several
 * rows usually match a title (latino / castellano / CR cuts); the first one
 * that actually has the requested episode wins.
 */
async function resolveLatAnimeSlug(title: string, episodeNumber: number): Promise<string | null> {
  const key = normalizeTitle(title);
  if (!key) return null;

  const cached = slugCache.get(key);
  if (cached) {
    const ttl = cached.slug ? SLUG_TTL_MS : SLUG_NULL_TTL_MS;
    if (Date.now() - cached.at < ttl) return cached.slug;
  }

  const searchHtml = await fetchHtml(`${BASE}/buscar?q=${encodeURIComponent(title)}`);
  const candidates = searchHtml ? parseSearchSlugs(searchHtml) : [];

  let chosen: string | null = null;
  for (const slug of candidates.slice(0, 5)) {
    const pageHtml = await fetchHtml(`${BASE}/anime/${slug}`);
    if (!pageHtml) continue;
    const episodeNumbers = parseEpisodeNumbers(pageHtml);
    if (episodeNumbers.length === 0) continue;
    if (episodeNumbers.includes(episodeNumber) || episodeNumber <= Math.max(...episodeNumbers)) {
      chosen = slug;
      break;
    }
  }

  slugCache.set(key, { at: Date.now(), slug: chosen });
  return chosen;
}

/**
 * Normalize any Mega URL shape into the canonical embed form
 * `https://mega.nz/embed/{id}!{key}`. Observed shapes: `#!{id}!{key}`,
 * `/file/{id}#{key}`, `/embed/{id}!{key}` and `/embed/#!{id}!{key}`.
 */
export function toMegaEmbedUrl(raw: string): string | null {
  if (!raw.toLowerCase().includes('mega.nz')) return null;
  let m = raw.match(/#!([A-Za-z0-9_-]{6,})!([A-Za-z0-9_-]+)/);
  if (!m) {
    m = raw.match(/\/(?:file|embed)\/(?:#!?)?([A-Za-z0-9_-]{6,})[#!]([A-Za-z0-9_-]+)/);
  }
  if (!m) return null;
  return `https://mega.nz/embed/${m[1]}!${m[2]}`;
}

/** All hosts we understand, resolved for one episode. */
export async function resolveLatAnimeServers(
  ctx: EmbedContext,
  opts: { title: string }
): Promise<Partial<Record<LatAnimeHostId, string>>> {
  const cacheKey = `${normalizeTitle(opts.title)}#${ctx.episodeNumber}`;
  const cached = serversCache.get(cacheKey);
  if (cached && Date.now() - cached.at < SERVERS_TTL_MS) return cached.servers;

  const empty: Partial<Record<LatAnimeHostId, string>> = {};

  const slug = await resolveLatAnimeSlug(opts.title, ctx.episodeNumber);
  if (!slug) {
    serversCache.set(cacheKey, { at: Date.now(), servers: empty });
    return empty;
  }

  const html = await fetchHtml(`${BASE}/ver/${slug}-episodio-${ctx.episodeNumber}`);
  if (!html) {
    serversCache.set(cacheKey, { at: Date.now(), servers: empty });
    return empty;
  }

  const servers: Partial<Record<LatAnimeHostId, string>> = {};

  for (const match of html.matchAll(/data-player="([^"]+)"[^>]*>([^<]+)</g)) {
    const name = (match[2] ?? '').trim().toLowerCase();
    if (name !== 'yourupload' && name !== 'voe' && name !== 'mega') continue;
    const b64 = match[1];
    if (!b64) continue;
    try {
      const url = Buffer.from(b64, 'base64').toString('utf8').trim();
      if (!/^https?:\/\//.test(url)) continue;
      if (name === 'mega') {
        const embed = toMegaEmbedUrl(url);
        if (embed) servers.mega ??= embed;
      } else if (name === 'yourupload' || name === 'voe') {
        servers[name] ??= url;
      }
    } catch {
      // malformed base64 — skip this anchor
    }
  }

  if (!servers.mega) {
    for (const match of html.matchAll(/class="direct-link"[^>]*href="([^"]+)"/g)) {
      const href = match[1];
      if (!href) continue;
      const embed = toMegaEmbedUrl(href);
      if (embed) {
        servers.mega = embed;
        break;
      }
    }
  }

  serversCache.set(cacheKey, { at: Date.now(), servers });
  return servers;
}

/** Convenience wrapper used by each provider definition. */
export async function resolveLatAnimeEmbedUrl(
  host: LatAnimeHostId,
  ctx: EmbedContext,
  opts: { title: string }
): Promise<string | null> {
  const servers = await resolveLatAnimeServers(ctx, opts);
  return servers[host] ?? null;
}
