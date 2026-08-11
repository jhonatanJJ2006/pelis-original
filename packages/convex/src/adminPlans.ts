import { v } from 'convex/values';
import { query, mutation } from './_generated/server';
import { requireAdmin } from './lib/requireAdmin';

export const adminList = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const plans = await ctx.db.query('plans').collect();
    return Promise.all(
      plans.map(async (p) => {
        const subs = await ctx.db
          .query('subscriptions')
          .withIndex('by_plan', (q) => q.eq('planId', p._id))
          .collect();
        const active = subs.filter(
          (s) => s.status === 'active' && s.endDate > Date.now()
        ).length;
        return { ...p, activeSubscribers: active, totalSubscribers: subs.length };
      })
    );
  },
});

export const getById = query({
  args: { id: v.id('plans') },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
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
    await requireAdmin(ctx);
    return await ctx.db.insert('plans', args);
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
    await requireAdmin(ctx);
    const { id, ...rest } = args;
    await ctx.db.patch(id, rest);
    return id;
  },
});

export const remove = mutation({
  args: { id: v.id('plans') },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    await ctx.db.delete(args.id);
  },
});

export const setRecommended = mutation({
  args: {
    id: v.id('plans'),
    recommended: v.boolean(),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    if (args.recommended) {
      const all = await ctx.db.query('plans').collect();
      for (const p of all) {
        if (p._id !== args.id && p.recommended) {
          await ctx.db.patch(p._id, { recommended: false });
        }
      }
    }
    await ctx.db.patch(args.id, { recommended: args.recommended });
    return args.id;
  },
});