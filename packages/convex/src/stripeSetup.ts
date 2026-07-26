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
