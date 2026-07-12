/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as favorites from "../favorites.js";
import type * as history from "../history.js";
import type * as http from "../http.js";
import type * as lib_resolveMovieImage from "../lib/resolveMovieImage.js";
import type * as movies from "../movies.js";
import type * as seed from "../seed.js";
import type * as seed_enhance from "../seed_enhance.js";
import type * as seed_sql from "../seed_sql.js";
import type * as subscriptions from "../subscriptions.js";
import type * as users from "../users.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  favorites: typeof favorites;
  history: typeof history;
  http: typeof http;
  "lib/resolveMovieImage": typeof lib_resolveMovieImage;
  movies: typeof movies;
  seed: typeof seed;
  seed_enhance: typeof seed_enhance;
  seed_sql: typeof seed_sql;
  subscriptions: typeof subscriptions;
  users: typeof users;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {
  betterAuth: import("@convex-dev/better-auth/_generated/component.js").ComponentApi<"betterAuth">;
};
