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

  return new Stripe(secretKey);
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

/** Stripe Basil+ movió current_period_* a subscription items. */
function getSubscriptionPeriod(subscription: Stripe.Subscription): {
  startDate: number;
  endDate: number;
} {
  const item = subscription.items?.data?.[0] as
    | (Stripe.SubscriptionItem & {
        current_period_start?: number;
        current_period_end?: number;
      })
    | undefined;

  const legacy = subscription as Stripe.Subscription & {
    current_period_start?: number;
    current_period_end?: number;
  };

  const startSec =
    item?.current_period_start ?? legacy.current_period_start ?? subscription.created;
  const endSec = item?.current_period_end ?? legacy.current_period_end;

  const startDate = startSec * 1000;
  // Fallback 30 días si Stripe no envía periodo (no debería pasar en items)
  const endDate = endSec
    ? endSec * 1000
    : startDate + 30 * 24 * 60 * 60 * 1000;

  return { startDate, endDate };
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
          const stripe = getStripe();

          // Upgrade: solo tras pagar en Checkout se cambia el plan
          if (session.metadata?.type === 'plan_upgrade') {
            if (session.payment_status !== 'paid') {
              break;
            }

            const subscriptionId = session.metadata.stripeSubscriptionId;
            const stripePriceId = session.metadata.stripePriceId;
            const itemId = session.metadata.stripeSubscriptionItemId;
            const planId = session.metadata.planId;
            const convexUserId = session.metadata.convexUserId;

            if (!subscriptionId || !stripePriceId || !itemId || !planId) {
              break;
            }

            const current = await stripe.subscriptions.retrieve(subscriptionId);
            const alreadyOnPrice =
              current.items.data[0]?.price.id === stripePriceId;

            const updated = alreadyOnPrice
              ? current
              : await stripe.subscriptions.update(subscriptionId, {
                  items: [{ id: itemId, price: stripePriceId }],
                  proration_behavior: 'none',
                  metadata: {
                    convexUserId: convexUserId ?? '',
                    planId,
                  },
                });

            const { startDate, endDate } = getSubscriptionPeriod(updated);
            await ctx.runMutation(internal.stripeWebhook.applyPlanUpgrade, {
              subscriptionId: updated.id,
              planId: planId as Id<'plans'>,
              stripePriceId,
              startDate,
              endDate,
            });
            break;
          }

          // Nueva suscripción
          const convexUserId = session.metadata?.convexUserId;
          const planId = session.metadata?.planId;

          if (!convexUserId || !planId || !session.subscription) {
            break;
          }

          const subscription = await stripe.subscriptions.retrieve(
            session.subscription as string
          );
          const { startDate, endDate } = getSubscriptionPeriod(subscription);

          await ctx.runMutation(internal.stripeWebhook.handleSubscriptionCreated, {
            subscriptionId: subscription.id,
            stripeCustomerId: session.customer as string,
            stripePriceId: subscription.items.data[0]?.price.id ?? '',
            convexUserId,
            planId: planId as Id<'plans'>,
            startDate,
            endDate,
          });
          break;
        }

        case 'customer.subscription.updated': {
          const subscription = event.data.object as Stripe.Subscription;
          const { endDate } = getSubscriptionPeriod(subscription);

          await ctx.runMutation(internal.stripeWebhook.handleSubscriptionUpdated, {
            subscriptionId: subscription.id,
            status: mapStripeStatus(subscription.status),
            endDate,
            stripePriceId: subscription.items.data[0]?.price.id,
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
