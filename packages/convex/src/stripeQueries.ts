import { v } from 'convex/values';
import { query } from './_generated/server';

export const getCheckoutContext = query({
  args: { planId: v.id('plans') },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const plan = await ctx.db.get(args.planId);
    if (!plan) return null;

    const existingSubscription = await ctx.db
      .query('subscriptions')
      .withIndex('by_user', (q) => q.eq('userId', identity.subject))
      .filter((q) => q.eq(q.field('status'), 'active'))
      .first();

    let currentPlan = null;
    if (existingSubscription) {
      currentPlan = await ctx.db.get(existingSubscription.planId);
    }

    return {
      plan,
      currentPlan,
      user: {
        subject: identity.subject,
        email: identity.email ?? '',
        name: identity.name ?? 'User',
      },
      existingSubscription: existingSubscription
        ? {
            _id: existingSubscription._id,
            stripeSubscriptionId: existingSubscription.stripeSubscriptionId,
            stripeCustomerId: existingSubscription.stripeCustomerId,
            planId: existingSubscription.planId,
            stripePriceId: existingSubscription.stripePriceId,
          }
        : null,
    };
  },
});

export const getPortalContext = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const subscription = await ctx.db
      .query('subscriptions')
      .withIndex('by_user', (q) => q.eq('userId', identity.subject))
      .filter((q) => q.eq(q.field('status'), 'active'))
      .first();

    if (!subscription?.stripeCustomerId) return null;

    return {
      stripeCustomerId: subscription.stripeCustomerId,
    };
  },
});
