import Stripe from 'stripe';
import { z } from 'zod';
import { register } from '../registry';
import { assertWebhookSecret, getStripe } from '../lib/stripe-client';
import {
  applyInvoicePaymentFailed,
  applyStripeSubscription,
  fulfillPaidCheckoutSession,
  getInvoiceSubscriptionId,
} from '../lib/stripe-subscription';

export const processWebhook = register({
  kind: 'action',
  name: 'stripeWebhookAction.processWebhook',
  args: z.object({ body: z.string(), signature: z.string() }),
  handler: async (_ctx, { body, signature }) => {
    let event: Stripe.Event;
    try {
      const stripe = getStripe();
      const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
      if (!assertWebhookSecret(webhookSecret)) {
        return {
          ok: false as const,
          status: 500,
          message:
            'STRIPE_WEBHOOK_SECRET missing or placeholder. Use a Test-mode whsec_… from Stripe CLI/Dashboard.',
        };
      }
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
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
        case 'checkout.session.completed':
        case 'checkout.session.async_payment_succeeded': {
          const session = event.data.object as Stripe.Checkout.Session;
          await fulfillPaidCheckoutSession(prisma, getStripe(), session);
          break;
        }
        case 'customer.subscription.created':
        case 'customer.subscription.updated': {
          const subscription = event.data.object as Stripe.Subscription;
          await applyStripeSubscription(prisma, subscription);
          break;
        }
        case 'customer.subscription.deleted': {
          const subscription = event.data.object as Stripe.Subscription;
          await prisma.subscription.updateMany({
            where: { stripeSubscriptionId: subscription.id },
            data: { status: 'EXPIRED' },
          });
          break;
        }
        case 'invoice.paid':
        case 'invoice.payment_succeeded': {
          const invoice = event.data.object as Stripe.Invoice;
          const subId = getInvoiceSubscriptionId(invoice);
          if (!subId) break;
          const subscription = await getStripe().subscriptions.retrieve(subId);
          await applyStripeSubscription(prisma, subscription, { forceActive: true });
          break;
        }
        case 'invoice.payment_failed': {
          const invoice = event.data.object as Stripe.Invoice;
          const subId = getInvoiceSubscriptionId(invoice);
          if (!subId) break;
          // Retrieve current status. The event can be delivered after the
          // customer has already paid; expiring by id would wipe that plan.
          const subscription = await getStripe().subscriptions.retrieve(subId);
          await applyInvoicePaymentFailed(prisma, subscription);
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
