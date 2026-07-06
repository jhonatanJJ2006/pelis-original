import { v } from 'convex/values';
import { query, mutation } from './_generated/server';

export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query('plans').collect();
  },
});

export const getById = query({
  args: { id: v.id('plans') },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    price: v.number(),
    description: v.string(),
    features: v.array(v.string()),
    icon: v.string(),
    months: v.number(),
    recommended: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const id = await ctx.db.insert('plans', args);
    return id;
  },
});

export const update = mutation({
  args: {
    id: v.id('plans'),
    name: v.string(),
    price: v.number(),
    description: v.string(),
    features: v.array(v.string()),
    icon: v.string(),
    months: v.number(),
    recommended: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;
    await ctx.db.patch(id, updates);
    return id;
  },
});

export const remove = mutation({
  args: { id: v.id('plans') },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});

export const subscribe = mutation({
  args: {
    planId: v.id('plans'),
    stripeSubscriptionId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error('Not authenticated');

    const user = await ctx.db
      .query('user')
      .withIndex('email', (q) => q.eq('email', identity.email!))
      .first();

    if (!user) throw new Error('User not found');

    const plan = await ctx.db.get(args.planId);
    if (!plan) throw new Error('Plan not found');

    const now = Date.now();
    const endDate = now + plan.months * 30 * 24 * 60 * 60 * 1000;

    const subscriptionId = await ctx.db.insert('subscriptions', {
      userId: user._id,
      planId: args.planId,
      startDate: now,
      endDate,
      status: 'active',
      stripeSubscriptionId: args.stripeSubscriptionId,
    });

    await ctx.db.patch(user._id, {
      planId: args.planId,
      planExpiresAt: endDate,
    });

    return subscriptionId;
  },
});

export const cancel = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error('Not authenticated');

    const user = await ctx.db
      .query('user')
      .withIndex('email', (q) => q.eq('email', identity.email!))
      .first();

    if (!user) throw new Error('User not found');

    const subscription = await ctx.db
      .query('subscriptions')
      .withIndex('by_user', (q) => q.eq('userId', user._id))
      .first();

    if (subscription) {
      await ctx.db.patch(subscription._id, { status: 'cancelled' });
    }

    await ctx.db.patch(user._id, {
      planId: undefined,
      planExpiresAt: undefined,
    });

    return true;
  },
});
