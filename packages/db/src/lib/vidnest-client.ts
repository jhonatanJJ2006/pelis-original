/**
 * VidNest backend client.
 *
 * VidNest's embed page (`vidnest.fun/anime/{anilistId}/{ep}/{sub|dub}`) talks
 * to its own API to resolve playable HLS sources. The flow, reverse-engineered
 * from its production bundle (chunk `0203bf81cfbbfd38.js`, module 50586):
 *
 * 1. POST `https://jz.petarydweller.shop/cuid/` with `{ f: "https://vidnest.fun" }`
 *    → `{ key }` used as `x-api-key`.
 * 2. GET `https://new.vidnest.fun/hianime/anime/{anilistId}/{ep}/{sub|dub}`
 *    with that key → `{ data: "<scrambled base64>", encrypted: true }`.
 * 3. The "cipher" is plain base64 with a custom alphabet — no AES:
 *    `RB0fpH8ZEyVLkv7c2i6MAJ5u3IKFDxlS1NTsnGaqmXYdUrtzjwObCgQP94hoeW+/=`
 *
 * The resulting JSON contains `sources` (m3u8 on cdn.watching.onl), `tracks`
 * (VTT subtitles) and intro/outro markers. The CDN requires browser-ish
 * headers with `Origin/Referer: https://megaplay.buzz/`, which the stream
 * proxy injects when fetching on the client's behalf.
 */

const CUID_ENDPOINT = 'https://jz.petarydweller.shop/cuid/';
const VIDNEST_API_BASE = 'https://new.vidnest.fun';
const VIDNEST_PUBLIC_ORIGIN = 'https://vidnest.fun';

export const VIDNEST_B64_ALPHABET =
  'RB0fpH8ZEyVLkv7c2i6MAJ5u3IKFDxlS1NTsnGaqmXYdUrtzjwObCgQP94hoeW+/=';

/** Headers the watching.onl CDN expects; without them Cloudflare blocks us. */
export const ANIME_CDN_HEADERS: Record<string, string> = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:137.0) Gecko/20100101 Firefox/137.0',
  Accept: '*/*',
  'Accept-Language': 'en-US,en;q=0.5',
  Origin: 'https://megaplay.buzz',
  Referer: 'https://megaplay.buzz/',
};

export interface VidnestSource {
  file: string;
  type?: string;
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
}

/** Base64 decode with VidNest's scrambled alphabet. */
export function decodeVidnestCipher(data: string): string {
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
  return new TextDecoder().decode(new Uint8Array(bytes));
}

let apiKeyCache: { key: string; at: number } | null = null;
const API_KEY_TTL_MS = 10 * 60 * 1000;

async function fetchApiKey(): Promise<string> {
  if (apiKeyCache && Date.now() - apiKeyCache.at < API_KEY_TTL_MS) {
    return apiKeyCache.key;
  }
  const response = await fetch(CUID_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: VIDNEST_PUBLIC_ORIGIN,
      Referer: `${VIDNEST_PUBLIC_ORIGIN}/`,
      'User-Agent': ANIME_CDN_HEADERS['User-Agent']!,
    },
    body: JSON.stringify({ f: VIDNEST_PUBLIC_ORIGIN }),
    signal: AbortSignal.timeout(10000),
  });
  if (!response.ok) throw new Error(`cuid: HTTP ${response.status}`);
  const data = (await response.json()) as { key?: string };
  if (!data.key) throw new Error('cuid: respuesta sin key');
  apiKeyCache = { key: data.key, at: Date.now() };
  return data.key;
}

function invalidateApiKey(): void {
  apiKeyCache = null;
}

/**
 * Resolve playable sources for one episode. Throws on hard failures so the
 * caller can decide whether to fall back to another provider.
 */
export async function fetchVidnestEpisode(
  anilistId: number,
  episodeNumber: number,
  subOrDub: 'sub' | 'dub' = 'sub',
): Promise<VidnestEpisodeData> {
  const url = `${VIDNEST_API_BASE}/hianime/anime/${anilistId}/${episodeNumber}/${subOrDub}`;

  const request = async (apiKey: string) =>
    fetch(url, {
      headers: {
        'x-api-key': apiKey,
        Accept: '*/*',
        Referer: `${VIDNEST_PUBLIC_ORIGIN}/`,
        Origin: VIDNEST_PUBLIC_ORIGIN,
        'User-Agent': ANIME_CDN_HEADERS['User-Agent']!,
      },
      signal: AbortSignal.timeout(15000),
    });

  let apiKey = await fetchApiKey();
  let response = await request(apiKey);

  // A stale cached key surfaces as 401/403 — refresh once and retry.
  if (response.status === 401 || response.status === 403) {
    invalidateApiKey();
    apiKey = await fetchApiKey();
    response = await request(apiKey);
  }
  if (!response.ok) throw new Error(`vidnest api: HTTP ${response.status}`);

  const payload = (await response.json()) as {
    data?: string;
    encrypted?: boolean;
  };

  let decoded: VidnestEpisodeData;
  if (payload.encrypted && typeof payload.data === 'string') {
    const plain = decodeVidnestCipher(payload.data);
    try {
      decoded = JSON.parse(plain) as VidnestEpisodeData;
    } catch {
      throw new Error('vidnest: la respuesta descifrada no es JSON válido');
    }
  } else {
    decoded = payload as unknown as VidnestEpisodeData;
  }

  if (decoded.error) throw new Error(`vidnest: ${decoded.error}`);
  return decoded;
}
