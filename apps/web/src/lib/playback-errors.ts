/**
 * Why a movie cannot play, in terms the viewer can act on. Every cause used to
 * collapse into "No hay video disponible".
 */
export type PlaybackErrorKind = 'unauthenticated' | 'no_plan' | 'missing' | 'disk' | 'network';

export interface PlaybackError {
  kind: PlaybackErrorKind;
  message: string;
  /** Network problems may go away; the UI offers "Reintentar". */
  retryable: boolean;
}

export const PLAYBACK_ERROR_MESSAGES: Record<PlaybackErrorKind, string> = {
  unauthenticated: 'Inicia sesión para reproducir este contenido.',
  no_plan: 'Necesitas un plan activo para reproducir este contenido.',
  missing: 'Este video no está disponible en el servidor.',
  disk: 'El almacenamiento de video no está disponible ahora. Vuelve a intentarlo en unos minutos.',
  network: 'Error de conexión al cargar el video. Revisa tu conexión y reintenta.',
};

export function playbackError(kind: PlaybackErrorKind): PlaybackError {
  return {
    kind,
    message: PLAYBACK_ERROR_MESSAGES[kind],
    retryable: kind === 'network' || kind === 'disk',
  };
}

/** Maps an HTTP status (and optional server `code`) from the stream API. */
export function playbackErrorFromStatus(status: number, code?: string | null): PlaybackError {
  if (code === 'disk_unavailable') return playbackError('disk');
  if (code === 'video_missing') return playbackError('missing');
  if (code === 'no_plan' || status === 403) return playbackError('no_plan');
  if (code === 'unauthenticated' || status === 401) return playbackError('unauthenticated');
  if (status === 503) return playbackError('disk');
  if (status === 404 || status === 410) return playbackError('missing');
  return playbackError('network');
}
