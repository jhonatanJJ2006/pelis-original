/**
 * Reproducción remota del `<video>`: AirPlay (Safari) y Remote Playback API
 * (Chrome Android: Cast/TVs compatibles).
 *
 * Un navegador no puede hacer discovery DLNA/UPnP (SSDP) por sí mismo; este
 * módulo delega en el selector del sistema cuando existe. El nombre `dlna` se
 * conserva por compatibilidad con la API original del paquete.
 *
 * Limitación: Chrome no admite Remote Playback con fuentes MSE (hls.js);
 * en ese caso `pick()` rechaza con `NotSupportedError`.
 *
 * @module @pelis/player/dlna
 */

declare global {
  interface HTMLVideoElement {
    /** Safari: selector AirPlay. */
    webkitShowPlaybackTargetPicker?: () => void;
    /** iOS Safari: pantalla completa nativa del `<video>`. */
    webkitEnterFullscreen?: () => void;
  }
}

export type DlnaSupport = {
  readonly supported: boolean;
  readonly airplay: boolean;
  readonly remotePlayback: boolean;
};

export type DlnaHandle = {
  readonly supported: boolean;
  /** Abre el selector de dispositivos del sistema. */
  pick(): Promise<void>;
};

const NONE: DlnaSupport = { supported: false, airplay: false, remotePlayback: false };

export function detectDlnaSupport(video?: HTMLVideoElement): DlnaSupport {
  if (typeof window === 'undefined') return NONE;
  const airplay = video
    ? typeof video.webkitShowPlaybackTargetPicker === 'function'
    : 'WebKitPlaybackTargetAvailabilityEvent' in window;
  const remotePlayback = video
    ? typeof video.remote?.prompt === 'function' && !video.disableRemotePlayback
    : 'RemotePlayback' in window;
  return { supported: airplay || remotePlayback, airplay, remotePlayback };
}

export function createDlnaHandle(video: HTMLVideoElement): DlnaHandle {
  const support = detectDlnaSupport(video);

  return {
    supported: support.supported,
    pick: async () => {
      if (support.airplay && video.webkitShowPlaybackTargetPicker) {
        video.webkitShowPlaybackTargetPicker();
        return;
      }
      if (support.remotePlayback && video.remote) {
        await video.remote.prompt();
        return;
      }
      throw new Error('La reproducción remota no está soportada en este navegador.');
    },
  };
}
