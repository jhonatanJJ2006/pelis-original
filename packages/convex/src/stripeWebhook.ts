import { v } from 'convex/values';
import { internalMutation } from './_generated/server';

export const handleSubscriptionCreated = internalMutation({
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

export const handleSubscriptionUpdated = internalMutation({
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
  },
  handler: async (ctx, args) => {
    const subscription = await ctx.db
      .query('subscriptions')
      .withIndex('by_stripeSubscriptionId', (q) =>
        q.eq('stripeSubscriptionId', args.subscriptionId)
      )
      .first();

    if (!subscription) throw new Error('Subscription not found');

    const updates: {
      status?: 'active' | 'cancelled' | 'expired';
      endDate?: number;
    } = {};

    switch (args.status) {
      case 'active':
      case 'past_due':
        updates.status = 'active';
        break;
      case 'cancelled':
        updates.status = 'cancelled';
        break;
      case 'expired':
      case 'incomplete':
        updates.status = 'expired';
        break;
    }

    if (args.endDate !== undefined) {
      updates.endDate = args.endDate;
    }

    await ctx.db.patch(subscription._id, updates);
  },
});

export const handleSubscriptionDeleted = internalMutation({
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
