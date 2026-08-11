import { v } from 'convex/values';
import { query, mutation } from './_generated/server';
import { requireAdmin } from './lib/requireAdmin';

export const adminList = query({
  args: {
    search: v.optional(v.string()),
    role: v.optional(v.union(v.literal('user'), v.literal('admin'))),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    const search = args.search?.trim().toLowerCase() ?? '';
    let users = await ctx.db.query('users').collect();

    if (args.role) {
      users = users.filter((u) => (u.role ?? 'user') === args.role);
    }

    if (search) {
      users = users.filter(
        (u) =>
          u.email.toLowerCase().includes(search) ||
          u.name.toLowerCase().includes(search)
      );
    }

    users.sort((a, b) => (b.lastLoginAt ?? b.createdAt) - (a.lastLoginAt ?? a.createdAt));

    const limit = args.limit ?? 500;
    const sliced = users.slice(0, limit);

    const results = await Promise.all(
      sliced.map(async (u) => {
        const subscription = await ctx.db
          .query('subscriptions')
          .withIndex('by_user', (q) => q.eq('userId', u.userId))
          .filter((q) => q.eq(q.field('status'), 'active'))
          .first();

        let plan: { _id: string; name: string; price: number } | null = null;
        if (subscription?.planId) {
          const p = await ctx.db.get(subscription.planId);
          if (p) {
            plan = { _id: p._id, name: p.name, price: p.price };
          }
        }

        return {
          _id: u._id,
          userId: u.userId,
          email: u.email,
          name: u.name,
          role: (u.role ?? 'user') as 'user' | 'admin',
          emailVerified: u.emailVerified,
          createdAt: u.createdAt,
          lastLoginAt: u.lastLoginAt,
          subscription: subscription
            ? {
                _id: subscription._id,
                startDate: subscription.startDate,
                endDate: subscription.endDate,
                status: subscription.status,
                plan,
              }
            : null,
        };
      })
    );

    return results;
  },
});

export const adminStats = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const users = await ctx.db.query('users').collect();
    const subs = await ctx.db.query('subscriptions').collect();
    const activeSubs = subs.filter((s) => s.status === 'active');
    const now = Date.now();
    const activeValid = activeSubs.filter((s) => s.endDate > now).length;

    let admins = 0;
    let verified = 0;
    for (const u of users) {
      if ((u.role ?? 'user') === 'admin') admins += 1;
      if (u.emailVerified) verified += 1;
    }

    return {
      total: users.length,
      admins,
      verified,
      withActivePlan: activeValid,
    };
  },
});

export const adminSetRole = mutation({
  args: {
    userId: v.id('users'),
    role: v.union(v.literal('user'), v.literal('admin')),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    await ctx.db.patch(args.userId, {
      role: args.role,
      updatedAt: Date.now(),
    });
    return args.userId;
  },
});

export const adminCreateSubscription = mutation({
  args: {
    userId: v.string(),
    planId: v.id('plans'),
    months: v.number(),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const plan = await ctx.db.get(args.planId);
    if (!plan) throw new Error('Plan no encontrado');

    const now = Date.now();
    const id = await ctx.db.insert('subscriptions', {
      userId: args.userId,
      planId: args.planId,
      startDate: now,
      endDate: now + args.months * 30 * 24 * 60 * 60 * 1000,
      status: 'active',
      stripePriceId: plan.stripePriceId,
    });
    return id;
  },
});

export const adminRevokeSubscription = mutation({
  args: { subscriptionId: v.id('subscriptions') },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    await ctx.db.patch(args.subscriptionId, { status: 'cancelled' });
    return args.subscriptionId;
  },
});