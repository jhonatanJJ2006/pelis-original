/**
 * VidNest backend client.
 *
 * VidNest's embed page (`vidnest.fun/anime/{anilistId}/{ep}/{sub|dub}`) talks
 * to its own API to resolve playable HLS sources. Reverse-engineered from the
 * current production bundle (module 50586 / `useAnimeData`):
 *
 * 1. Prefer `GET https://new.vidnest.fun/aniwave_hls/{anilistId}/{ep}/{sub|dub}`
 *    — returns real MPEG-TS playlists (CDN hosts rotate; currently
 *    `*.dpopdrop89.store`). No API key required.
 * 2. Fall back to `…/animehub/…` (Megaplay) then
 *    `…/hianime/anime/…/{sub|dub}/hd-2`.
 * 3. Responses may be plain JSON or `{ encrypted: true, data }` where `data`
 *    is base64 with alphabet
 *    `RB0fpH8ZEyVLkv7c2i6MAJ5u3IKFDxlS1NTsnGaqmXYdUrtzjwObCgQP94hoeW+/=`
 *    (optionally gzip-compressed after decode).
 *
 * The legacy `/hianime/anime/{id}/{ep}/{sub}` path (without `/hd-2`) still
 * answers 200 but points at TikTok CDN "segments" that are actual PNG images —
 * unplayable. We deliberately do not call it.
 *
 * The old `jz.petarydweller.shop/cuid/` key endpoint is optional: current
 * endpoints work without it, and the TLS handshake often fails from servers.
 */

import { gunzipSync } from 'node:zlib';

const VIDNEST_API_BASE = 'https://new.vidnest.fun';
const VIDNEST_PUBLIC_ORIGIN = 'https://vidnest.fun';
const CUID_ENDPOINT = 'https://jz.petarydweller.shop/cuid/';

export const VIDNEST_B64_ALPHABET =
  'RB0fpH8ZEyVLkv7c2i6MAJ5u3IKFDxlS1NTsnGaqmXYdUrtzjwObCgQP94hoeW+/=';

/** Browser-ish headers the anime CDNs expect. */
export const ANIME_CDN_HEADERS: Record<string, string> = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:137.0) Gecko/20100101 Firefox/137.0',
  Accept: '*/*',
  'Accept-Language': 'en-US,en;q=0.5',
  Origin: 'https://megaplay.buzz',
  Referer: 'https://megaplay.buzz/',
};

export interface VidnestSource {
  file: string;
  type?: string;
  /** Upstream referer hint when the CDN is picky (e.g. Aniwave). */
  referer?: string;
}

export interface VidnestTrack {
  file: string;
  label?: string;
  kind?: string;
  default?: boolean;
}

export interface VidnestEpisodeData {
  sources: VidnestSource[];
  tracks: VidnestTrack[];
  intro?: { start: number; end: number } | null;
  outro?: { start: number; end: number } | null;
  error?: string;
  status?: number;
  success?: boolean;
  /** Which VidNest server returned this payload (for diagnostics). */
  server?: string;
}

type VidnestServer = 'aniwave' | 'megaplay' | 'anitaku';

const SERVER_ENDPOINTS: Array<{
  id: VidnestServer;
  buildUrl: (anilistId: number, episodeNumber: number, lang: string) => string;
  defaultReferer?: string;
}> = [
  {
    id: 'aniwave',
    buildUrl: (anilistId, episodeNumber, lang) =>
      `${VIDNEST_API_BASE}/aniwave_hls/${anilistId}/${episodeNumber}/${lang}`,
    defaultReferer: 'https://play.echovideo.ru/',
  },
  {
    id: 'megaplay',
    buildUrl: (anilistId, episodeNumber, lang) =>
      `${VIDNEST_API_BASE}/animehub/${anilistId}/${episodeNumber}/${lang}`,
  },
  {
    id: 'anitaku',
    buildUrl: (anilistId, episodeNumber, lang) =>
      `${VIDNEST_API_BASE}/hianime/anime/${anilistId}/${episodeNumber}/${lang}/hd-2`,
  },
];

/** Decode VidNest's scrambled alphabet to bytes (no string decode yet). */
export function decodeVidnestCipherBytes(data: string): Uint8Array {
  const map = new Map<string, number>();
  for (let i = 0; i < VIDNEST_B64_ALPHABET.length; i++) {
    map.set(VIDNEST_B64_ALPHABET[i]!, i);
  }
  const bytes: number[] = [];
  for (let i = 0; i < data.length; i += 4) {
    let chunk = data.slice(i, i + 4);
    while (chunk.length < 4) chunk += '=';
    const idx: number[] = [];
    for (let j = 0; j < 4; j++) {
      const v = map.get(chunk[j]!);
      idx.push(v === undefined ? 64 : v);
    }
    bytes.push(((idx[0]! << 2) | (idx[1]! >> 4)) & 0xff);
    if (idx[2] !== 64) bytes.push((((idx[1]! & 15) << 4) | (idx[2]! >> 2)) & 0xff);
    if (idx[3] !== 64) bytes.push((((idx[2]! & 3) << 6) | idx[3]!) & 0xff);
  }
  return new Uint8Array(bytes);
}

/**
 * Base64 decode with VidNest's scrambled alphabet. If the payload is gzip
 * (magic `1f 8b`), inflate before returning UTF-8 text.
 */
export function decodeVidnestCipher(data: string): string {
  let bytes = decodeVidnestCipherBytes(data);
  if (bytes.length >= 2 && bytes[0] === 0x1f && bytes[1] === 0x8b) {
    bytes = gunzipSync(bytes);
  }
  return new TextDecoder().decode(bytes);
}

function pickFile(entry: Record<string, unknown> | undefined): string | null {
  if (!entry) return null;
  const file = entry.file ?? entry.url;
  return typeof file === 'string' && file.length > 0 ? file : null;
}

/**
 * Normalize the slightly different JSON shapes returned by Aniwave / Megaplay /
 * Anitaku into the shape the rest of the app expects.
 */
export function normalizeVidnestEpisodeData(
  raw: Record<string, unknown>,
  opts?: { server?: VidnestServer; defaultReferer?: string }
): VidnestEpisodeData {
  const sourceList = (raw.sources ?? raw.multiSrc ?? []) as Array<Record<string, unknown>>;
  const sources: VidnestSource[] = [];
  for (const entry of sourceList) {
    const file = pickFile(entry);
    if (!file) continue;
    const type = typeof entry.type === 'string' ? entry.type : undefined;
    const referer =
      (typeof entry.referer === 'string' && entry.referer) || opts?.defaultReferer || undefined;
    sources.push({ file, type, referer });
  }

  const trackList = (raw.tracks ?? raw.subtitles ?? []) as Array<Record<string, unknown>>;
  const tracks: VidnestTrack[] = [];
  for (const [index, entry] of trackList.entries()) {
    const file = pickFile(entry);
    if (!file) continue;
    const kindRaw = typeof entry.kind === 'string' ? entry.kind : 'captions';
    const kind = kindRaw === 'subtitles' || kindRaw === 'captions' ? kindRaw : 'captions';
    const label =
      (typeof entry.label === 'string' && entry.label) ||
      (typeof entry.lang === 'string' && entry.lang) ||
      `Subtítulo ${index + 1}`;
    tracks.push({
      file,
      kind,
      label,
      default: Boolean(entry.default) || index === 0,
    });
  }

  const intro = (raw.intro as VidnestEpisodeData['intro']) ?? null;
  const outro = (raw.outro as VidnestEpisodeData['outro']) ?? null;
  const error = typeof raw.error === 'string' && raw.error.length > 0 ? raw.error : undefined;

  return {
    sources,
    tracks,
    intro,
    outro,
    error,
    status: typeof raw.status === 'number' ? raw.status : undefined,
    success: typeof raw.success === 'boolean' ? raw.success : undefined,
    server: opts?.server,
  };
}

export async function parseVidnestResponse(response: Response): Promise<Record<string, unknown>> {
  const payload = (await response.json()) as {
    data?: string;
    encrypted?: boolean;
  } & Record<string, unknown>;

  if (payload.encrypted && typeof payload.data === 'string') {
    const plain = decodeVidnestCipher(payload.data);
    try {
      return JSON.parse(plain) as Record<string, unknown>;
    } catch {
      throw new Error('vidnest: la respuesta descifrada no es JSON válido');
    }
  }
  return payload;
}

let apiKeyCache: { key: string | null; at: number } | null = null;
const API_KEY_TTL_MS = 10 * 60 * 1000;
const API_KEY_FAIL_TTL_MS = 60 * 1000;

async function fetchApiKey(): Promise<string | null> {
  if (apiKeyCache) {
    const ttl = apiKeyCache.key ? API_KEY_TTL_MS : API_KEY_FAIL_TTL_MS;
    if (Date.now() - apiKeyCache.at < ttl) return apiKeyCache.key;
  }
  try {
    const response = await fetch(CUID_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Origin: VIDNEST_PUBLIC_ORIGIN,
        Referer: `${VIDNEST_PUBLIC_ORIGIN}/`,
        'User-Agent': ANIME_CDN_HEADERS['User-Agent']!,
      },
      body: JSON.stringify({ f: VIDNEST_PUBLIC_ORIGIN }),
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) {
      apiKeyCache = { key: null, at: Date.now() };
      return null;
    }
    const data = (await response.json()) as { key?: string };
    if (!data.key) {
      apiKeyCache = { key: null, at: Date.now() };
      return null;
    }
    apiKeyCache = { key: data.key, at: Date.now() };
    return data.key;
  } catch {
    // The legacy cuid host often fails TLS. Current endpoints work without a key,
    // so remember the failure briefly instead of blocking every server attempt.
    apiKeyCache = { key: null, at: Date.now() };
    return null;
  }
}

function invalidateApiKey(): void {
  apiKeyCache = null;
}

async function requestVidnestEndpoint(url: string, apiKey: string | null): Promise<Response> {
  const headers: Record<string, string> = {
    Accept: '*/*',
    Referer: `${VIDNEST_PUBLIC_ORIGIN}/`,
    Origin: VIDNEST_PUBLIC_ORIGIN,
    'User-Agent': ANIME_CDN_HEADERS['User-Agent']!,
  };
  if (apiKey) headers['x-api-key'] = apiKey;
  return fetch(url, { headers, signal: AbortSignal.timeout(15000) });
}

async function fetchOneServer(
  server: (typeof SERVER_ENDPOINTS)[number],
  anilistId: number,
  episodeNumber: number,
  subOrDub: 'sub' | 'dub'
): Promise<VidnestEpisodeData> {
  const url = server.buildUrl(anilistId, episodeNumber, subOrDub);
  let apiKey = await fetchApiKey();
  let response = await requestVidnestEndpoint(url, apiKey);

  // A stale cached key surfaces as 401/403 — drop it and retry once without /
  // with a fresh key.
  if (response.status === 401 || response.status === 403) {
    invalidateApiKey();
    apiKey = await fetchApiKey();
    response = await requestVidnestEndpoint(url, apiKey);
  }
  if (!response.ok) throw new Error(`vidnest ${server.id}: HTTP ${response.status}`);

  const raw = await parseVidnestResponse(response);
  const normalized = normalizeVidnestEpisodeData(raw, {
    server: server.id,
    defaultReferer: server.defaultReferer,
  });
  if (normalized.error) throw new Error(`vidnest ${server.id}: ${normalized.error}`);
  if (normalized.sources.length === 0) {
    throw new Error(`vidnest ${server.id}: sin fuentes`);
  }
  return normalized;
}

/**
 * Resolve playable sources for one episode. Tries Aniwave first (verified
 * playable HLS), then Megaplay / Anitaku. Throws only when every server fails
 * so the caller can fall back to another provider.
 */
export async function fetchVidnestEpisode(
  anilistId: number,
  episodeNumber: number,
  subOrDub: 'sub' | 'dub' = 'sub'
): Promise<VidnestEpisodeData> {
  const errors: string[] = [];
  for (const server of SERVER_ENDPOINTS) {
    try {
      return await fetchOneServer(server, anilistId, episodeNumber, subOrDub);
    } catch (err) {
      errors.push(err instanceof Error ? err.message : String(err));
    }
  }
  throw new Error(`vidnest: ningún servidor respondió (${errors.join('; ')})`);
}
