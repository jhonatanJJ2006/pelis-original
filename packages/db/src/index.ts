export { api } from './api';
export type { Api, FunctionReference } from './api';
export { prisma } from './client';
export { auth } from './auth';
export { getRequestCtx, preloadQuery, invoke } from './server';
export type { PreloadedQuery } from './server';
export {
  isAdmin,
  requireUser,
  requireAdmin,
  requireActivePlan,
  AuthError,
} from './lib/requireAdmin';
export {
  approveTvPairing,
  buildLinkTvUrl,
  claimTvPairing,
  createTvPairing,
  formatPairingCode,
  getTvPairingForDevice,
} from './lib/tv-pairing';
export {
  TV_KEYBOARD_MAX_TEXT,
  TV_KEYBOARD_TTL_MS,
  buildTvKeyboardUrl,
  createTvKeyboardSession,
  getTvKeyboardSession,
  sanitizeKeyboardText,
  updateTvKeyboardText,
} from './lib/tv-keyboard';
export type { TvKeyboardState } from './lib/tv-keyboard';
export { issueTvSession, betterAuthSessionCookieName } from './lib/tv-session';
export {
  APP_AUTH_CODE_TTL_MS,
  buildAppAuthCompletePath,
  buildAppCallbackUrl,
  buildAppIntentUrl,
  createAppAuthCode,
  exchangeAppAuthCode,
  isAppAuthToken,
} from './lib/app-auth';
export {
  createGoogleNonce,
  consumeGoogleNonce,
  googleWebClientId,
  signInWithGoogleIdToken,
  GOOGLE_NONCE_TTL_MS,
} from './lib/app-auth-google';
export { verifyGoogleIdToken, GoogleIdTokenError } from './lib/google-id-token';
export { uploadFile, deleteFile } from './storage';
export {
  fetchTmdbMetadata,
  downloadPosterBlob,
  downloadBackdropBlob,
  searchMovie,
  type TmdbMetadata,
} from './actions/enrichment';
export {
  resolveMovieImagePath,
  enrichMovieImage,
  enrichMovies,
  PLACEHOLDER_IMAGE,
  getHeroImage,
} from './lib/resolveMovieImage';
export {
  hasValidMovieTitle,
  isMissingBackdrop,
  isMissingImage,
  isMissingVideo,
  isOrphanIdName,
  getMovieQualityFlags,
  matchesQualityFilter,
} from './lib/movieQuality';
export { hasManifestForToken } from './lib/hasManifestForToken';
