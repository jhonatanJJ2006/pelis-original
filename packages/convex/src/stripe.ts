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

  return new Stripe(secretKey);
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

    const { plan, currentPlan, user, existingSubscription } = context;

    if (!plan.stripePriceId) {
      throw new Error('Plan not configured for Stripe');
    }

    const stripe = getStripe();

    // Upgrade: SIEMPRE Checkout de Stripe. El plan NO cambia hasta pagar (webhook).
    if (existingSubscription?.stripeSubscriptionId) {
      if (!currentPlan) {
        throw new Error('Current plan not found');
      }

      if (plan.price <= currentPlan.price) {
        throw new Error(
          plan._id === currentPlan._id
            ? 'Ya tienes este plan'
            : 'Solo puedes mejorar a un plan superior'
        );
      }

      const stripeSub = await stripe.subscriptions.retrieve(
        existingSubscription.stripeSubscriptionId
      );
      const itemId = stripeSub.items.data[0]?.id;
      if (!itemId) {
        throw new Error('Stripe subscription has no items');
      }

      const customerId =
        existingSubscription.stripeCustomerId ??
        (typeof stripeSub.customer === 'string'
          ? stripeSub.customer
          : stripeSub.customer.id);

      // Diferencia fija: precio nuevo − precio actual (ej. 19.99 − 13.99 = 6.00)
      const amountDue = Math.round((plan.price - currentPlan.price) * 100);
      if (amountDue <= 0) {
        throw new Error('No hay diferencia de precio que cobrar');
      }

      const session = await stripe.checkout.sessions.create({
        customer: customerId,
        mode: 'payment',
        managed_payments: { enabled: false },
        // No cobrar en segundo plano: el usuario debe completar Checkout
        payment_intent_data: {
          setup_future_usage: 'off_session',
        },
        line_items: [
          {
            price_data: {
              currency: 'usd',
              unit_amount: amountDue,
              product_data: {
                name: `Mejora a plan ${plan.name}`,
                description: `Precio ${plan.name}: $${plan.price.toFixed(2)} − crédito plan ${currentPlan.name}: −$${currentPlan.price.toFixed(2)}. Total diferencia: $${(amountDue / 100).toFixed(2)}`,
              },
            },
            quantity: 1,
          },
        ],
        success_url: `${SITE_URL}/subscribe/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${SITE_URL}/subscribe/cancel`,
        metadata: {
          type: 'plan_upgrade',
          convexUserId: user.subject,
          planId: args.planId,
          stripeSubscriptionId: existingSubscription.stripeSubscriptionId,
          stripePriceId: plan.stripePriceId,
          stripeSubscriptionItemId: itemId,
          fromPlanName: currentPlan.name,
          toPlanName: plan.name,
        },
      } as Stripe.Checkout.SessionCreateParams);

      if (!session.url) {
        throw new Error('Failed to create upgrade checkout session');
      }

      // Solo redirigir a Stripe — sin cambiar el plan aquí
      return { url: session.url, upgraded: false as const };
    }

    // Nueva suscripción → Checkout
    let stripeCustomerId = existingSubscription?.stripeCustomerId;

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
      // Managed Payments (default en cuentas nuevas) exige tax_code en productos.
      managed_payments: { enabled: false },
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
    } as Stripe.Checkout.SessionCreateParams);

    if (!session.url) {
      throw new Error('Failed to create checkout session');
    }

    return { url: session.url, upgraded: false as const };
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
