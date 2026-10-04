import { z } from 'zod';
import { prisma } from '../client';
import { notifyChange } from '../realtime';
import { register } from '../registry';
import { requireAdmin } from '../lib/requireAdmin';
import { toPlanShape } from '../lib/shapes';
import { getStripe } from '../lib/stripe-client';
import { applyStripeSubscription, mapStripeStatus } from '../lib/stripe-subscription';

export const list = register({
  kind: 'query',
  name: 'subscriptions.list',
  reads: ['plan'],
  handler: async () => {
    const plans = await prisma.plan.findMany();
    return plans.map(toPlanShape);
  },
});

export const getById = register({
  kind: 'query',
  name: 'subscriptions.getById',
  reads: ['plan'],
  args: z.object({ id: z.string() }),
  handler: async (_ctx, { id }) => {
    const plan = await prisma.plan.findUnique({ where: { id } });
    return plan ? toPlanShape(plan) : null;
  },
});

export const getByUser = register({
  kind: 'query',
  name: 'subscriptions.getByUser',
  reads: ['subscription'],
  args: z.object({ userId: z.string() }),
  handler: async (_ctx, { userId }) => {
    return prisma.subscription.findMany({ where: { userId } });
  },
});

export const adminCreateSubscription = register({
  kind: 'mutation',
  name: 'subscriptions.adminCreateSubscription',
  writes: ['subscription'],
  args: z.object({
    userId: z.string(),
    planId: z.string(),
    months: z.number(),
    status: z.enum(['active', 'cancelled', 'expired']).optional(),
  }),
  handler: async (ctx, { userId, planId, months, status }) => {
    await requireAdmin(ctx);
    const plan = await prisma.plan.findUnique({ where: { id: planId } });
    if (!plan) throw new Error('Plan not found');
    const now = new Date();
    const sub = await prisma.subscription.create({
      data: {
        userId,
        planId,
        startDate: now,
        endDate: new Date(now.getTime() + months * 30 * 24 * 60 * 60 * 1000),
        status: (status ?? 'active').toUpperCase() as 'ACTIVE' | 'CANCELLED' | 'EXPIRED',
        stripePriceId: plan.stripePriceId,
      },
    });
    await notifyChange('subscription', 'insert', sub.id);
    return sub.id;
  },
});

export const setStripePriceId = register({
  kind: 'mutation',
  name: 'subscriptions.setStripePriceId',
  writes: ['plan'],
  args: z.object({ planId: z.string(), stripePriceId: z.string() }),
  handler: async (ctx, { planId, stripePriceId }) => {
    await requireAdmin(ctx);
    const plan = await prisma.plan.findUnique({ where: { id: planId } });
    if (!plan) throw new Error('Plan not found');
    await prisma.plan.update({ where: { id: planId }, data: { stripePriceId } });
    await notifyChange('plan', 'update', planId);
    return planId;
  },
});

export const subscribe = register({
  kind: 'mutation',
  name: 'subscriptions.subscribe',
  writes: [],
  handler: async () => {
    throw new Error('Use Stripe checkout to subscribe. Go to /subscribe.');
  },
});

export const cancel = register({
  kind: 'mutation',
  name: 'subscriptions.cancel',
  writes: ['subscription'],
  handler: async (ctx) => {
    if (!ctx.userId) throw new Error('No autenticado');
    const subs = await prisma.subscription.findMany({
      where: { userId: ctx.userId, status: 'ACTIVE' },
      orderBy: { updatedAt: 'desc' },
    });
    const sub = subs.find((row) => row.stripeSubscriptionId) ?? subs[0];
    if (!sub) throw new Error('No hay una suscripción activa');

    // Comped / admin plans have no Stripe subscription to schedule.
    if (!sub.stripeSubscriptionId) {
      const updated = await prisma.subscription.update({
        where: { id: sub.id },
        data: { status: 'CANCELLED', cancelAtPeriodEnd: false },
      });
      await notifyChange('subscription', 'update', updated.id);
      return { id: updated.id, status: 'CANCELLED' as const, cancelAtPeriodEnd: false };
    }

    // Keep access until the paid period ends. Stripe status stays `active`
    // and sends customer.subscription.deleted when the period is over.
    const stripe = getStripe();
    const updatedStripe = await stripe.subscriptions.update(sub.stripeSubscriptionId, {
      cancel_at_period_end: true,
    });
    const applied = await applyStripeSubscription(prisma, updatedStripe, {
      userId: ctx.userId,
      planId: sub.planId,
      customerId: sub.stripeCustomerId,
    });
    if (!applied.ok || updatedStripe.cancel_at_period_end !== true) {
      await prisma.subscription.update({
        where: { id: sub.id },
        data: { cancelAtPeriodEnd: true },
      });
    }
    await notifyChange('subscription', 'update', applied.id ?? sub.id);
    const status = mapStripeStatus(updatedStripe.status) ?? 'ACTIVE';
    return {
      id: applied.id ?? sub.id,
      status,
      cancelAtPeriodEnd: true,
      endDate: (applied.endDate ?? sub.endDate).getTime(),
    };
  },
});
