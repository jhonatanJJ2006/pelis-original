/**
 * Fuentes HLS de Consumet listas para los clientes.
 *
 * - Sin `Referer` exigido por el CDN: URL directa. El vídeo va del CDN al
 *   espectador y no consume la subida de Movies (150–220 KB/s).
 * - Con `Referer`: el navegador no puede mandarlo, así que la URL principal pasa
 *   por `/api/anime/stream` (mismo proxy que VidNest, sin prefetch). Además se
 *   devuelven `directUrl` + `headers` para que el reproductor nativo de la TV
 *   (ExoPlayer) las pida directo con esas cabeceras.
 */
import type { VideoSourceResult } from './consumet-client';

export interface ConsumetClientSource {
  url: string;
  quality: string;
  isM3U8: boolean;
  directUrl?: string;
  headers?: Record<string, string>;
}

export interface ConsumetClientSubtitle {
  url: string;
  lang: string;
}

const PROXY_PATH = '/api/anime/stream';

function refererOf(headers: Record<string, string> | undefined): string | undefined {
  if (!headers) return undefined;
  const key = Object.keys(headers).find((k) => k.toLowerCase() === 'referer');
  const value = key ? headers[key]?.trim() : undefined;
  return value ? value : undefined;
}

function proxied(url: string, referer: string | undefined): string {
  const params = new URLSearchParams({ u: url });
  if (referer) params.set('r', referer);
  return `${PROXY_PATH}?${params.toString()}`;
}

function isHttpUrl(raw: string | undefined): raw is string {
  if (!raw) return false;
  try {
    const { protocol } = new URL(raw);
    return protocol === 'https:' || protocol === 'http:';
  } catch {
    return false;
  }
}

/** Orden: `auto`/`default` (master con varias calidades) primero, luego de mayor a menor. */
function qualityRank(quality: string): number {
  const q = quality.toLowerCase();
  if (q === 'auto' || q === 'default' || q === 'backup') return q === 'backup' ? 1 : 0;
  const n = Number.parseInt(q, 10);
  return Number.isFinite(n) ? 10_000 - n : 5_000;
}

export function toConsumetHlsSources(video: VideoSourceResult): {
  sources: ConsumetClientSource[];
  subtitles: ConsumetClientSubtitle[];
} {
  const referer = refererOf(video.headers);
  const seen = new Set<string>();
  const sources = video.sources
    .filter((s) => isHttpUrl(s.url))
    .filter((s) => (seen.has(s.url) ? false : (seen.add(s.url), true)))
    .map((s): ConsumetClientSource => {
      const isM3U8 = s.isM3U8 ?? s.url.toLowerCase().includes('.m3u8');
      if (!referer) return { url: s.url, quality: s.quality, isM3U8 };
      return {
        url: proxied(s.url, referer),
        quality: s.quality,
        isM3U8,
        directUrl: s.url,
        headers: { Referer: referer },
      };
    })
    .sort((a, b) => qualityRank(a.quality) - qualityRank(b.quality));

  const subtitles = video.subtitles
    .filter((t) => isHttpUrl(t.url) && t.lang.toLowerCase() !== 'thumbnails')
    .map((t) => ({ url: referer ? proxied(t.url, referer) : t.url, lang: t.lang }));

  return { sources, subtitles };
}
