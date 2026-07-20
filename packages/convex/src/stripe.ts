import Stripe from 'stripe';
import { v } from 'convex/values';
import { mutation } from './_generated/server';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-09-30' as any,
});

const SITE_URL = process.env.SITE_URL || 'http://localhost:3000';

export const createCheckoutSession = mutation({
  args: { planId: v.id('plans') },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error('Not authenticated');

    const plan = await ctx.db.get(args.planId);
    if (!plan) throw new Error('Plan not found');
    if (!plan.stripePriceId) throw new Error('Plan not configured for Stripe');

    const email = identity.email ?? '';
    const name = identity.name ?? 'User';

    const existingSubscription = await ctx.db
      .query('subscriptions')
      .withIndex('by_user', (q) => q.eq('userId', identity.subject))
      .filter((q) => q.eq(q.field('status'), 'active'))
      .first();

    let stripeCustomerId = existingSubscription?.stripeCustomerId;

    if (!stripeCustomerId) {
      const customers = await stripe.customers.list({ email, limit: 1 });
      stripeCustomerId = customers.data[0]?.id;

      if (!stripeCustomerId) {
        const customer = await stripe.customers.create({
          email,
          name,
          metadata: { convexUserId: identity.subject },
        });
        stripeCustomerId = customer.id;
      }
    }

    const session = await stripe.checkout.sessions.create({
      customer: stripeCustomerId,
      mode: 'subscription',
      line_items: [{ price: plan.stripePriceId, quantity: 1 }],
      success_url: `${SITE_URL}/subscribe/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${SITE_URL}/subscribe/cancel`,
      metadata: {
        convexUserId: identity.subject,
        planId: args.planId,
      },
      subscription_data: {
        metadata: {
          convexUserId: identity.subject,
          planId: args.planId,
        },
      },
    });

    return { url: session.url };
  },
});

export const createPortalSession = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error('Not authenticated');

    const subscription = await ctx.db
      .query('subscriptions')
      .withIndex('by_user', (q) => q.eq('userId', identity.subject))
      .filter((q) => q.eq(q.field('status'), 'active'))
      .first();

    if (!subscription?.stripeCustomerId) throw new Error('No active subscription');

    const portal = await stripe.billingPortal.sessions.create({
      customer: subscription.stripeCustomerId,
      return_url: `${SITE_URL}/subscribe`,
    });

    return { url: portal.url };
  },
});
