export { api } from './registry-bootstrap.js';
export type { Api, FunctionReference } from './registry-bootstrap.js';
export { prisma } from './client.js';
export { auth } from './auth.js';
export { getRequestCtx, preloadQuery, invoke } from './server.js';
export type { PreloadedQuery } from './server.js';
export { isAdmin } from './lib/requireAdmin.js';
export { uploadFile, deleteFile } from './storage.js';
export {
  fetchTmdbMetadata,
  downloadPosterBlob,
  downloadBackdropBlob,
  searchMovie,
  type TmdbMetadata,
} from './actions/enrichment.js';
export {
  resolveMovieImagePath,
  enrichMovieImage,
  enrichMovies,
  PLACEHOLDER_IMAGE,
  getHeroImage,
} from './lib/resolveMovieImage.js';
export {
  hasValidMovieTitle,
  isMissingBackdrop,
  isMissingImage,
  isMissingVideo,
  isOrphanIdName,
  getMovieQualityFlags,
  matchesQualityFilter,
} from './lib/movieQuality.js';