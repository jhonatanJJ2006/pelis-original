import { defineSchema, defineTable } from 'convex/server';
import { v } from 'convex/values';

const authTables = {
  user: defineTable({
    name: v.string(),
    email: v.string(),
    emailVerified: v.boolean(),
    image: v.optional(v.union(v.null(), v.string())),
    createdAt: v.number(),
    updatedAt: v.number(),
    twoFactorEnabled: v.optional(v.union(v.null(), v.boolean())),
    isAnonymous: v.optional(v.union(v.null(), v.boolean())),
    username: v.optional(v.union(v.null(), v.string())),
    displayUsername: v.optional(v.union(v.null(), v.string())),
    phoneNumber: v.optional(v.union(v.null(), v.string())),
    phoneNumberVerified: v.optional(v.union(v.null(), v.boolean())),
    userId: v.optional(v.union(v.null(), v.string())),
    planId: v.optional(v.id('plans')),
    planExpiresAt: v.optional(v.number()),
    admin: v.optional(v.boolean()),
  })
    .index("email_name", ["email", "name"])
    .index("name", ["name"])
    .index("userId", ["userId"])
    .index("username", ["username"])
    .index("phoneNumber", ["phoneNumber"])
    .index("email", ["email"]),
  session: defineTable({
    expiresAt: v.number(),
    token: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
    ipAddress: v.optional(v.union(v.null(), v.string())),
    userAgent: v.optional(v.union(v.null(), v.string())),
    userId: v.string(),
  })
    .index("expiresAt", ["expiresAt"])
    .index("expiresAt_userId", ["expiresAt", "userId"])
    .index("token", ["token"])
    .index("userId", ["userId"]),
  account: defineTable({
    accountId: v.string(),
    providerId: v.string(),
    userId: v.string(),
    accessToken: v.optional(v.union(v.null(), v.string())),
    refreshToken: v.optional(v.union(v.null(), v.string())),
    idToken: v.optional(v.union(v.null(), v.string())),
    accessTokenExpiresAt: v.optional(v.union(v.null(), v.number())),
    refreshTokenExpiresAt: v.optional(v.union(v.null(), v.number())),
    scope: v.optional(v.union(v.null(), v.string())),
    password: v.optional(v.union(v.null(), v.string())),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("accountId", ["accountId"])
    .index("accountId_providerId", ["accountId", "providerId"])
    .index("providerId_userId", ["providerId", "userId"])
    .index("userId", ["userId"]),
  verification: defineTable({
    identifier: v.string(),
    value: v.string(),
    expiresAt: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("expiresAt", ["expiresAt"])
    .index("identifier", ["identifier"]),
  twoFactor: defineTable({
    secret: v.string(),
    backupCodes: v.string(),
    userId: v.string(),
  }).index("userId", ["userId"]),
  passkey: defineTable({
    name: v.optional(v.union(v.null(), v.string())),
    publicKey: v.string(),
    userId: v.string(),
    credentialID: v.string(),
    counter: v.number(),
    deviceType: v.string(),
    backedUp: v.boolean(),
    transports: v.optional(v.union(v.null(), v.string())),
    createdAt: v.optional(v.union(v.null(), v.number())),
    aaguid: v.optional(v.union(v.null(), v.string())),
  })
    .index("credentialID", ["credentialID"])
    .index("userId", ["userId"]),
};

export default defineSchema({
  ...authTables,

  movies: defineTable({
    name: v.string(),
    image: v.string(),
    imageId: v.optional(v.id('_storage')),
    synopsis: v.string(),
    genre: v.string(),
    token: v.string(),
    actors: v.string(),
    classification: v.string(),
    releaseYear: v.string(),
    videoUrl: v.optional(v.string()),
    mediaType: v.optional(v.union(v.literal('movie'), v.literal('series'))),
    episodes: v.optional(v.number()),
    featured: v.optional(v.boolean()),
  })
    .index('by_genre', ['genre'])
    .index('by_name', ['name'])
    .index('by_releaseYear', ['releaseYear'])
    .index('by_classification', ['classification'])
    .index('by_mediaType', ['mediaType']),

  plans: defineTable({
    name: v.string(),
    price: v.number(),
    description: v.string(),
    features: v.array(v.string()),
    icon: v.string(),
    months: v.number(),
    recommended: v.optional(v.boolean()),
  }),

  subscriptions: defineTable({
    userId: v.id('user'),
    planId: v.id('plans'),
    startDate: v.number(),
    endDate: v.number(),
    status: v.union(
      v.literal('active'),
      v.literal('cancelled'),
      v.literal('expired')
    ),
    stripeSubscriptionId: v.optional(v.string()),
  })
    .index('by_user', ['userId'])
    .index('by_plan', ['planId']),

  favorites: defineTable({
    userId: v.id('user'),
    movieId: v.id('movies'),
    createdAt: v.number(),
  })
    .index('by_user', ['userId'])
    .index('by_movie', ['movieId'])
    .index('by_user_movie', ['userId', 'movieId']),

  history: defineTable({
    userId: v.id('user'),
    movieId: v.id('movies'),
    progress: v.number(),
    duration: v.number(),
    lastWatched: v.number(),
  })
    .index('by_user', ['userId'])
    .index('by_movie', ['movieId'])
    .index('by_user_movie', ['userId', 'movieId']),
});
