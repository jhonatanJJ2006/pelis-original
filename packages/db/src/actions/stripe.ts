import Stripe from 'stripe';
import { z } from 'zod';
import { register } from '../registry';
import { getStripe } from '../lib/stripe-client';
import {
  applyPlanUpgrade,
  applyStripeSubscription,
  getStripeObjectId,
} from '../lib/stripe-subscription';

const SITE_URL = process.env.SITE_URL || 'http://localhost:3000';

export const createCheckoutSession = register({
  kind: 'action',
  name: 'stripe.createCheckoutSession',
  reads: ['plan', 'subscription'],
  args: z.object({ planId: z.string() }),
  handler: async (ctx, { planId }) => {
    if (!ctx.userId) throw new Error('No autenticado');
    const { prisma } = await import('../client');
    const plan = await prisma.plan.findUnique({ where: { id: planId } });
    if (!plan) throw new Error('Plan no encontrado');
    if (!plan.stripePriceId) throw new Error('Plan not configured for Stripe');

    const user = await prisma.user.findUnique({ where: { id: ctx.userId } });
    if (!user) throw new Error('User not found');

    const existing = await prisma.subscription.findFirst({
      where: { userId: ctx.userId, status: 'ACTIVE' },
      include: { plan: true },
    });

    const stripe = getStripe();
    if (existing?.stripeSubscriptionId) {
      if (!existing.plan) throw new Error('Current plan not found');
      if (plan.price <= existing.plan.price) {
        throw new Error(
          plan.id === existing.plan.id
            ? 'Ya tienes este plan'
            : 'Solo puedes mejorar a un plan superior'
        );
      }
      const stripeSub = await stripe.subscriptions.retrieve(existing.stripeSubscriptionId);
      const itemId = stripeSub.items.data[0]?.id;
      if (!itemId) throw new Error('Stripe subscription has no items');
      const customerId =
        existing.stripeCustomerId ??
        (typeof stripeSub.customer === 'string' ? stripeSub.customer : stripeSub.customer.id);
      const amountDue = Math.round((plan.price - existing.plan.price) * 100);
      if (amountDue <= 0) throw new Error('No hay diferencia de precio que cobrar');
      const session = await stripe.checkout.sessions.create({
        customer: customerId,
        mode: 'payment',
        managed_payments: { enabled: false },
        payment_intent_data: { setup_future_usage: 'off_session' },
        line_items: [
          {
            price_data: {
              currency: 'usd',
              unit_amount: amountDue,
              product_data: {
                name: `Mejora a plan ${plan.name}`,
                description: `Precio ${plan.name}: $${plan.price.toFixed(2)} − crédito plan ${existing.plan.name}: −$${existing.plan.price.toFixed(2)}. Total diferencia: $${(amountDue / 100).toFixed(2)}`,
              },
            },
            quantity: 1,
          },
        ],
        success_url: `${SITE_URL}/subscribe/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${SITE_URL}/subscribe/cancel`,
        client_reference_id: user.id,
        metadata: {
          type: 'plan_upgrade',
          convexUserId: user.id,
          planId,
          stripeSubscriptionId: existing.stripeSubscriptionId,
          stripePriceId: plan.stripePriceId,
          stripeSubscriptionItemId: itemId,
          fromPlanName: existing.plan.name,
          toPlanName: plan.name,
        },
      } as Stripe.Checkout.SessionCreateParams);
      if (!session.url) throw new Error('Failed to create upgrade checkout session');
      return { url: session.url, upgraded: false as const };
    }

    let stripeCustomerId = existing?.stripeCustomerId;
    if (!stripeCustomerId) {
      const customers = await stripe.customers.list({ email: user.email, limit: 1 });
      stripeCustomerId = customers.data[0]?.id;
      if (!stripeCustomerId) {
        const customer = await stripe.customers.create({
          email: user.email,
          name: user.name,
          metadata: { convexUserId: user.id },
        });
        stripeCustomerId = customer.id;
      }
    }

    const session = await stripe.checkout.sessions.create({
      customer: stripeCustomerId,
      mode: 'subscription',
      managed_payments: { enabled: false },
      line_items: [{ price: plan.stripePriceId, quantity: 1 }],
      success_url: `${SITE_URL}/subscribe/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${SITE_URL}/subscribe/cancel`,
      client_reference_id: user.id,
      metadata: { convexUserId: user.id, planId },
      subscription_data: { metadata: { convexUserId: user.id, planId } },
    } as Stripe.Checkout.SessionCreateParams);
    if (!session.url) throw new Error('Failed to create checkout session');
    return { url: session.url, upgraded: false as const };
  },
});

export const createPortalSession = register({
  kind: 'action',
  name: 'stripe.createPortalSession',
  reads: ['subscription'],
  handler: async (ctx) => {
    if (!ctx.userId) throw new Error('No autenticado');
    const { prisma } = await import('../client');
    const subscription = await prisma.subscription.findFirst({
      where: { userId: ctx.userId, status: 'ACTIVE' },
    });
    if (!subscription?.stripeCustomerId) throw new Error('No active subscription');
    const stripe = getStripe();
    const portal = await stripe.billingPortal.sessions.create({
      customer: subscription.stripeCustomerId,
      return_url: `${SITE_URL}/subscribe`,
    });
    return { url: portal.url };
  },
});

/**
 * Fulfill a Checkout session from the success page.
 * Durable fallback when the webhook is missing, delayed, or retried with
 * an `incomplete` subscription.updated that must not expire a paid plan.
 */
export const syncCheckoutSession = register({
  kind: 'action',
  name: 'stripe.syncCheckoutSession',
  reads: ['plan', 'subscription'],
  writes: ['subscription'],
  args: z.object({ sessionId: z.string().min(1) }),
  handler: async (ctx, { sessionId }) => {
    if (!ctx.userId) throw new Error('No autenticado');
    const { prisma } = await import('../client');
    const stripe = getStripe();
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    const metaUser = session.metadata?.convexUserId ?? session.client_reference_id ?? null;
    if (metaUser && metaUser !== ctx.userId) {
      throw new Error('Esta sesión de pago no pertenece a tu cuenta');
    }

    if (session.metadata?.type === 'plan_upgrade') {
      if (session.payment_status !== 'paid') {
        return { activated: false as const };
      }
      const result = await applyPlanUpgrade(prisma, stripe, session.metadata);
      return {
        activated: result.activated,
        planExpiresAt: result.endDate?.getTime(),
      };
    }

    const subscriptionId = getStripeObjectId(session.subscription);
    if (!subscriptionId) return { activated: false as const };

    const paid = session.payment_status === 'paid' || session.status === 'complete';
    if (!paid) return { activated: false as const };

    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    const result = await applyStripeSubscription(prisma, subscription, {
      userId: ctx.userId,
      planId: session.metadata?.planId,
      customerId: getStripeObjectId(session.customer),
      forceActive: true,
    });
    return {
      activated: result.activated,
      planExpiresAt: result.endDate?.getTime(),
    };
  },
});
