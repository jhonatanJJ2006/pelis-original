import type { PrismaClient } from '@prisma/client';
import type Stripe from 'stripe';

export type AppSubscriptionStatus = 'ACTIVE' | 'CANCELLED' | 'EXPIRED';

export type StripeSubLike = {
  id: string;
  status: string;
  created?: number;
  customer?: unknown;
  metadata?: Record<string, string> | null;
  items?: {
    data?: Array<{
      price?: { id?: string };
      current_period_start?: number;
      current_period_end?: number;
    }>;
  };
  current_period_start?: number;
  current_period_end?: number;
};

export type SubscriptionWrite = {
  userId: string;
  planId: string;
  startDate: Date;
  endDate: Date;
  status: AppSubscriptionStatus;
  stripeSubscriptionId: string;
  stripeCustomerId: string | null;
  stripePriceId: string;
};

/**
 * Map Stripe subscription status to our enum.
 * `incomplete` returns null — do not clobber an existing ACTIVE row.
 * Checkout can still force ACTIVE via `forceActive`.
 */
export function mapStripeStatus(status: string): AppSubscriptionStatus | null {
  switch (status) {
    case 'active':
    case 'trialing':
    case 'past_due':
    case 'unpaid':
      return 'ACTIVE';
    case 'canceled':
      return 'CANCELLED';
    case 'incomplete':
      return null;
    case 'incomplete_expired':
    case 'paused':
    default:
      return 'EXPIRED';
  }
}

export function getStripeObjectId(value: unknown): string | null {
  if (typeof value === 'string' && value.length > 0) return value;
  if (value && typeof value === 'object' && 'id' in value) {
    const id = (value as { id: unknown }).id;
    if (typeof id === 'string' && id.length > 0) return id;
  }
  return null;
}

export function getSubscriptionPeriod(subscription: StripeSubLike): {
  startDate: Date;
  endDate: Date;
} {
  const item = subscription.items?.data?.[0];
  const startSec =
    item?.current_period_start ?? subscription.current_period_start ?? subscription.created ?? 0;
  const endSec = item?.current_period_end ?? subscription.current_period_end;
  const startDate = new Date(startSec * 1000);
  const endDate = endSec
    ? new Date(endSec * 1000)
    : new Date(startDate.getTime() + 30 * 24 * 60 * 60 * 1000);
  return { startDate, endDate };
}

/** Stripe API 2025+ moved invoice.subscription under parent.subscription_details. */
export function getInvoiceSubscriptionId(invoice: unknown): string | null {
  if (!invoice || typeof invoice !== 'object') return null;
  const inv = invoice as Record<string, unknown>;
  const direct = getStripeObjectId(inv.subscription);
  if (direct) return direct;
  const parent = inv.parent;
  if (parent && typeof parent === 'object') {
    const details = (parent as Record<string, unknown>).subscription_details;
    if (details && typeof details === 'object') {
      const nested = getStripeObjectId((details as Record<string, unknown>).subscription);
      if (nested) return nested;
    }
  }
  return null;
}

export function isEntitlingSubscription(
  sub: { status: string; endDate: Date } | null | undefined,
  now = Date.now()
): boolean {
  if (!sub || sub.status !== 'ACTIVE') return false;
  const end = sub.endDate.getTime();
  return Number.isFinite(end) && end > now;
}

export function buildSubscriptionWrite(input: {
  subscription: StripeSubLike;
  userId: string;
  planId: string;
  customerId?: string | null;
  status: AppSubscriptionStatus;
}): SubscriptionWrite {
  const { startDate, endDate } = getSubscriptionPeriod(input.subscription);
  return {
    userId: input.userId,
    planId: input.planId,
    startDate,
    endDate,
    status: input.status,
    stripeSubscriptionId: input.subscription.id,
    stripeCustomerId: input.customerId ?? getStripeObjectId(input.subscription.customer),
    stripePriceId: input.subscription.items?.data?.[0]?.price?.id ?? '',
  };
}

export async function supersedeOtherActiveSubscriptions(
  prisma: PrismaClient,
  userId: string,
  keepStripeSubscriptionId: string
) {
  await prisma.subscription.updateMany({
    where: {
      userId,
      status: 'ACTIVE',
      OR: [
        { stripeSubscriptionId: null },
        { stripeSubscriptionId: { not: keepStripeSubscriptionId } },
      ],
    },
    data: { status: 'EXPIRED' },
  });
}

export async function upsertSubscriptionFromStripe(prisma: PrismaClient, data: SubscriptionWrite) {
  const existing = await prisma.subscription.findUnique({
    where: { stripeSubscriptionId: data.stripeSubscriptionId },
  });
  const row = existing
    ? await prisma.subscription.update({
        where: { id: existing.id },
        data: {
          userId: data.userId,
          planId: data.planId,
          startDate: data.startDate,
          endDate: data.endDate,
          status: data.status,
          stripeCustomerId: data.stripeCustomerId,
          stripePriceId: data.stripePriceId,
        },
      })
    : await prisma.subscription.create({ data });

  if (data.status === 'ACTIVE') {
    await supersedeOtherActiveSubscriptions(prisma, data.userId, data.stripeSubscriptionId);
  }
  return { id: row.id, activated: isEntitlingSubscription(row) };
}

async function resolvePlanId(
  prisma: PrismaClient,
  opts: { planId?: string | null; stripePriceId?: string | null }
): Promise<string | null> {
  if (opts.planId) {
    const plan = await prisma.plan.findUnique({ where: { id: opts.planId } });
    if (plan) return plan.id;
  }
  if (opts.stripePriceId) {
    const plan = await prisma.plan.findUnique({ where: { stripePriceId: opts.stripePriceId } });
    if (plan) return plan.id;
  }
  return null;
}

async function resolveUserId(
  prisma: PrismaClient,
  subscription: StripeSubLike,
  extras?: { userId?: string | null; customerId?: string | null }
): Promise<string | null> {
  if (extras?.userId) return extras.userId;
  const fromMeta = subscription.metadata?.convexUserId;
  if (fromMeta) return fromMeta;
  const customerId = extras?.customerId ?? getStripeObjectId(subscription.customer);
  if (!customerId) return null;
  const existing = await prisma.subscription.findFirst({
    where: { stripeCustomerId: customerId },
    orderBy: { updatedAt: 'desc' },
  });
  return existing?.userId ?? null;
}

export async function applyStripeSubscription(
  prisma: PrismaClient,
  subscription: StripeSubLike,
  extras?: {
    userId?: string | null;
    planId?: string | null;
    customerId?: string | null;
    forceActive?: boolean;
  }
): Promise<{ ok: boolean; activated: boolean; reason?: string; id?: string; endDate?: Date }> {
  const userId = await resolveUserId(prisma, subscription, extras);
  if (!userId) return { ok: false, activated: false, reason: 'missing_user' };

  const stripePriceId = subscription.items?.data?.[0]?.price?.id ?? null;
  const planId = await resolvePlanId(prisma, {
    planId: extras?.planId || subscription.metadata?.planId,
    stripePriceId,
  });
  if (!planId) return { ok: false, activated: false, reason: 'missing_plan' };

  let status = extras?.forceActive ? ('ACTIVE' as const) : mapStripeStatus(subscription.status);
  if (status === null) {
    const existing = await prisma.subscription.findUnique({
      where: { stripeSubscriptionId: subscription.id },
    });
    if (existing) {
      return {
        ok: true,
        activated: isEntitlingSubscription(existing),
        id: existing.id,
        endDate: existing.endDate,
      };
    }
    // First sight of our own checkout (metadata present): activate even if Stripe
    // still reports `incomplete` for a few seconds after a paid session.
    if (subscription.metadata?.convexUserId && subscription.metadata?.planId) {
      status = 'ACTIVE';
    } else {
      return { ok: false, activated: false, reason: 'incomplete_no_row' };
    }
  }

  const write = buildSubscriptionWrite({
    subscription,
    userId,
    planId,
    customerId: extras?.customerId,
    status,
  });
  const result = await upsertSubscriptionFromStripe(prisma, write);
  return { ok: true, activated: result.activated, id: result.id, endDate: write.endDate };
}

export async function applyPlanUpgrade(
  prisma: PrismaClient,
  stripe: Stripe,
  metadata: {
    stripeSubscriptionId?: string;
    stripePriceId?: string;
    stripeSubscriptionItemId?: string;
    planId?: string;
    convexUserId?: string;
  }
): Promise<{ ok: boolean; activated: boolean; reason?: string; endDate?: Date }> {
  const subscriptionId = metadata.stripeSubscriptionId;
  const stripePriceId = metadata.stripePriceId;
  const itemId = metadata.stripeSubscriptionItemId;
  const planId = metadata.planId;
  if (!subscriptionId || !stripePriceId || !itemId || !planId) {
    return { ok: false, activated: false, reason: 'missing_upgrade_metadata' };
  }
  const current = await stripe.subscriptions.retrieve(subscriptionId);
  const alreadyOnPrice = current.items.data[0]?.price.id === stripePriceId;
  const updated = alreadyOnPrice
    ? current
    : await stripe.subscriptions.update(subscriptionId, {
        items: [{ id: itemId, price: stripePriceId }],
        proration_behavior: 'none',
        metadata: { convexUserId: metadata.convexUserId ?? '', planId },
      });
  return applyStripeSubscription(prisma, updated, {
    userId: metadata.convexUserId,
    planId,
    forceActive: true,
  });
}
