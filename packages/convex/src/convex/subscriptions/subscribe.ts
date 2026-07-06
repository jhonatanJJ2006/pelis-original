import { mutationGeneric } from 'convex/server';
import { v } from 'convex/values';

export const subscribe = mutationGeneric({
  args: {
    userId: v.id('user'),
    planId: v.id('plans'),
    stripeSubscriptionId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const plan = await ctx.db.get(args.planId);
    if (!plan) throw new Error('Plan not found');

    const now = Date.now();
    const endDate = now + plan.months * 30 * 24 * 60 * 60 * 1000;

    const subscriptionId = await ctx.db.insert('subscriptions', {
      userId: args.userId,
      planId: args.planId,
      startDate: now,
      endDate,
      status: 'active',
      stripeSubscriptionId: args.stripeSubscriptionId,
    });

    await ctx.db.patch(args.userId, {
      planId: args.planId,
      planExpiresAt: endDate,
    });

    return subscriptionId;
  },
});

export const cancel = mutationGeneric({
  args: { userId: v.id('user') },
  handler: async (ctx, args) => {
    const subscription = await ctx.db
      .query('subscriptions')
      .withIndex('by_user', (q) => q.eq('userId', args.userId))
      .first();

    if (subscription) {
      await ctx.db.patch(subscription._id, { status: 'cancelled' });
    }

    await ctx.db.patch(args.userId, {
      planId: undefined,
      planExpiresAt: undefined,
    });

    return true;
  },
});
