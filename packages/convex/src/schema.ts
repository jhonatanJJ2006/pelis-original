import { defineSchema, defineTable } from 'convex/server';
import { v } from 'convex/values';

export default defineSchema({
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
  })
    .index('by_user', ['userId'])
    .index('by_plan', ['planId']),

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
