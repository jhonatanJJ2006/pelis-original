import { queryGeneric, mutationGeneric } from 'convex/server';
import { v } from 'convex/values';

export const list = queryGeneric({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query('plans').collect();
  },
});

export const getById = queryGeneric({
  args: { id: v.id('plans') },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

export const create = mutationGeneric({
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

export const update = mutationGeneric({
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

export const remove = mutationGeneric({
  args: { id: v.id('plans') },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});
