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

    if (existing) {
      // Repara fechas inválidas (API Stripe Basil+ ya no envía period en el root)
      const badEnd =
        !Number.isFinite(existing.endDate) ||
        existing.endDate <= 0 ||
        existing.endDate < existing.startDate;

      if (badEnd || existing.status !== 'active') {
        await ctx.db.patch(existing._id, {
          startDate: args.startDate,
          endDate: args.endDate,
          status: 'active',
          userId: args.convexUserId,
          planId: args.planId,
          stripeCustomerId: args.stripeCustomerId,
          stripePriceId: args.stripePriceId,
        });
      }
      return existing._id;
    }

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
    stripePriceId: v.optional(v.string()),
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
      stripePriceId?: string;
      planId?: typeof subscription.planId;
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

    if (args.stripePriceId) {
      updates.stripePriceId = args.stripePriceId;
      const plans = await ctx.db.query('plans').collect();
      const matched = plans.find((p) => p.stripePriceId === args.stripePriceId);
      if (matched) {
        updates.planId = matched._id;
      }
    }

    await ctx.db.patch(subscription._id, updates);
  },
});

/** Upgrade inmediato desde la action (antes del webhook). */
export const applyPlanUpgrade = internalMutation({
  args: {
    subscriptionId: v.string(),
    planId: v.id('plans'),
    stripePriceId: v.string(),
    startDate: v.number(),
    endDate: v.number(),
  },
  handler: async (ctx, args) => {
    const subscription = await ctx.db
      .query('subscriptions')
      .withIndex('by_stripeSubscriptionId', (q) =>
        q.eq('stripeSubscriptionId', args.subscriptionId)
      )
      .first();

    if (!subscription) throw new Error('Subscription not found');

    await ctx.db.patch(subscription._id, {
      planId: args.planId,
      stripePriceId: args.stripePriceId,
      startDate: args.startDate,
      endDate: args.endDate,
      status: 'active',
    });
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
