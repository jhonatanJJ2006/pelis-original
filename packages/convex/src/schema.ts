import { defineSchema, defineTable } from 'convex/server';
import { v } from 'convex/values';

export default defineSchema({
  users: defineTable({
    userId: v.string(),
    email: v.string(),
    name: v.string(),
    role: v.union(v.literal('user'), v.literal('admin')),
    emailVerified: v.boolean(),
    verifiedAt: v.optional(v.number()),
    otp: v.optional(v.string()),
    otpExpiresAt: v.optional(v.number()),
    otpAttempts: v.optional(v.number()),
    otpLastSentAt: v.optional(v.number()),
    lastLoginAt: v.optional(v.number()),
    lastSessionExpiresAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_userId', ['userId'])
    .index('by_email', ['email']),

  movies: defineTable({
    name: v.string(),
    image: v.string(),
    imageId: v.optional(v.id('_storage')),
    backdropImage: v.optional(v.string()),
    backdropImageId: v.optional(v.id('_storage')),
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
    .index('by_token', ['token'])
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
    stripePriceId: v.optional(v.string()),
  }),

  subscriptions: defineTable({
    userId: v.string(),
    planId: v.id('plans'),
    startDate: v.number(),
    endDate: v.number(),
    status: v.union(
      v.literal('active'),
      v.literal('cancelled'),
      v.literal('expired')
    ),
    stripeSubscriptionId: v.optional(v.string()),
    stripeCustomerId: v.optional(v.string()),
    stripePriceId: v.optional(v.string()),
  })
    .index('by_user', ['userId'])
    .index('by_plan', ['planId'])
    .index('by_stripeSubscriptionId', ['stripeSubscriptionId']),

  series: defineTable({
    name: v.string(),
    image: v.string(),
    synopsis: v.string(),
    genre: v.string(),
    token: v.string(),
    actors: v.string(),
    classification: v.string(),
    releaseYear: v.string(),
    episodes: v.optional(v.number()),
    season: v.optional(v.number()),
    featured: v.optional(v.boolean()),
  })
    .index('by_genre', ['genre'])
    .index('by_name', ['name'])
    .index('by_classification', ['classification']),

  tvChannels: defineTable({
    name: v.string(),
    logo: v.string(),
    category: v.string(),
    country: v.optional(v.string()),
    language: v.optional(v.string()),
    streamUrl: v.string(),
    source: v.string(),
    sourcePlaylistId: v.optional(v.id('tvPlaylists')),
    tvgId: v.optional(v.string()),
    isActive: v.boolean(),
    sortOrder: v.optional(v.number()),
  })
    .index('by_category', ['category'])
    .index('by_source', ['source'])
    .index('by_country', ['country'])
    .index('by_playlist', ['sourcePlaylistId']),

  tvPlaylists: defineTable({
    name: v.string(),
    m3uUrl: v.string(),
    country: v.optional(v.string()),
    language: v.optional(v.string()),
    isActive: v.boolean(),
    lastImportedAt: v.optional(v.number()),
    totalChannels: v.optional(v.number()),
  })
    .index('by_active', ['isActive']),

  anime: defineTable({
    title: v.string(),
    alternativeTitle: v.optional(v.string()),
    image: v.string(),
    synopsis: v.string(),
    genre: v.array(v.string()),
    episodes: v.number(),
    status: v.union(v.literal('ongoing'), v.literal('completed')),
    year: v.number(),
    rating: v.optional(v.number()),
    providers: v.array(
      v.object({
        name: v.string(),
        url: v.string(),
        language: v.union(v.literal('sub'), v.literal('dub'), v.literal('esp')),
        isActive: v.boolean(),
      })
    ),
  })
    .index('by_title', ['title'])
    .index('by_status', ['status']),

  favorites: defineTable({
    userId: v.string(),
    movieId: v.id('movies'),
    createdAt: v.number(),
  })
    .index('by_user', ['userId'])
    .index('by_movie', ['movieId'])
    .index('by_user_movie', ['userId', 'movieId']),

  history: defineTable({
    userId: v.string(),
    movieId: v.id('movies'),
    progress: v.number(),
    duration: v.number(),
    lastWatched: v.number(),
  })
    .index('by_user', ['userId'])
    .index('by_movie', ['movieId'])
    .index('by_user_movie', ['userId', 'movieId']),
});
