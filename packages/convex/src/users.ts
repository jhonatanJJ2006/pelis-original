import { query } from './_generated/server';

export const me = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const subscription = await ctx.db
      .query('subscriptions')
      .withIndex('by_user', (q) => q.eq('userId', identity.subject))
      .filter((q) => q.eq(q.field('status'), 'active'))
      .first();

    const endDate = subscription?.endDate;
    const hasValidExpiry =
      typeof endDate === 'number' && Number.isFinite(endDate) && endDate > 0;

    return {
      _id: identity.subject,
      name: identity.name ?? 'User',
      email: identity.email ?? '',
      image: identity.pictureUrl ?? undefined,
      planId: subscription?.planId,
      // Solo exponer fecha si es válida; UI usa planExpiresAt > now()
      planExpiresAt: hasValidExpiry ? endDate : undefined,
    };
  },
});
