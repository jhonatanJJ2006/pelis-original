'use node';

import Stripe from 'stripe';
import { v } from 'convex/values';
import { action } from './_generated/server';
import { api } from './_generated/api';

const SITE_URL = process.env.SITE_URL || 'http://localhost:3000';

function getStripe() {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    throw new Error('STRIPE_SECRET_KEY is not configured');
  }

  return new Stripe(secretKey, {
    apiVersion: '2025-09-30' as Stripe.LatestApiVersion,
  });
}

export const createCheckoutSession = action({
  args: { planId: v.id('plans') },
  handler: async (ctx, args) => {
    const context = await ctx.runQuery(api.stripeQueries.getCheckoutContext, {
      planId: args.planId,
    });

    if (!context) {
      throw new Error('Not authenticated');
    }

    const { plan, user, stripeCustomerId: existingCustomerId } = context;

    if (!plan.stripePriceId) {
      throw new Error('Plan not configured for Stripe');
    }

    let stripeCustomerId = existingCustomerId;

    const stripe = getStripe();

    if (!stripeCustomerId) {
      const customers = await stripe.customers.list({ email: user.email, limit: 1 });
      stripeCustomerId = customers.data[0]?.id;

      if (!stripeCustomerId) {
        const customer = await stripe.customers.create({
          email: user.email,
          name: user.name,
          metadata: { convexUserId: user.subject },
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
        convexUserId: user.subject,
        planId: args.planId,
      },
      subscription_data: {
        metadata: {
          convexUserId: user.subject,
          planId: args.planId,
        },
      },
    });

    if (!session.url) {
      throw new Error('Failed to create checkout session');
    }

    return { url: session.url };
  },
});

export const createPortalSession = action({
  args: {},
  handler: async (ctx) => {
    const context = await ctx.runQuery(api.stripeQueries.getPortalContext, {});

    if (!context) {
      throw new Error('No active subscription');
    }

    const stripe = getStripe();
    const portal = await stripe.billingPortal.sessions.create({
      customer: context.stripeCustomerId,
      return_url: `${SITE_URL}/subscribe`,
    });

    if (!portal.url) {
      throw new Error('Failed to create portal session');
    }

    return { url: portal.url };
  },
});
