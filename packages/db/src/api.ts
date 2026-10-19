// Public API surface — mirrors @pelis/convex `api` object shape.
// Import like: `import { api } from '@pelis/db'` (or `@pelis/db/api`)
//
// Each value is a "function reference" consumable by
// useQuery/useMutation/useAction (string id). The actual handlers live
// in the registry (populated by the *register() calls in the per-resource
// files). This module is intentionally dependency-free so it can be
// imported from client components without pulling server code.

/**
 * Build a function reference whose `.name` matches the registered
 * function name. This is what the client hooks use to identify which
 * server-side function to invoke.
 */
function makeRef(qualifiedName: string): FunctionReference {
  const ref = function _ref() {
    /* no-op placeholder; client hooks POST to the API by name */
  } as unknown as FunctionReference;
  Object.defineProperty(ref, 'name', { value: qualifiedName, configurable: true });
  return ref;
}

export interface FunctionReference {
  (...args: unknown[]): unknown;
  name: string;
}

function ns(names: string[]): Record<string, FunctionReference> {
  const out: Record<string, FunctionReference> = {};
  for (const fullName of names) {
    const local = fullName.split('.').pop();
    if (!local) continue;
    out[local] = makeRef(fullName);
  }
  return out;
}

// Build namespace per Convex module. Names must match the registry.
export const api = {
  movies: ns([
    'movies.create',
    'movies.generateUploadUrl',
    'movies.getByGenre',
    'movies.getById',
    'movies.getClassifications',
    'movies.getFeatured',
    'movies.getGenres',
    'movies.getTrending',
    'movies.getYears',
    'movies.list',
    'movies.listSeries',
    'movies.page',
    'movies.remove',
    'movies.search',
    'movies.update',
  ]),
  favorites: ns([
    'favorites.add',
    'favorites.check',
    'favorites.listByUser',
    'favorites.listByUserPage',
    'favorites.remove',
  ]),
  history: ns([
    'history.clearAll',
    'history.getByUserAndMovie',
    'history.getContinueWatching',
    'history.listByUser',
    'history.listByUserPage',
    'history.remove',
    'history.upsert',
  ]),
  users: ns([
    'users.getByEmail',
    'users.me',
    'users.recordLogin',
    'users.setOtp',
    'users.setRole',
    'users.upsertUser',
    'users.verifyOtp',
  ]),
  subscriptions: ns([
    'subscriptions.adminCreateSubscription',
    'subscriptions.cancel',
    'subscriptions.getById',
    'subscriptions.getByUser',
    'subscriptions.list',
    'subscriptions.setStripePriceId',
    'subscriptions.subscribe',
  ]),
  anime: ns([
    'anime.create',
    'anime.getById',
    'anime.getEpisodes',
    'anime.getEpisodeStream',
    'anime.getGenres',
    'anime.getProviders',
    'anime.getSeasonEpisodes',
    'anime.getSeries',
    'anime.getVideoUrl',
    'anime.list',
    'anime.listSeries',
    'anime.listSeriesPage',
    'anime.remove',
    'anime.search',
    'anime.searchExternal',
    'anime.searchAnilist',
    'anime.resolveAnilistId',
    'anime.checkProvidersHealth',
    'anime.importFromAnilist',
    'anime.importCatalogBulk',
    'anime.seed',
    'anime.update',
  ]),
  tv: ns([
    'tv.addChannel',
    'tv.adminGetById',
    'tv.adminList',
    'tv.cleanupNonWorking',
    'tv.createPlaylist',
    'tv.dedupePopularChannels',
    'tv.getById',
    'tv.getCategories',
    'tv.getCountries',
    'tv.getLanguages',
    'tv.getStats',
    'tv.list',
    'tv.listPlaylists',
    'tv.pingAdmin',
    'tv.probeAllChannels',
    'tv.probeChannel',
    'tv.removeByPlaylist',
    'tv.removeChannel',
    'tv.removePlaylist',
    'tv.reportStreamStatus',
    'tv.resetAllChannelsProbe',
    'tv.resetChannelProbe',
    'tv.seedFromM3U',
    'tv.seedPopularChannels',
    'tv.toggleChannel',
    'tv.togglePopular',
    'tv.updateChannel',
    'tv.updatePlaylist',
  ]),
  adminMovies: ns([
    'adminMovies.adminList',
    'adminMovies.adminStats',
    'adminMovies.bulkTargetIds',
    'adminMovies.merge',
    'adminMovies.recent',
  ]),
  adminSeries: ns([
    'adminSeries.adminList',
    'adminSeries.adminStats',
    'adminSeries.create',
    'adminSeries.getById',
    'adminSeries.remove',
    'adminSeries.update',
  ]),
  adminAnime: ns([
    'adminAnime.adminList',
    'adminAnime.adminStats',
    'adminAnime.getById',
    'adminAnime.create',
    'adminAnime.update',
    'adminAnime.remove',
  ]),
  adminPlans: ns([
    'adminPlans.adminList',
    'adminPlans.create',
    'adminPlans.getById',
    'adminPlans.remove',
    'adminPlans.setRecommended',
    'adminPlans.update',
  ]),
  adminUsers: ns([
    'adminUsers.adminCreateSubscription',
    'adminUsers.adminList',
    'adminUsers.adminRevokeSubscription',
    'adminUsers.adminSetRole',
    'adminUsers.adminStats',
  ]),
  adminEnrichment: ns([
    'adminEnrichment.applyBackdrop',
    'adminEnrichment.applyBackdropPatch',
    'adminEnrichment.applyBackdropsBulk',
    'adminEnrichment.applyMetadataPatch',
    'adminEnrichment.assertAdmin',
    'adminEnrichment.enrichMovie',
    'adminEnrichment.enrichMoviesBulk',
    'adminEnrichment.getMovieForEnrichment',
    'adminEnrichment.previewBackdrop',
    'adminEnrichment.previewMetadata',
  ]),
  adminAnimeEnrichment: ns([
    'adminAnimeEnrichment.applyAnimeBackdrop',
    'adminAnimeEnrichment.downloadBackdrop',
    'adminAnimeEnrichment.downloadPoster',
    'adminAnimeEnrichment.enrichAnime',
    'adminAnimeEnrichment.fetchTmdbMetadata',
    'adminAnimeEnrichment.previewAnimeBackdrop',
    'adminAnimeEnrichment.previewAnimeMetadata',
    'adminAnimeEnrichment.searchExternal',
  ]),
  adminSeriesEnrichment: ns([
    'adminSeriesEnrichment.applySeriesBackdrop',
    'adminSeriesEnrichment.applySeriesEnrichment',
    'adminSeriesEnrichment.downloadBackdrop',
    'adminSeriesEnrichment.downloadPoster',
    'adminSeriesEnrichment.enrichSeries',
    'adminSeriesEnrichment.fetchTmdbMetadata',
    'adminSeriesEnrichment.previewSeriesBackdrop',
    'adminSeriesEnrichment.previewSeriesMetadata',
  ]),
  seedPopularChannels: ns(['tv.seedPopularChannels']),
  stripe: ns([
    'stripe.createCheckoutSession',
    'stripe.createPortalSession',
    'stripe.syncCheckoutSession',
  ]),
  stripeWebhookAction: ns(['stripeWebhookAction.processWebhook']),
} as const;

export type Api = typeof api;
