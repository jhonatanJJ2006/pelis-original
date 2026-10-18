/**
 * @pelis/player — exports públicos.
 *
 * @module @pelis/player
 */

export { Player } from './Player';
export type {
  PlayerProps,
  PlayerCoreProps,
  PlayerEventHandlers,
  PlayerError,
  PlayerErrorCode,
  PlayerSource,
  PlayerSourceType,
  CaptionTrack,
} from './types';
export { attachHls, detachHls, isHlsSource, loadHlsModule } from './hls';
export type { AttachOptions, AttachResult } from './hls';
export { setupCast, isCastAvailable, loadCastSdk, guessContentType } from './cast';
export type { CastHandle, CastMedia } from './cast';
export { createDlnaHandle, detectDlnaSupport } from './dlna';
export type { DlnaHandle, DlnaSupport } from './dlna';
export { attachRemote, applyRemoteAction, resolveRemoteAction } from './remote';
export type { RemoteAction, RemoteController, RemoteKeyEvent, RemoteOptions } from './remote';
export { throttle } from './progress';
export type { ProgressSaver, ThrottledSaver, ThrottleOptions } from './progress';
export { formatTime, nextCaptionId } from './captions';
