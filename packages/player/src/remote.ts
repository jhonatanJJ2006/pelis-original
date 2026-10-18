/**
 * Mando a distancia / teclado → acciones del reproductor.
 *
 * Diseñado para:
 * - Android TV (WebView/TWA): D-pad emite Arrow* / Enter, teclas Media*.
 * - Web con teclado físico.
 *
 * Las teclas no multimedia se ignoran cuando el foco está en un control
 * interactivo (botón, input, enlace...): así Enter/Espacio activan el botón y
 * las flechas mueven el foco en TV en vez de buscar en el vídeo.
 *
 * @module @pelis/player/remote
 */

export type RemoteAction =
  | 'toggle-play'
  | 'play'
  | 'pause'
  | 'seek-forward'
  | 'seek-back'
  | 'volume-up'
  | 'volume-down'
  | 'toggle-mute'
  | 'toggle-fullscreen'
  | 'subtitle-next';

export type RemoteOptions = {
  /** Segundos al pulsar izquierda/derecha. */
  readonly seekStep?: number;
  /** Incremento de volumen (0-1). */
  readonly volumeStep?: number;
  /** Elemento a poner en pantalla completa (por defecto el `<video>`). */
  readonly fullscreenElement?: HTMLElement | null;
};

export type RemoteController = {
  destroy(): void;
  setActionHandler(handler: (action: RemoteAction) => void): void;
};

/** Subconjunto de `KeyboardEvent` usado aquí (facilita tests sin DOM). */
export type RemoteKeyEvent = {
  readonly key: string;
  readonly code: string;
  readonly defaultPrevented: boolean;
  readonly ctrlKey: boolean;
  readonly metaKey: boolean;
  readonly altKey: boolean;
  readonly target: EventTarget | null;
  preventDefault(): void;
};

const DEFAULT_SEEK_STEP = 10;
const DEFAULT_VOLUME_STEP = 0.1;

const MEDIA_KEYS: Readonly<Record<string, RemoteAction>> = {
  MediaPlay: 'play',
  MediaPause: 'pause',
  MediaPlayPause: 'toggle-play',
  MediaFastForward: 'seek-forward',
  MediaRewind: 'seek-back',
  MediaTrackNext: 'subtitle-next',
};

const NAV_KEYS: Readonly<Record<string, RemoteAction>> = {
  Enter: 'toggle-play',
  ' ': 'toggle-play',
  ArrowRight: 'seek-forward',
  ArrowLeft: 'seek-back',
  ArrowUp: 'volume-up',
  ArrowDown: 'volume-down',
  KeyK: 'toggle-play',
  KeyM: 'toggle-mute',
  KeyF: 'toggle-fullscreen',
  KeyC: 'subtitle-next',
};

const INTERACTIVE_TAGS = new Set(['A', 'BUTTON', 'INPUT', 'SELECT', 'TEXTAREA']);

function isInteractiveTarget(target: EventTarget | null): boolean {
  if (!target || typeof target !== 'object') return false;
  const el = target as { tagName?: unknown; isContentEditable?: unknown };
  if (el.isContentEditable === true) return true;
  return typeof el.tagName === 'string' && INTERACTIVE_TAGS.has(el.tagName.toUpperCase());
}

/** Traduce una tecla a acción, o `null` si el reproductor no debe manejarla. */
export function resolveRemoteAction(event: RemoteKeyEvent): RemoteAction | null {
  if (event.defaultPrevented || event.ctrlKey || event.metaKey || event.altKey) return null;
  const media = MEDIA_KEYS[event.key];
  if (media) return media;
  if (isInteractiveTarget(event.target)) return null;
  return NAV_KEYS[event.key] ?? NAV_KEYS[event.code] ?? null;
}

export function attachRemote(
  target: Pick<EventTarget, 'addEventListener' | 'removeEventListener'>,
  handler: (action: RemoteAction) => void
): RemoteController {
  let activeHandler = handler;

  const listener = (event: Event) => {
    const action = resolveRemoteAction(event as unknown as RemoteKeyEvent);
    if (!action) return;
    event.preventDefault();
    activeHandler(action);
  };

  target.addEventListener('keydown', listener);

  return {
    destroy() {
      target.removeEventListener('keydown', listener);
    },
    setActionHandler(next) {
      activeHandler = next;
    },
  };
}

export function applyRemoteAction(
  action: RemoteAction,
  video: HTMLVideoElement,
  opts: RemoteOptions = {}
): void {
  const seekStep = opts.seekStep ?? DEFAULT_SEEK_STEP;
  const volumeStep = opts.volumeStep ?? DEFAULT_VOLUME_STEP;

  switch (action) {
    case 'toggle-play':
      if (video.paused) void video.play()?.catch(() => undefined);
      else video.pause();
      return;
    case 'play':
      void video.play()?.catch(() => undefined);
      return;
    case 'pause':
      video.pause();
      return;
    case 'seek-forward': {
      const end = Number.isFinite(video.duration) ? video.duration : Infinity;
      video.currentTime = Math.min(video.currentTime + seekStep, end);
      return;
    }
    case 'seek-back':
      video.currentTime = Math.max(video.currentTime - seekStep, 0);
      return;
    case 'volume-up':
      video.volume = Math.min(1, video.volume + volumeStep);
      if (video.muted) video.muted = false;
      return;
    case 'volume-down':
      video.volume = Math.max(0, video.volume - volumeStep);
      return;
    case 'toggle-mute':
      video.muted = !video.muted;
      return;
    case 'toggle-fullscreen': {
      if (typeof document === 'undefined') return;
      if (document.fullscreenElement) {
        void document.exitFullscreen().catch(() => undefined);
        return;
      }
      const el = opts.fullscreenElement ?? video;
      if (typeof el.requestFullscreen === 'function') {
        void el.requestFullscreen().catch(() => undefined);
      } else {
        video.webkitEnterFullscreen?.();
      }
      return;
    }
    case 'subtitle-next':
      // Depende del estado de subtítulos del componente; lo maneja `Player`.
      return;
  }
}
