import { v } from 'convex/values';
import { query, mutation } from './_generated/server';

export const me = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const user = await ctx.db
      .query('user')
      .withIndex('email', (q) => q.eq('email', identity.email!))
      .first();

    return user;
  },
});

export const getById = query({
  args: { id: v.id('user') },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

export const updateProfile = mutation({
  args: { name: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error('Not authenticated');

    const user = await ctx.db
      .query('user')
      .withIndex('email', (q) => q.eq('email', identity.email!))
      .first();

    if (!user) throw new Error('User not found');

    await ctx.db.patch(user._id, { name: args.name });
    return user._id;
  },
});
