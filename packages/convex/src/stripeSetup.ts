import { mutation } from './_generated/server';

/** Price IDs de Stripe (modo test). Ejecutar una vez tras crear productos. */
const STRIPE_PRICE_IDS: Record<string, string> = {
  Básico: 'price_1TxJEPRH7vBwdsStZkFI4UX3',
  Estándar: 'price_1TxJFgRH7vBwdsStIrjaogIR',
  Premium: 'price_1TxJGJRH7vBwdsSth19z54OX',
};

export const linkPrices = mutation({
  args: {},
  handler: async (ctx) => {
    const plans = await ctx.db.query('plans').collect();
    const updated: { name: string; stripePriceId: string }[] = [];
    const missing: string[] = [];

    for (const [name, stripePriceId] of Object.entries(STRIPE_PRICE_IDS)) {
      const plan = plans.find((p) => p.name === name);
      if (!plan) {
        missing.push(name);
        continue;
      }
      await ctx.db.patch(plan._id, { stripePriceId });
      updated.push({ name, stripePriceId });
    }

    return { updated, missing, totalPlans: plans.length };
  },
});

/**
 * Repara suscripciones con startDate/endDate inválidos (NaN/0)
 * causados por la API Stripe Basil+ (period en items, no en root).
 */
export const repairMissingDates = mutation({
  args: {},
  handler: async (ctx) => {
    const subs = await ctx.db.query('subscriptions').collect();
    const repaired: { id: string; startDate: number; endDate: number }[] = [];

    for (const sub of subs) {
      const badEnd = !Number.isFinite(sub.endDate) || sub.endDate <= 0;
      const badStart = !Number.isFinite(sub.startDate) || sub.startDate <= 0;
      if (!badEnd && !badStart) continue;

      const plan = await ctx.db.get(sub.planId);
      const months = plan?.months ?? 1;
      const startDate = badStart ? Date.now() : sub.startDate;
      const endDate = startDate + months * 30 * 24 * 60 * 60 * 1000;

      await ctx.db.patch(sub._id, {
        startDate,
        endDate,
        status: 'active',
      });

      repaired.push({ id: sub._id, startDate, endDate });
    }

    return { repairedCount: repaired.length, repaired };
  },
});
