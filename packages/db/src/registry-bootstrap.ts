// Side-effect import: registers every query/mutation/action into the
// registry so the `api` object has something to introspect.
//
// Importing this file (via @pelis/db) is enough to populate the registry
// because @pelis/db/index.ts re-exports from this file.

import './queries/movies';
import './queries/favorites';
import './queries/history';
import './queries/users';
import './queries/subscriptions';
import './queries/anime';
import './queries/tv';
import './queries/adminMovies';
import './queries/adminSeries';
import './queries/adminAnime';
import './queries/adminPlans';
import './queries/adminUsers';
import './mutations/movies';
import './mutations/anime';
import './actions/anime';
import './actions/enrichment';
import './actions/animeEnrichment';
import './actions/seriesEnrichment';
import './actions/tv';
import './actions/seedPopular';
import './actions/stripe';
import './actions/stripeWebhook';