'use node';

import Stripe from 'stripe';
import { v } from 'convex/values';
import { internalAction } from './_generated/server';
import { internal } from './_generated/api';
import type { Id } from './_generated/dataModel';

function getStripe() {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    throw new Error('STRIPE_SECRET_KEY is not configured');
  }

  return new Stripe(secretKey, {
    apiVersion: '2025-09-30' as Stripe.LatestApiVersion,
  });
}

function mapStripeStatus(
  status: Stripe.Subscription.Status
): 'active' | 'cancelled' | 'expired' | 'past_due' | 'incomplete' {
  switch (status) {
    case 'active':
    case 'trialing':
      return 'active';
    case 'canceled':
      return 'cancelled';
    case 'past_due':
    case 'unpaid':
      return 'past_due';
    case 'incomplete':
    case 'incomplete_expired':
    case 'paused':
      return 'incomplete';
    default:
      return 'expired';
  }
}

export const processWebhook = internalAction({
  args: {
    body: v.string(),
    signature: v.string(),
  },
  handler: async (ctx, args) => {
    let event: Stripe.Event;

    try {
      const stripe = getStripe();
      event = stripe.webhooks.constructEvent(
        args.body,
        args.signature,
        process.env.STRIPE_WEBHOOK_SECRET!
      );
    } catch (err) {
      return {
        ok: false as const,
        status: 400,
        message: `Webhook signature verification failed: ${err instanceof Error ? err.message : 'unknown error'}`,
      };
    }

    try {
      switch (event.type) {
        case 'checkout.session.completed': {
          const session = event.data.object as Stripe.Checkout.Session;
          const convexUserId = session.metadata?.convexUserId;
          const planId = session.metadata?.planId;

          if (!convexUserId || !planId || !session.subscription) {
            break;
          }

          const stripe = getStripe();
          const subscription = await stripe.subscriptions.retrieve(
            session.subscription as string
          );

          await ctx.runMutation(internal.stripeWebhook.handleSubscriptionCreated, {
            subscriptionId: subscription.id,
            stripeCustomerId: session.customer as string,
            stripePriceId: subscription.items.data[0]?.price.id ?? '',
            convexUserId,
            planId: planId as Id<'plans'>,
            startDate: subscription.current_period_start * 1000,
            endDate: subscription.current_period_end * 1000,
          });
          break;
        }

        case 'customer.subscription.updated': {
          const subscription = event.data.object as Stripe.Subscription;

          await ctx.runMutation(internal.stripeWebhook.handleSubscriptionUpdated, {
            subscriptionId: subscription.id,
            status: mapStripeStatus(subscription.status),
            endDate: subscription.current_period_end * 1000,
          });
          break;
        }

        case 'customer.subscription.deleted': {
          const subscription = event.data.object as Stripe.Subscription;
          await ctx.runMutation(internal.stripeWebhook.handleSubscriptionDeleted, {
            subscriptionId: subscription.id,
          });
          break;
        }

        case 'invoice.payment_failed': {
          const invoice = event.data.object as Stripe.Invoice;
          const subId = invoice.subscription;

          if (typeof subId === 'string') {
            await ctx.runMutation(internal.stripeWebhook.handleSubscriptionUpdated, {
              subscriptionId: subId,
              status: 'past_due',
            });
          }
          break;
        }
      }

      return { ok: true as const, status: 200 };
    } catch (err) {
      return {
        ok: false as const,
        status: 500,
        message: `Webhook handler error: ${err instanceof Error ? err.message : 'unknown error'}`,
      };
    }
  },
});
