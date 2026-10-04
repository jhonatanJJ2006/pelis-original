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
  /** True while Stripe will end the subscription at current_period_end. Status stays active until then. */
  cancel_at_period_end?: boolean | null;
};

export type SubscriptionWrite = {
  userId: string;
  planId: string;
  startDate: Date;
  endDate: Date;
  status: AppSubscriptionStatus;
  cancelAtPeriodEnd: boolean;
  stripeSubscriptionId: string;
  stripeCustomerId: string | null;
  stripePriceId: string;
};

/**
 * Map Stripe subscription status to our enum.
 * `incomplete` returns null — do not clobber an existing ACTIVE row.
 * Checkout can still force ACTIVE via `forceActive`.
 * `past_due` and `unpaid` are not entitled: a later subscription.updated
 * must not flip a failed renewal back to ACTIVE.
 */
export function mapStripeStatus(status: string): AppSubscriptionStatus | null {
  switch (status) {
    case 'active':
    case 'trialing':
      return 'ACTIVE';
    case 'canceled':
      return 'CANCELLED';
    case 'incomplete':
      return null;
    case 'past_due':
    case 'unpaid':
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
    cancelAtPeriodEnd: input.subscription.cancel_at_period_end === true,
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
          cancelAtPeriodEnd: data.cancelAtPeriodEnd,
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

/**
 * `invoice.payment_failed` must not revoke a plan the customer already paid for.
 * Stripe does not order webhooks: a failed attempt (or a retried failure delivery)
 * often arrives after `checkout.session.completed` / `invoice.paid` have activated
 * the subscription. Expiring by invoice id alone leaves them unable to watch.
 *
 * - `active` / `trialing`: keep or restore the entitlement (retrieve-current status).
 * - `incomplete`: do not create a row, and do not clobber one checkout already wrote.
 * - otherwise (`past_due`, `unpaid`, `canceled`, `incomplete_expired`, …): expire,
 *   same as the previous failure handler.
 */
export async function applyInvoicePaymentFailed(
  prisma: PrismaClient,
  subscription: StripeSubLike
): Promise<{ ok: boolean; activated: boolean; reason?: string; id?: string; endDate?: Date }> {
  if (subscription.status === 'active' || subscription.status === 'trialing') {
    return applyStripeSubscription(prisma, subscription, { forceActive: true });
  }
  if (subscription.status === 'incomplete') {
    const existing = await prisma.subscription.findUnique({
      where: { stripeSubscriptionId: subscription.id },
    });
    if (!existing) return { ok: true, activated: false, reason: 'incomplete_no_row' };
    return {
      ok: true,
      activated: isEntitlingSubscription(existing),
      id: existing.id,
      endDate: existing.endDate,
    };
  }
  await prisma.subscription.updateMany({
    where: { stripeSubscriptionId: subscription.id },
    data: { status: 'EXPIRED' },
  });
  return { ok: true, activated: false, reason: 'payment_failed' };
}

async function downgradeSubscriptionByStripeId(
  prisma: PrismaClient,
  subscription: StripeSubLike,
  status: 'EXPIRED' | 'CANCELLED'
) {
  await prisma.subscription.updateMany({
    where: { stripeSubscriptionId: subscription.id },
    data: {
      status,
      cancelAtPeriodEnd: subscription.cancel_at_period_end === true,
    },
  });
}

/**
 * `customer.subscription.deleted` is the terminal cancel, not a payment failure.
 * Stripe's own status is `canceled`, which we store as CANCELLED so the product
 * shows a cancellation. EXPIRED stays reserved for failed payment / superseded rows.
 */
export async function applySubscriptionDeleted(
  prisma: PrismaClient,
  subscription: StripeSubLike
): Promise<{ ok: true; status: 'CANCELLED' }> {
  await prisma.subscription.updateMany({
    where: { stripeSubscriptionId: subscription.id },
    data: {
      status: 'CANCELLED',
      cancelAtPeriodEnd: subscription.cancel_at_period_end === true,
    },
  });
  return { ok: true, status: 'CANCELLED' };
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
  const mapped = extras?.forceActive ? ('ACTIVE' as const) : mapStripeStatus(subscription.status);

  const userId = await resolveUserId(prisma, subscription, extras);
  if (!userId) {
    if (mapped === 'EXPIRED' || mapped === 'CANCELLED') {
      await downgradeSubscriptionByStripeId(prisma, subscription, mapped);
      return { ok: true, activated: false, reason: 'missing_user' };
    }
    return { ok: false, activated: false, reason: 'missing_user' };
  }

  const stripePriceId = subscription.items?.data?.[0]?.price?.id ?? null;
  const planId = await resolvePlanId(prisma, {
    planId: extras?.planId || subscription.metadata?.planId,
    stripePriceId,
  });
  if (!planId) {
    if (mapped === 'EXPIRED' || mapped === 'CANCELLED') {
      await downgradeSubscriptionByStripeId(prisma, subscription, mapped);
      return { ok: true, activated: false, reason: 'missing_plan' };
    }
    return { ok: false, activated: false, reason: 'missing_plan' };
  }

  let status: AppSubscriptionStatus | null = mapped;
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

export type CheckoutLike = {
  payment_status?: string | null;
  status?: string | null;
  subscription?: unknown;
  customer?: unknown;
  client_reference_id?: string | null;
  metadata?: Record<string, string> | null;
};

/** User that owns a paid Checkout session. Auth is optional: session_id is the capability. */
export function resolveCheckoutUserId(
  session: CheckoutLike,
  expectedUserId?: string | null
): { userId: string } | { error: 'user_mismatch' | 'missing_user' } {
  const metaUser = session.metadata?.convexUserId ?? session.client_reference_id ?? null;
  if (expectedUserId && metaUser && metaUser !== expectedUserId) {
    return { error: 'user_mismatch' };
  }
  const userId = expectedUserId ?? metaUser;
  if (!userId) return { error: 'missing_user' };
  return { userId };
}

export function isPaidCheckout(session: CheckoutLike): boolean {
  return session.payment_status === 'paid' || session.status === 'complete';
}

export async function fulfillPaidCheckoutSession(
  prisma: PrismaClient,
  stripe: Stripe,
  session: CheckoutLike,
  expectedUserId?: string | null
): Promise<{ activated: boolean; planExpiresAt?: number; userId?: string; reason?: string }> {
  const who = resolveCheckoutUserId(session, expectedUserId);
  if ('error' in who) return { activated: false, reason: who.error };
  if (session.metadata?.type === 'plan_upgrade') {
    if (!isPaidCheckout(session))
      return { activated: false, reason: 'not_paid', userId: who.userId };
    const result = await applyPlanUpgrade(prisma, stripe, {
      ...session.metadata,
      convexUserId: who.userId,
    });
    return {
      activated: result.activated,
      planExpiresAt: result.endDate?.getTime(),
      userId: who.userId,
      reason: result.reason,
    };
  }

  const subscriptionId = getStripeObjectId(session.subscription);
  if (!subscriptionId)
    return { activated: false, reason: 'missing_subscription', userId: who.userId };
  if (!isPaidCheckout(session)) return { activated: false, reason: 'not_paid', userId: who.userId };

  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  const result = await applyStripeSubscription(prisma, subscription, {
    userId: who.userId,
    planId: session.metadata?.planId,
    customerId: getStripeObjectId(session.customer),
    forceActive: true,
  });
  return {
    activated: result.activated,
    planExpiresAt: result.endDate?.getTime(),
    userId: who.userId,
    reason: result.reason,
  };
}
