/**
 * Chromecast (Google Cast Web Sender, CAF).
 *
 * El SDK se carga de forma lazy la primera vez que el usuario pulsa Cast; no
 * entra en el bundle inicial. Solo Chrome/Edge (desktop y Android) exponen
 * Cast; en el resto `isAvailable()` es `false`.
 *
 * Importante: el receptor (Default Media Receiver) descarga `src` por su
 * cuenta, sin las cookies del usuario. Fuentes protegidas por sesión
 * (`/api/stream`) necesitan una URL firmada o un receptor propio.
 *
 * @module @pelis/player/cast
 */

import { isHlsSource } from './hls';

type CastMediaMetadata = { title?: string; images?: Array<{ url: string }> };

type CastMediaInfo = { metadata?: CastMediaMetadata };

type CastLoadRequest = { currentTime?: number; autoplay?: boolean };

export type ChromeCastNamespace = {
  readonly media: {
    readonly DEFAULT_MEDIA_RECEIVER_APP_ID: string;
    readonly MediaInfo: new (contentId: string, contentType: string) => CastMediaInfo;
    readonly GenericMediaMetadata: new () => CastMediaMetadata;
    readonly LoadRequest: new (mediaInfo: CastMediaInfo) => CastLoadRequest;
  };
  readonly AutoJoinPolicy: { readonly ORIGIN_SCOPED: string };
};

type CastSessionLike = { loadMedia(request: CastLoadRequest): Promise<unknown> };

type CastContextLike = {
  setOptions(options: { receiverApplicationId: string; autoJoinPolicy: string }): void;
  requestSession(): Promise<unknown>;
  getCurrentSession(): CastSessionLike | null;
  endCurrentSession(stopCasting: boolean): void;
};

export type CastFrameworkNamespace = {
  readonly CastContext: { getInstance(): CastContextLike };
};

declare global {
  interface Window {
    cast?: { framework?: CastFrameworkNamespace };
    chrome?: { cast?: ChromeCastNamespace };
    __onGCastApiAvailable?: (available: boolean) => void;
  }
}

export type CastMedia = {
  /** URL absoluta (el receptor no conoce el origen de la página). */
  readonly src: string;
  readonly contentType?: string;
  readonly title?: string;
  readonly poster?: string;
  readonly startTime?: number;
};

export type CastHandle = {
  isAvailable(): boolean;
  /**
   * Abre el selector de dispositivos y carga `media`. Rechaza con `'cancel'`
   * si el usuario cierra el selector.
   */
  request(media: CastMedia): Promise<void>;
  stop(): void;
};

const CAST_SDK_URL = 'https://www.gstatic.com/cv/js/sender/v1/cast_sender.js?loadCastFramework=1';
const CAST_SDK_TIMEOUT_MS = 10_000;

const UNAVAILABLE: CastHandle = {
  isAvailable: () => false,
  request: async () => {},
  stop: () => {},
};

export function isCastAvailable(): boolean {
  if (typeof window === 'undefined') return false;
  return Boolean(window.cast?.framework && window.chrome?.cast);
}

export function guessContentType(src: string): string {
  return isHlsSource(src) ? 'application/x-mpegurl' : 'video/mp4';
}

let sdkPromise: Promise<boolean> | null = null;

/** Inserta el Cast Sender SDK una sola vez. Resuelve `false` si no está disponible. */
export function loadCastSdk(): Promise<boolean> {
  if (isCastAvailable()) return Promise.resolve(true);
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return Promise.resolve(false);
  }
  if (sdkPromise) return sdkPromise;

  sdkPromise = new Promise<boolean>((resolve) => {
    const script = document.createElement('script');
    let settled = false;
    const finish = (ok: boolean) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      const available = ok && isCastAvailable();
      if (!available) {
        // Permitir reintento posterior (red caída, bloqueador...).
        script.remove();
        sdkPromise = null;
      }
      resolve(available);
    };
    const timer = setTimeout(() => finish(false), CAST_SDK_TIMEOUT_MS);

    // El SDK invoca este callback al terminar de inicializarse; debe existir
    // antes de insertar el script.
    window.__onGCastApiAvailable = (available) => finish(available);

    script.src = CAST_SDK_URL;
    script.async = true;
    script.dataset.castSdk = 'true';
    script.onerror = () => finish(false);
    document.head.appendChild(script);
  });

  return sdkPromise;
}

/**
 * Inicializa Cast si el navegador lo soporta.
 *
 * @returns handle para abrir sesión/cargar media y detenerla.
 */
export async function setupCast(): Promise<CastHandle> {
  const ok = await loadCastSdk();
  const framework = ok ? window.cast?.framework : undefined;
  const chromeCast = ok ? window.chrome?.cast : undefined;
  if (!framework || !chromeCast) return UNAVAILABLE;

  const ctx = framework.CastContext.getInstance();
  ctx.setOptions({
    receiverApplicationId: chromeCast.media.DEFAULT_MEDIA_RECEIVER_APP_ID,
    autoJoinPolicy: chromeCast.AutoJoinPolicy.ORIGIN_SCOPED,
  });

  return {
    isAvailable: () => true,
    request: async (media) => {
      await ctx.requestSession();
      const session = ctx.getCurrentSession();
      if (!session) return;

      const info = new chromeCast.media.MediaInfo(
        media.src,
        media.contentType ?? guessContentType(media.src)
      );
      const metadata = new chromeCast.media.GenericMediaMetadata();
      if (media.title) metadata.title = media.title;
      if (media.poster) metadata.images = [{ url: media.poster }];
      info.metadata = metadata;

      const request = new chromeCast.media.LoadRequest(info);
      request.autoplay = true;
      if (media.startTime && media.startTime > 0) request.currentTime = media.startTime;
      await session.loadMedia(request);
    },
    stop: () => ctx.endCurrentSession(true),
  };
}
