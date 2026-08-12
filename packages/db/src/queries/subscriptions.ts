import { z } from 'zod';
import { prisma } from '../client.js';
import { notifyChange } from '../realtime.js';
import { register } from '../registry.js';

export const list = register({
  kind: 'query',
  name: 'subscriptions.list',
  reads: ['plan'],
  handler: async () => {
    return prisma.plan.findMany();
  },
});

export const getById = register({
  kind: 'query',
  name: 'subscriptions.getById',
  reads: ['plan'],
  args: z.object({ id: z.string() }),
  handler: async (_ctx, { id }) => {
    return prisma.plan.findUnique({ where: { id } });
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
  handler: async (_ctx, { userId, planId, months, status }) => {
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
    if (!ctx.userId) throw new Error('Not authenticated');
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
  writes: [],
  handler: async () => {
    throw new Error('Use the billing portal to manage or cancel your subscription.');
  },
});