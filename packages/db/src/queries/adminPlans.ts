import { z } from 'zod';
import { prisma } from '../client';
import { notifyChange } from '../realtime';
import { register } from '../registry';
import { requireAdmin } from '../lib/requireAdmin';
import { toPlanShape } from '../lib/shapes';

const PlanCreate = z.object({
  name: z.string(),
  price: z.number(),
  description: z.string(),
  features: z.array(z.string()),
  icon: z.string(),
  months: z.number(),
  maxDevices: z.number().int().positive().default(1),
  recommended: z.boolean().optional(),
  stripePriceId: z.string().optional(),
});

export const adminList = register({
  kind: 'query',
  name: 'adminPlans.adminList',
  reads: ['plan', 'subscription'],
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const plans = await prisma.plan.findMany();
    const now = new Date();
    const enriched = await Promise.all(
      plans.map(async (p) => {
        const subs = await prisma.subscription.findMany({ where: { planId: p.id } });
        const active = subs.filter(
          (s) => s.status === 'ACTIVE' && s.endDate.getTime() > now.getTime()
        ).length;
        // Shape Prisma `id` → `_id` for /admin/plans edit links (avoid /admin/plans/undefined/edit).
        return { ...toPlanShape(p), activeSubscribers: active, totalSubscribers: subs.length };
      })
    );
    return enriched;
  },
});

export const getById = register({
  kind: 'query',
  name: 'adminPlans.getById',
  reads: ['plan'],
  args: z.object({ id: z.string() }),
  handler: async (ctx, { id }) => {
    await requireAdmin(ctx);
    const plan = await prisma.plan.findUnique({ where: { id } });
    return plan ? toPlanShape(plan) : null;
  },
});

export const create = register({
  kind: 'mutation',
  name: 'adminPlans.create',
  writes: ['plan'],
  args: PlanCreate,
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const p = await prisma.plan.create({ data: args });
    await notifyChange('plan', 'insert', p.id);
    return p.id;
  },
});

export const update = register({
  kind: 'mutation',
  name: 'adminPlans.update',
  writes: ['plan'],
  args: PlanCreate.extend({ id: z.string() }),
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const { id, ...rest } = args;
    await prisma.plan.update({ where: { id }, data: rest });
    await notifyChange('plan', 'update', id);
    return id;
  },
});

export const remove = register({
  kind: 'mutation',
  name: 'adminPlans.remove',
  writes: ['plan'],
  args: z.object({ id: z.string() }),
  handler: async (ctx, { id }) => {
    await requireAdmin(ctx);
    await prisma.plan.delete({ where: { id } });
    await notifyChange('plan', 'delete', id);
    return id;
  },
});

export const setRecommended = register({
  kind: 'mutation',
  name: 'adminPlans.setRecommended',
  writes: ['plan'],
  args: z.object({ id: z.string(), recommended: z.boolean() }),
  handler: async (ctx, { id, recommended }) => {
    await requireAdmin(ctx);
    if (recommended) {
      const all = await prisma.plan.findMany();
      for (const p of all) {
        if (p.id !== id && p.recommended) {
          await prisma.plan.update({ where: { id: p.id }, data: { recommended: false } });
        }
      }
    }
    await prisma.plan.update({ where: { id }, data: { recommended } });
    await notifyChange('plan', 'update', id);
    return id;
  },
});
