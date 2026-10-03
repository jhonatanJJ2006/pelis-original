import { describe, expect, it } from 'vitest';
import type { PrismaClient } from '@prisma/client';
import {
  applyInvoicePaymentFailed,
  applyStripeSubscription,
  getInvoiceSubscriptionId,
  getStripeObjectId,
  getSubscriptionPeriod,
  isEntitlingSubscription,
  mapStripeStatus,
  resolveCheckoutUserId,
  type StripeSubLike,
} from './stripe-subscription';

type Row = {
  id: string;
  userId: string;
  planId: string;
  startDate: Date;
  endDate: Date;
  status: 'ACTIVE' | 'CANCELLED' | 'EXPIRED';
  stripeSubscriptionId: string | null;
  stripeCustomerId: string | null;
  stripePriceId: string;
  updatedAt: Date;
};

function createMemoryPrisma(seed?: {
  plans?: Array<{ id: string; stripePriceId: string }>;
  subs?: Row[];
}) {
  const plans = seed?.plans ?? [{ id: 'plan_basico', stripePriceId: 'price_basico' }];
  const subscriptions: Row[] = seed?.subs ? [...seed.subs] : [];
  let seq = subscriptions.length;

  const prisma = {
    plan: {
      findUnique: async ({ where }: { where: { id?: string; stripePriceId?: string } }) =>
        plans.find((p) => p.id === where.id || p.stripePriceId === where.stripePriceId) ?? null,
    },
    subscription: {
      findUnique: async ({ where }: { where: { id?: string; stripeSubscriptionId?: string } }) =>
        subscriptions.find(
          (s) =>
            s.id === where.id ||
            (where.stripeSubscriptionId && s.stripeSubscriptionId === where.stripeSubscriptionId)
        ) ?? null,
      findFirst: async ({ where }: { where: { stripeCustomerId?: string } }) =>
        subscriptions.find((s) => s.stripeCustomerId === where.stripeCustomerId) ?? null,
      create: async ({ data }: { data: Omit<Row, 'id' | 'updatedAt'> }) => {
        seq += 1;
        const row: Row = { id: `local_${seq}`, updatedAt: new Date(), ...data };
        subscriptions.push(row);
        return row;
      },
      update: async ({ where, data }: { where: { id: string }; data: Partial<Row> }) => {
        const row = subscriptions.find((s) => s.id === where.id);
        if (!row) throw new Error('not found');
        Object.assign(row, data, { updatedAt: new Date() });
        return row;
      },
      updateMany: async ({
        where,
        data,
      }: {
        where: {
          userId?: string;
          status?: string;
          stripeSubscriptionId?: string;
          OR?: Array<{ stripeSubscriptionId: string | null | { not: string } }>;
        };
        data: Partial<Row>;
      }) => {
        let count = 0;
        for (const row of subscriptions) {
          if (where.stripeSubscriptionId && !where.userId) {
            if (row.stripeSubscriptionId !== where.stripeSubscriptionId) continue;
            Object.assign(row, data, { updatedAt: new Date() });
            count += 1;
            continue;
          }
          if (row.userId !== where.userId || row.status !== where.status) continue;
          const or = where.OR;
          if (or) {
            const match = or.some((clause) => {
              if ('stripeSubscriptionId' in clause && clause.stripeSubscriptionId === null) {
                return row.stripeSubscriptionId === null;
              }
              const not = (clause.stripeSubscriptionId as { not?: string } | undefined)?.not;
              if (not) return row.stripeSubscriptionId !== not;
              return false;
            });
            if (!match) continue;
          }
          Object.assign(row, data, { updatedAt: new Date() });
          count += 1;
        }
        return { count };
      },
    },
  };

  return { prisma: prisma as unknown as PrismaClient, subscriptions, plans };
}

function paidSub(over: Partial<StripeSubLike> = {}): StripeSubLike {
  const now = Math.floor(Date.now() / 1000);
  return {
    id: 'sub_paid',
    status: 'active',
    created: now,
    customer: 'cus_1',
    metadata: { convexUserId: 'user_1', planId: 'plan_basico' },
    items: {
      data: [
        {
          price: { id: 'price_basico' },
          current_period_start: now,
          current_period_end: now + 30 * 24 * 60 * 60,
        },
      ],
    },
    ...over,
  };
}

describe('mapStripeStatus', () => {
  it('treats paid-like Stripe statuses as ACTIVE', () => {
    expect(mapStripeStatus('active')).toBe('ACTIVE');
    expect(mapStripeStatus('trialing')).toBe('ACTIVE');
    expect(mapStripeStatus('past_due')).toBe('ACTIVE');
    expect(mapStripeStatus('unpaid')).toBe('ACTIVE');
  });

  it('does not map incomplete to EXPIRED (avoids clobbering a paid plan)', () => {
    expect(mapStripeStatus('incomplete')).toBeNull();
  });

  it('maps canceled and incomplete_expired off the entitlement', () => {
    expect(mapStripeStatus('canceled')).toBe('CANCELLED');
    expect(mapStripeStatus('incomplete_expired')).toBe('EXPIRED');
    expect(mapStripeStatus('paused')).toBe('EXPIRED');
  });
});

describe('getStripeObjectId', () => {
  it('reads string ids and expanded objects', () => {
    expect(getStripeObjectId('sub_123')).toBe('sub_123');
    expect(getStripeObjectId({ id: 'sub_123' })).toBe('sub_123');
    expect(getStripeObjectId(null)).toBeNull();
    expect(getStripeObjectId('')).toBeNull();
  });
});

describe('getSubscriptionPeriod', () => {
  it('prefers period dates on the subscription item (Stripe API 2025+)', () => {
    const { startDate, endDate } = getSubscriptionPeriod({
      id: 'sub_1',
      status: 'active',
      created: 1_700_000_000,
      items: { data: [{ current_period_start: 1_800_000_000, current_period_end: 1_800_086_400 }] },
    });
    expect(startDate.toISOString()).toBe(new Date(1_800_000_000 * 1000).toISOString());
    expect(endDate.toISOString()).toBe(new Date(1_800_086_400 * 1000).toISOString());
  });

  it('falls back to 30 days when period end is missing', () => {
    const created = 1_700_000_000;
    const { startDate, endDate } = getSubscriptionPeriod({
      id: 'sub_1',
      status: 'active',
      created,
    });
    expect(startDate.getTime()).toBe(created * 1000);
    expect(endDate.getTime() - startDate.getTime()).toBe(30 * 24 * 60 * 60 * 1000);
  });
});

describe('getInvoiceSubscriptionId', () => {
  it('reads the legacy invoice.subscription field', () => {
    expect(getInvoiceSubscriptionId({ subscription: 'sub_legacy' })).toBe('sub_legacy');
  });

  it('reads Stripe API 2025 parent.subscription_details.subscription', () => {
    expect(
      getInvoiceSubscriptionId({
        parent: { subscription_details: { subscription: { id: 'sub_new' } } },
      })
    ).toBe('sub_new');
  });
});

describe('resolveCheckoutUserId', () => {
  it('fulfills from Stripe metadata without a login cookie (Movies tunnel)', () => {
    expect(
      resolveCheckoutUserId({
        metadata: { convexUserId: 'user_1', planId: 'plan_basico' },
        client_reference_id: 'user_1',
      })
    ).toEqual({ userId: 'user_1' });
  });

  it('rejects a session that belongs to another user', () => {
    expect(resolveCheckoutUserId({ metadata: { convexUserId: 'user_1' } }, 'user_other')).toEqual({
      error: 'user_mismatch',
    });
  });

  it('uses the logged-in user when metadata is missing', () => {
    expect(resolveCheckoutUserId({ metadata: {} }, 'user_1')).toEqual({ userId: 'user_1' });
  });
});

describe('isEntitlingSubscription', () => {
  it('requires ACTIVE and a future endDate', () => {
    const future = new Date(Date.now() + 60_000);
    const past = new Date(Date.now() - 60_000);
    expect(isEntitlingSubscription({ status: 'ACTIVE', endDate: future })).toBe(true);
    expect(isEntitlingSubscription({ status: 'ACTIVE', endDate: past })).toBe(false);
    expect(isEntitlingSubscription({ status: 'EXPIRED', endDate: future })).toBe(false);
    expect(isEntitlingSubscription(null)).toBe(false);
  });
});

describe('applyStripeSubscription', () => {
  it('creates an ACTIVE entitlement after a paid checkout', async () => {
    const { prisma, subscriptions } = createMemoryPrisma();
    const result = await applyStripeSubscription(prisma, paidSub(), {
      userId: 'user_1',
      planId: 'plan_basico',
      forceActive: true,
    });
    expect(result.ok).toBe(true);
    expect(result.activated).toBe(true);
    expect(subscriptions).toHaveLength(1);
    expect(subscriptions[0]?.status).toBe('ACTIVE');
    expect(subscriptions[0]?.userId).toBe('user_1');
    expect(isEntitlingSubscription(subscriptions[0])).toBe(true);
  });

  it('does not expire an ACTIVE row when a retried incomplete updated event arrives', async () => {
    const { prisma, subscriptions } = createMemoryPrisma();
    await applyStripeSubscription(prisma, paidSub(), { forceActive: true });
    expect(subscriptions[0]?.status).toBe('ACTIVE');

    const retried = await applyStripeSubscription(prisma, paidSub({ status: 'incomplete' }));
    expect(retried.ok).toBe(true);
    expect(retried.activated).toBe(true);
    expect(subscriptions).toHaveLength(1);
    expect(subscriptions[0]?.status).toBe('ACTIVE');
    expect(isEntitlingSubscription(subscriptions[0])).toBe(true);
  });

  it('activates from subscription.created metadata even if Stripe still says incomplete', async () => {
    const { prisma, subscriptions } = createMemoryPrisma();
    const result = await applyStripeSubscription(prisma, paidSub({ status: 'incomplete' }));
    expect(result.ok).toBe(true);
    expect(result.activated).toBe(true);
    expect(subscriptions[0]?.status).toBe('ACTIVE');
  });

  it('supersedes a previous ACTIVE row for the same user', async () => {
    const oldEnd = new Date(Date.now() + 86_400_000);
    const { prisma, subscriptions } = createMemoryPrisma({
      subs: [
        {
          id: 'local_old',
          userId: 'user_1',
          planId: 'plan_basico',
          startDate: new Date(),
          endDate: oldEnd,
          status: 'ACTIVE',
          stripeSubscriptionId: null,
          stripeCustomerId: 'cus_old',
          stripePriceId: 'price_basico',
          updatedAt: new Date(),
        },
      ],
    });
    await applyStripeSubscription(prisma, paidSub({ id: 'sub_new' }), { forceActive: true });
    const leftover = subscriptions.find((s) => s.id === 'local_old');
    const created = subscriptions.find((s) => s.stripeSubscriptionId === 'sub_new');
    expect(leftover?.status).toBe('EXPIRED');
    expect(created?.status).toBe('ACTIVE');
    expect(isEntitlingSubscription(created)).toBe(true);
  });

  it('rejects events that cannot be mapped to a user or plan', async () => {
    const { prisma } = createMemoryPrisma();
    const missingUser = await applyStripeSubscription(prisma, paidSub({ metadata: {} }));
    expect(missingUser).toMatchObject({ ok: false, reason: 'missing_user' });

    const missingPlan = await applyStripeSubscription(
      prisma,
      paidSub({
        metadata: { convexUserId: 'user_1' },
        items: { data: [{ price: { id: 'price_desconocido' } }] },
      }),
      { planId: 'plan_no_existe' }
    );
    expect(missingPlan).toMatchObject({ ok: false, reason: 'missing_plan' });
  });
});

describe('applyInvoicePaymentFailed', () => {
  it('keeps an ACTIVE plan when a stale failure arrives after the subscription is active', async () => {
    const { prisma, subscriptions } = createMemoryPrisma();
    await applyStripeSubscription(prisma, paidSub(), { forceActive: true });
    expect(subscriptions[0]?.status).toBe('ACTIVE');

    const result = await applyInvoicePaymentFailed(prisma, paidSub({ status: 'active' }));
    expect(result.activated).toBe(true);
    expect(subscriptions).toHaveLength(1);
    expect(subscriptions[0]?.status).toBe('ACTIVE');
    expect(isEntitlingSubscription(subscriptions[0])).toBe(true);
  });

  it('does not expire a plan checkout already activated while Stripe still says incomplete', async () => {
    const { prisma, subscriptions } = createMemoryPrisma();
    await applyStripeSubscription(prisma, paidSub(), { forceActive: true });

    const result = await applyInvoicePaymentFailed(prisma, paidSub({ status: 'incomplete' }));
    expect(result.activated).toBe(true);
    expect(subscriptions[0]?.status).toBe('ACTIVE');
    expect(isEntitlingSubscription(subscriptions[0])).toBe(true);
  });

  it('does not create a plan for a failed payment that never activated', async () => {
    const { prisma, subscriptions } = createMemoryPrisma();
    const result = await applyInvoicePaymentFailed(prisma, paidSub({ status: 'incomplete' }));
    expect(result).toMatchObject({ ok: true, activated: false, reason: 'incomplete_no_row' });
    expect(subscriptions).toHaveLength(0);
  });

  it('still expires the row when Stripe says the renewal failed (past_due)', async () => {
    const { prisma, subscriptions } = createMemoryPrisma();
    await applyStripeSubscription(prisma, paidSub(), { forceActive: true });
    const result = await applyInvoicePaymentFailed(prisma, paidSub({ status: 'past_due' }));
    expect(result.activated).toBe(false);
    expect(subscriptions[0]?.status).toBe('EXPIRED');
    expect(isEntitlingSubscription(subscriptions[0])).toBe(false);
  });

  it('restores a plan that a previous failure expired once Stripe reports active', async () => {
    const { prisma, subscriptions } = createMemoryPrisma();
    await applyStripeSubscription(prisma, paidSub(), { forceActive: true });
    await applyInvoicePaymentFailed(prisma, paidSub({ status: 'past_due' }));
    expect(subscriptions[0]?.status).toBe('EXPIRED');

    const restored = await applyInvoicePaymentFailed(prisma, paidSub({ status: 'active' }));
    expect(restored.activated).toBe(true);
    expect(subscriptions[0]?.status).toBe('ACTIVE');
    expect(isEntitlingSubscription(subscriptions[0])).toBe(true);
  });
});
