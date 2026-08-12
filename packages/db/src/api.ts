// Public API surface — mirrors @pelis/convex `api` object shape.
// Import like: `import { api } from '@pelis/db'`
//
// Each value is a "function reference" consumable by
// useQuery/useMutation/useAction (string id). The actual handlers live
// in the registry (populated by the *register() calls in the per-resource
// files).

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

/**
 * Build references from a module's exports by reading the registered
 * function names from the registry. We can't just use the export key
 * because multiple modules (queries + mutations + actions) share the
 * same qualified namespace.
 */
function refsFromRegistry(
  names: string[],
): Record<string, FunctionReference> {
  const out: Record<string, FunctionReference> = {};
  for (const fullName of names) {
    const [, local] = fullName.split('.');
    if (!local) continue;
    out[local] = makeRef(fullName);
  }
  return out;
}

import { getRegistry } from './registry.js';

const allNames = Array.from(getRegistry().keys());

function ns(prefix: string): Record<string, FunctionReference> {
  return refsFromRegistry(allNames.filter((n) => n.startsWith(`${prefix}.`)));
}

// Build namespace per Convex module.
export const api = {
  movies: { ...ns('movies') },
  favorites: { ...ns('favorites') },
  history: { ...ns('history') },
  users: { ...ns('users') },
  subscriptions: { ...ns('subscriptions') },
  anime: { ...ns('anime') },
  tv: { ...ns('tv') },
  adminMovies: { ...ns('adminMovies') },
  adminSeries: { ...ns('adminSeries') },
  adminAnime: { ...ns('adminAnime') },
  adminPlans: { ...ns('adminPlans') },
  adminUsers: { ...ns('adminUsers') },
  adminEnrichment: { ...ns('adminEnrichment') },
  adminAnimeEnrichment: { ...ns('adminAnimeEnrichment') },
  adminSeriesEnrichment: { ...ns('adminSeriesEnrichment') },
  seedPopularChannels: ns('tv.seedPopularChannels'),
  stripe: { ...ns('stripe') },
  stripeWebhookAction: { ...ns('stripeWebhookAction') },
} as const;

export type Api = typeof api;