/**
 * Tipos públicos de `@pelis/player`.
 *
 * @module @pelis/player/types
 */

import type { HlsConfig } from 'hls.js';

export type PlayerSource = string;

/**
 * Cómo tratar `src`:
 * - `auto`: HLS si la ruta termina en `.m3u8`, si no archivo directo.
 * - `hls`: forzar HLS (endpoints proxy sin extensión, p. ej. `/api/stream/...`).
 * - `file`: forzar archivo directo (`.mp4`, `.webm`...).
 */
export type PlayerSourceType = 'auto' | 'hls' | 'file';

export type CaptionTrack = {
  /** Identificador estable; se usa como `id` del `<track>`. */
  readonly id: string;
  readonly label: string;
  readonly language: string;
  /** URL WebVTT. */
  readonly src: string;
};

export type PlayerErrorCode = 'hls' | 'media' | 'network' | 'cast' | 'dlna';

export type PlayerError = {
  readonly code: PlayerErrorCode;
  readonly message: string;
  readonly cause?: unknown;
};

export type PlayerCoreProps = {
  /** URL del manifiesto (HLS .m3u8) o archivo directo (.mp4). */
  readonly src: PlayerSource;
  /** Tipo de fuente; por defecto `auto`. */
  readonly sourceType?: PlayerSourceType;
  /** Póster mientras carga. */
  readonly poster?: string;
  /** Título accesible (aria-label) y metadato para Cast. */
  readonly title?: string;
  /** Intenta reproducir al montar (el navegador puede bloquearlo). */
  readonly autoPlay?: boolean;
  /** Posición inicial en segundos. */
  readonly startAt?: number;
  /** Tracks de subtítulos opcionales. */
  readonly captions?: ReadonlyArray<CaptionTrack>;
  /** Identificador del media (para integraciones). */
  readonly mediaId?: string;
  /**
   * Config extra para hls.js. Se lee al adjuntar la fuente (cambiarla no
   * reinicia la reproducción). Para paridad con la web actual se puede pasar
   * `createVodHlsConfig()` de `@pelis/ui/features/video-player`.
   */
  readonly hlsConfig?: Partial<HlsConfig>;
};

export type PlayerEventHandlers = {
  /** Progreso con throttle (5 s) + último valor al pausar/desmontar. */
  readonly onProgress?: (current: number, duration: number) => void | Promise<void>;
  readonly onPlay?: () => void;
  readonly onPause?: () => void;
  readonly onEnded?: () => void;
  readonly onError?: (error: PlayerError) => void;
};

export type PlayerProps = PlayerCoreProps &
  PlayerEventHandlers & {
    readonly className?: string;
  };
