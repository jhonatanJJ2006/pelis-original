import { z } from 'zod';
import { prisma } from '../client';
import { notifyChange } from '../realtime';
import { register } from '../registry';
import { requireAdmin } from '../lib/requireAdmin';

const RoleEnum = z.enum(['USER', 'ADMIN']);

export const adminList = register({
  kind: 'query',
  name: 'adminUsers.adminList',
  reads: ['user', 'subscription', 'plan'],
  args: z
    .object({
      search: z.string().optional(),
      role: RoleEnum.optional(),
      limit: z.number().optional(),
    })
    .optional(),
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const a = args ?? {};
    const search = a.search?.trim().toLowerCase() ?? '';
    const where: Record<string, unknown> = {};
    if (a.role) where.role = a.role;
    if (search) {
      where.OR = [
        { email: { contains: search, mode: 'insensitive' } },
        { name: { contains: search, mode: 'insensitive' } },
      ];
    }
    const users = await prisma.user.findMany({
      where,
      take: a.limit ?? 500,
    });
    const result = await Promise.all(
      users.map(async (u) => {
        const subscription = await prisma.subscription.findFirst({
          where: { userId: u.id, status: 'ACTIVE' },
        });
        let plan: { id: string; name: string; price: number } | null = null;
        if (subscription) {
          const p = await prisma.plan.findUnique({ where: { id: subscription.planId } });
          if (p) plan = { id: p.id, name: p.name, price: p.price };
        }
        return {
          _id: u.id,
          userId: u.id,
          email: u.email,
          name: u.name,
          role: u.role as 'USER' | 'ADMIN',
          emailVerified: u.emailVerified,
          createdAt: u.createdAt.getTime(),
          lastLoginAt: u.lastLoginAt?.getTime(),
          subscription: subscription
            ? {
                _id: subscription.id,
                startDate: subscription.startDate.getTime(),
                endDate: subscription.endDate.getTime(),
                status: subscription.status as 'ACTIVE' | 'CANCELLED' | 'EXPIRED',
                plan,
              }
            : null,
        };
      }),
    );
    result.sort((a, b) => (b.lastLoginAt ?? b.createdAt) - (a.lastLoginAt ?? a.createdAt));
    return result;
  },
});

export const adminStats = register({
  kind: 'query',
  name: 'adminUsers.adminStats',
  reads: ['user', 'subscription'],
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const users = await prisma.user.findMany();
    const subs = await prisma.subscription.findMany();
    const activeSubs = subs.filter((s) => s.status === 'ACTIVE');
    const now = Date.now();
    const activeValid = activeSubs.filter((s) => s.endDate.getTime() > now).length;
    let admins = 0;
    let verified = 0;
    for (const u of users) {
      if (u.role === 'ADMIN') admins++;
      if (u.emailVerified) verified++;
    }
    return { total: users.length, admins, verified, withActivePlan: activeValid };
  },
});

export const adminSetRole = register({
  kind: 'mutation',
  name: 'adminUsers.adminSetRole',
  writes: ['user'],
  args: z.object({ userId: z.string(), role: RoleEnum }),
  handler: async (ctx, { userId, role }) => {
    await requireAdmin(ctx);
    await prisma.user.update({ where: { id: userId }, data: { role } });
    await notifyChange('user', 'update', userId);
    return userId;
  },
});

export const adminCreateSubscription = register({
  kind: 'mutation',
  name: 'adminUsers.adminCreateSubscription',
  writes: ['subscription'],
  args: z.object({ userId: z.string(), planId: z.string(), months: z.number() }),
  handler: async (ctx, { userId, planId, months }) => {
    await requireAdmin(ctx);
    const plan = await prisma.plan.findUnique({ where: { id: planId } });
    if (!plan) throw new Error('Plan no encontrado');
    const now = new Date();
    const sub = await prisma.subscription.create({
      data: {
        userId,
        planId,
        startDate: now,
        endDate: new Date(now.getTime() + months * 30 * 24 * 60 * 60 * 1000),
        status: 'ACTIVE',
        stripePriceId: plan.stripePriceId,
      },
    });
    await notifyChange('subscription', 'insert', sub.id);
    return sub.id;
  },
});

export const adminRevokeSubscription = register({
  kind: 'mutation',
  name: 'adminUsers.adminRevokeSubscription',
  writes: ['subscription'],
  args: z.object({ subscriptionId: z.string() }),
  handler: async (ctx, { subscriptionId }) => {
    await requireAdmin(ctx);
    await prisma.subscription.update({
      where: { id: subscriptionId },
      data: { status: 'CANCELLED' },
    });
    await notifyChange('subscription', 'update', subscriptionId);
    return subscriptionId;
  },
});