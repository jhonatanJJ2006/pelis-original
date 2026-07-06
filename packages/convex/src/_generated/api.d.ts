/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as convex_auth from "../convex/auth.js";
import type * as convex_favorites_index from "../convex/favorites/index.js";
import type * as convex_history_index from "../convex/history/index.js";
import type * as convex_movies_index from "../convex/movies/index.js";
import type * as convex_subscriptions_index from "../convex/subscriptions/index.js";
import type * as convex_subscriptions_subscribe from "../convex/subscriptions/subscribe.js";
import type * as convex_users_index from "../convex/users/index.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  "convex/auth": typeof convex_auth;
  "convex/favorites/index": typeof convex_favorites_index;
  "convex/history/index": typeof convex_history_index;
  "convex/movies/index": typeof convex_movies_index;
  "convex/subscriptions/index": typeof convex_subscriptions_index;
  "convex/subscriptions/subscribe": typeof convex_subscriptions_subscribe;
  "convex/users/index": typeof convex_users_index;
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

export declare const components: {};
