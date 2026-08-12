import Stripe from 'stripe';
import { z } from 'zod';
import { register } from '../registry';

function getStripe() {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) throw new Error('STRIPE_SECRET_KEY is not configured');
  return new Stripe(secretKey);
}

function mapStripeStatus(status: Stripe.Subscription.Status): 'ACTIVE' | 'CANCELLED' | 'EXPIRED' {
  switch (status) {
    case 'active':
    case 'trialing':
      return 'ACTIVE';
    case 'canceled':
      return 'CANCELLED';
    case 'past_due':
    case 'unpaid':
      return 'ACTIVE'; // keep active but flagged elsewhere if needed
    case 'incomplete':
    case 'incomplete_expired':
    case 'paused':
    default:
      return 'EXPIRED';
  }
}

function getSubscriptionPeriod(subscription: Stripe.Subscription): { startDate: Date; endDate: Date } {
  const item = subscription.items?.data?.[0] as
    | (Stripe.SubscriptionItem & { current_period_start?: number; current_period_end?: number })
    | undefined;
  const legacy = subscription as Stripe.Subscription & {
    current_period_start?: number;
    current_period_end?: number;
  };
  const startSec = item?.current_period_start ?? legacy.current_period_start ?? subscription.created;
  const endSec = item?.current_period_end ?? legacy.current_period_end;
  const startDate = new Date(startSec * 1000);
  const endDate = endSec ? new Date(endSec * 1000) : new Date(startDate.getTime() + 30 * 24 * 60 * 60 * 1000);
  return { startDate, endDate };
}

export const processWebhook = register({
  kind: 'action',
  name: 'stripeWebhookAction.processWebhook',
  args: z.object({ body: z.string(), signature: z.string() }),
  handler: async (_ctx, { body, signature }) => {
    let event: Stripe.Event;
    try {
      const stripe = getStripe();
      event = stripe.webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET!);
    } catch (err) {
      return {
        ok: false as const,
        status: 400,
        message: `Webhook signature verification failed: ${err instanceof Error ? err.message : 'unknown error'}`,
      };
    }

    const { prisma } = await import('../client');

    try {
      switch (event.type) {
        case 'checkout.session.completed': {
          const session = event.data.object as Stripe.Checkout.Session;
          if (session.metadata?.type === 'plan_upgrade') {
            if (session.payment_status !== 'paid') break;
            const subscriptionId = session.metadata.stripeSubscriptionId;
            const stripePriceId = session.metadata.stripePriceId;
            const itemId = session.metadata.stripeSubscriptionItemId;
            const planId = session.metadata.planId;
            const userId = session.metadata.convexUserId;
            if (!subscriptionId || !stripePriceId || !itemId || !planId) break;
            const stripe = getStripe();
            const current = await stripe.subscriptions.retrieve(subscriptionId);
            const alreadyOnPrice = current.items.data[0]?.price.id === stripePriceId;
            const updated = alreadyOnPrice
              ? current
              : await stripe.subscriptions.update(subscriptionId, {
                  items: [{ id: itemId, price: stripePriceId }],
                  proration_behavior: 'none',
                  metadata: { convexUserId: userId ?? '', planId },
                });
            const { startDate, endDate } = getSubscriptionPeriod(updated);
            await prisma.subscription.update({
              where: { stripeSubscriptionId: updated.id },
              data: {
                planId,
                stripePriceId,
                startDate,
                endDate,
                status: 'ACTIVE',
              },
            });
            break;
          }
          const userId = session.metadata?.convexUserId;
          const planId = session.metadata?.planId;
          if (!userId || !planId || !session.subscription) break;
          const stripe = getStripe();
          const subscription = await stripe.subscriptions.retrieve(session.subscription as string);
          const { startDate, endDate } = getSubscriptionPeriod(subscription);
          const existing = await prisma.subscription.findUnique({
            where: { stripeSubscriptionId: subscription.id },
          });
          if (existing) {
            await prisma.subscription.update({
              where: { id: existing.id },
              data: {
                userId,
                planId,
                startDate,
                endDate,
                status: 'ACTIVE',
                stripeCustomerId: session.customer as string,
                stripePriceId: subscription.items.data[0]?.price.id ?? '',
              },
            });
          } else {
            await prisma.subscription.create({
              data: {
                userId,
                planId,
                startDate,
                endDate,
                status: 'ACTIVE',
                stripeSubscriptionId: subscription.id,
                stripeCustomerId: session.customer as string,
                stripePriceId: subscription.items.data[0]?.price.id ?? '',
              },
            });
          }
          break;
        }
        case 'customer.subscription.updated': {
          const subscription = event.data.object as Stripe.Subscription;
          const { endDate } = getSubscriptionPeriod(subscription);
          const stripePriceId = subscription.items.data[0]?.price.id;
          let planId: string | undefined;
          if (stripePriceId) {
            const plan = await prisma.plan.findUnique({ where: { stripePriceId } });
            planId = plan?.id;
          }
          await prisma.subscription.update({
            where: { stripeSubscriptionId: subscription.id },
            data: {
              status: mapStripeStatus(subscription.status),
              endDate,
              ...(stripePriceId ? { stripePriceId } : {}),
              ...(planId ? { planId } : {}),
            },
          });
          break;
        }
        case 'customer.subscription.deleted': {
          const subscription = event.data.object as Stripe.Subscription;
          await prisma.subscription.update({
            where: { stripeSubscriptionId: subscription.id },
            data: { status: 'EXPIRED' },
          });
          break;
        }
        case 'invoice.payment_failed': {
          const invoice = event.data.object as Stripe.Invoice;
          const subId = (invoice as unknown as { subscription?: string }).subscription;
          if (typeof subId === 'string') {
            await prisma.subscription.update({
              where: { stripeSubscriptionId: subId },
              data: { status: 'EXPIRED' },
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