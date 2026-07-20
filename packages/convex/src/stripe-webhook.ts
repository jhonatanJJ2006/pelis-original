import { v } from 'convex/values';
import { mutation } from './_generated/server';

export const handleSubscriptionCreated = mutation({
  args: {
    subscriptionId: v.string(),
    stripeCustomerId: v.string(),
    stripePriceId: v.string(),
    convexUserId: v.string(),
    planId: v.id('plans'),
    startDate: v.number(),
    endDate: v.number(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query('subscriptions')
      .withIndex('by_stripeSubscriptionId', (q) =>
        q.eq('stripeSubscriptionId', args.subscriptionId)
      )
      .first();

    if (existing) return existing._id;

    const plan = await ctx.db.get(args.planId);
    if (!plan) throw new Error('Plan not found');

    const id = await ctx.db.insert('subscriptions', {
      userId: args.convexUserId,
      planId: args.planId,
      startDate: args.startDate,
      endDate: args.endDate,
      status: 'active',
      stripeSubscriptionId: args.subscriptionId,
      stripeCustomerId: args.stripeCustomerId,
      stripePriceId: args.stripePriceId,
    });

    return id;
  },
});

export const handleSubscriptionUpdated = mutation({
  args: {
    subscriptionId: v.string(),
    status: v.union(
      v.literal('active'),
      v.literal('cancelled'),
      v.literal('expired'),
      v.literal('past_due'),
      v.literal('incomplete')
    ),
    endDate: v.optional(v.number()),
    cancelAtPeriodEnd: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const subscription = await ctx.db
      .query('subscriptions')
      .withIndex('by_stripeSubscriptionId', (q) =>
        q.eq('stripeSubscriptionId', args.subscriptionId)
      )
      .first();

    if (!subscription) throw new Error('Subscription not found');

    const updates: Record<string, any> = {};

    switch (args.status) {
      case 'active':
        updates.status = 'active';
        break;
      case 'cancelled':
      case 'expired':
        updates.status = 'expired';
        break;
      case 'past_due':
        updates.status = 'active';
        break;
    }

    if (args.endDate) {
      updates.endDate = args.endDate;
    }

    await ctx.db.patch(subscription._id, updates);
  },
});

export const handleSubscriptionDeleted = mutation({
  args: {
    subscriptionId: v.string(),
  },
  handler: async (ctx, args) => {
    const subscription = await ctx.db
      .query('subscriptions')
      .withIndex('by_stripeSubscriptionId', (q) =>
        q.eq('stripeSubscriptionId', args.subscriptionId)
      )
      .first();

    if (subscription) {
      await ctx.db.patch(subscription._id, { status: 'expired' });
    }
  },
});
