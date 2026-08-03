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
    stripePriceId: v.optional(v.string()),
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
    stripePriceId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;
    await ctx.db.patch(id, updates);
    return id;
  },
});

export const setStripePriceId = mutation({
  args: {
    planId: v.id('plans'),
    stripePriceId: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error('Not authenticated');

    const plan = await ctx.db.get(args.planId);
    if (!plan) throw new Error('Plan not found');

    await ctx.db.patch(args.planId, { stripePriceId: args.stripePriceId });
    return args.planId;
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
  handler: async () => {
    throw new Error('Use Stripe checkout to subscribe. Go to /subscribe.');
  },
});

export const cancel = mutation({
  args: {},
  handler: async () => {
    throw new Error('Use the billing portal to manage or cancel your subscription.');
  },
});

export const adminCreateSubscription = mutation({
  args: {
    userId: v.string(),
    planId: v.id('plans'),
    months: v.number(),
    status: v.optional(
      v.union(v.literal('active'), v.literal('cancelled'), v.literal('expired'))
    ),
  },
  handler: async (ctx, args) => {
    const plan = await ctx.db.get(args.planId);
    if (!plan) throw new Error('Plan not found');

    const now = Date.now();
    const id = await ctx.db.insert('subscriptions', {
      userId: args.userId,
      planId: args.planId,
      startDate: now,
      endDate: now + args.months * 30 * 24 * 60 * 60 * 1000,
      status: args.status ?? 'active',
      stripePriceId: plan.stripePriceId,
    });
    return id;
  },
});

export const getByUser = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query('subscriptions')
      .withIndex('by_user', (q) => q.eq('userId', args.userId))
      .collect();
  },
});
