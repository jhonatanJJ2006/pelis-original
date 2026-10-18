/**
 * Adjunta una fuente al `<video>`: hls.js cuando hay MSE, HLS nativo
 * (Safari/iOS/tvOS) como fallback y `src` directo para archivos.
 *
 * hls.js se carga con `import()` dinámico para no inflar el bundle inicial.
 *
 * @module @pelis/player/hls
 */

import type Hls from 'hls.js';
import type { ErrorData, HlsConfig } from 'hls.js';

import type { PlayerSourceType } from './types';

type HlsConstructor = typeof Hls;

const MAX_MEDIA_RECOVERIES = 2;
const MAX_NETWORK_RETRIES = 3;
const NATIVE_HLS_MIME = 'application/vnd.apple.mpegurl';

let cachedHlsPromise: Promise<HlsConstructor | null> | null = null;

/** Carga (una vez) el constructor de hls.js. Devuelve `null` si falla. */
export function loadHlsModule(): Promise<HlsConstructor | null> {
  if (!cachedHlsPromise) {
    cachedHlsPromise = import('hls.js')
      .then((m) => m.default)
      .catch(() => {
        // Permitir reintentar en el siguiente attach (p. ej. chunk caído).
        cachedHlsPromise = null;
        return null;
      });
  }
  return cachedHlsPromise;
}

/** `true` si `src` debe reproducirse como HLS. */
export function isHlsSource(src: string, type: PlayerSourceType = 'auto'): boolean {
  if (type === 'hls') return true;
  if (type === 'file') return false;
  const path = src.split(/[?#]/, 1)[0] ?? '';
  return path.toLowerCase().endsWith('.m3u8');
}

export type AttachOptions = {
  readonly video: HTMLVideoElement;
  readonly src: string;
  readonly sourceType?: PlayerSourceType;
  readonly hlsConfig?: Partial<HlsConfig>;
  readonly onError?: (err: { message: string; cause?: unknown }) => void;
};

export type AttachResult = {
  /** `true` si el navegador reproduce la fuente sin hls.js. */
  readonly native: boolean;
  destroy(): void;
};

function attachNative(video: HTMLVideoElement, src: string): AttachResult {
  video.src = src;
  return {
    native: true,
    destroy: () => {
      // Corta la descarga en curso al desmontar o cambiar de fuente.
      video.removeAttribute('src');
      video.load();
    },
  };
}

export async function attachHls({
  video,
  src,
  sourceType,
  hlsConfig,
  onError,
}: AttachOptions): Promise<AttachResult> {
  if (!isHlsSource(src, sourceType)) return attachNative(video, src);

  const HlsCtor = await loadHlsModule();
  if (HlsCtor?.isSupported()) {
    const hls = new HlsCtor({ ...hlsConfig });
    let destroyed = false;
    let mediaRecoveries = 0;
    let networkRetries = 0;

    const destroy = () => {
      if (destroyed) return;
      destroyed = true;
      hls.destroy();
    };

    hls.on(HlsCtor.Events.FRAG_LOADED, () => {
      networkRetries = 0;
    });
    hls.on(HlsCtor.Events.ERROR, (_event: unknown, data: ErrorData) => {
      if (!data.fatal || destroyed) return;
      if (data.type === HlsCtor.ErrorTypes.MEDIA_ERROR && mediaRecoveries < MAX_MEDIA_RECOVERIES) {
        mediaRecoveries += 1;
        hls.recoverMediaError();
        return;
      }
      if (data.type === HlsCtor.ErrorTypes.NETWORK_ERROR && networkRetries < MAX_NETWORK_RETRIES) {
        networkRetries += 1;
        hls.startLoad();
        return;
      }
      onError?.({ message: `HLS fatal: ${data.type} / ${data.details}`, cause: data });
      destroy();
    });

    hls.loadSource(src);
    hls.attachMedia(video);
    return { native: false, destroy };
  }

  if (video.canPlayType(NATIVE_HLS_MIME)) return attachNative(video, src);

  onError?.({ message: 'Este navegador no puede reproducir HLS.' });
  return { native: true, destroy: () => {} };
}

export function detachHls(result: AttachResult | null | undefined): void {
  result?.destroy();
}
