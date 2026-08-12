// Side-effect import: registers every query/mutation/action into the
// registry so the `api` object has something to introspect.
//
// Importing this file (via @pelis/db) is enough to populate the registry
// because @pelis/db/index.ts re-exports from this file.

import './queries/movies.js';
import './queries/favorites.js';
import './queries/history.js';
import './queries/users.js';
import './queries/subscriptions.js';
import './queries/anime.js';
import './queries/tv.js';
import './queries/adminMovies.js';
import './queries/adminSeries.js';
import './queries/adminAnime.js';
import './queries/adminPlans.js';
import './queries/adminUsers.js';
import './mutations/movies.js';
import './mutations/anime.js';
import './actions/anime.js';
import './actions/enrichment.js';
import './actions/animeEnrichment.js';
import './actions/seriesEnrichment.js';
import './actions/tv.js';
import './actions/seedPopular.js';
import './actions/stripe.js';
import './actions/stripeWebhook.js';

export { api } from './api.js';
export type { Api, FunctionReference } from './api.js';