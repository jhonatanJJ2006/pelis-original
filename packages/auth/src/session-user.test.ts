import { describe, expect, it } from 'vitest';
import {
  applyHydratedUser,
  decideSessionSync,
  canStream,
  hasActivePlan,
  mergeStoredAndSession,
  resolveUseUser,
  type SessionUserLike,
} from './session-user';
import type { User as StoreUser } from './store';

const session: SessionUserLike = {
  id: 'u1',
  name: 'Ada',
  email: 'ada@example.com',
  emailVerified: true,
  role: 'USER',
};

const storedWithPlan: StoreUser = {
  _id: 'u1',
  name: 'Ada',
  email: 'ada@example.com',
  role: 'user',
  planId: 'plan_pro',
  planExpiresAt: Date.now() + 86_400_000,
};

describe('hasActivePlan', () => {
  it('is true only when expiry is in the future', () => {
    const now = 1_700_000_000_000;
    expect(hasActivePlan({ planExpiresAt: now + 1 }, now)).toBe(true);
    expect(hasActivePlan({ planExpiresAt: now }, now)).toBe(false);
    expect(hasActivePlan({ planExpiresAt: now - 1 }, now)).toBe(false);
    expect(hasActivePlan({}, now)).toBe(false);
    expect(hasActivePlan(null, now)).toBe(false);
  });
});

describe('mergeStoredAndSession', () => {
  it('keeps plan fields from the store for the same user', () => {
    const merged = mergeStoredAndSession(storedWithPlan, session);
    expect(merged.planId).toBe('plan_pro');
    expect(merged.planExpiresAt).toBe(storedWithPlan.planExpiresAt);
    expect(merged._id).toBe('u1');
  });

  it('does not keep plan when the session user id changes', () => {
    const merged = mergeStoredAndSession(storedWithPlan, { ...session, id: 'u2' });
    expect(merged._id).toBe('u2');
    expect(merged.planId).toBeUndefined();
    expect(merged.planExpiresAt).toBeUndefined();
  });
});

describe('resolveUseUser', () => {
  it('returns stored user when the session snapshot is empty', () => {
    expect(resolveUseUser({ sessionUser: null, storedUser: storedWithPlan })).toEqual(
      storedWithPlan
    );
  });

  it('returns null when both session and store are empty', () => {
    expect(resolveUseUser({ sessionUser: null, storedUser: null })).toBeNull();
  });

  it('merges session + stored plan when session is present', () => {
    const user = resolveUseUser({ sessionUser: session, storedUser: storedWithPlan });
    expect(user?.planId).toBe('plan_pro');
    expect(hasActivePlan(user)).toBe(true);
  });
});

describe('decideSessionSync', () => {
  it('does nothing while the session query is pending', () => {
    expect(
      decideSessionSync({
        isPending: true,
        sessionUserId: null,
        hadLiveSession: false,
      })
    ).toEqual({ action: 'keep' });
  });

  it('clears only a confirmed logged-out first load', () => {
    expect(
      decideSessionSync({
        isPending: false,
        sessionUserId: null,
        hadLiveSession: false,
      })
    ).toEqual({ action: 'clear' });
  });

  it('keeps last-known-good on refetch error', () => {
    expect(
      decideSessionSync({
        isPending: false,
        sessionUserId: null,
        sessionError: new Error('network'),
        hadLiveSession: false,
      })
    ).toEqual({ action: 'keep' });
  });

  it('keeps last-known-good if a live session already existed', () => {
    expect(
      decideSessionSync({
        isPending: false,
        sessionUserId: null,
        hadLiveSession: true,
      })
    ).toEqual({ action: 'keep' });
  });

  it('hydrates when a session user is present', () => {
    expect(
      decideSessionSync({
        isPending: false,
        sessionUserId: 'u1',
        hadLiveSession: true,
      })
    ).toEqual({ action: 'hydrate' });
  });
});

describe('applyHydratedUser', () => {
  it('preserves plan while users.me is in flight', () => {
    const next = applyHydratedUser({
      sessionUser: session,
      stored: storedWithPlan,
    });
    expect(next.planId).toBe('plan_pro');
    expect(next.planExpiresAt).toBe(storedWithPlan.planExpiresAt);
  });

  it('preserves plan when users.me fetch fails', () => {
    const next = applyHydratedUser({
      sessionUser: session,
      stored: storedWithPlan,
      me: { ok: false },
    });
    expect(next.planId).toBe('plan_pro');
    expect(hasActivePlan(next)).toBe(true);
  });

  it('applies a successful me profile, including a genuine missing plan', () => {
    const withPlan = applyHydratedUser({
      sessionUser: session,
      stored: storedWithPlan,
      me: {
        ok: true,
        user: {
          _id: 'u1',
          name: 'Ada',
          email: 'ada@example.com',
          planId: 'plan_pro',
          planExpiresAt: storedWithPlan.planExpiresAt,
        },
      },
    });
    expect(withPlan.planId).toBe('plan_pro');

    const unsubscribed = applyHydratedUser({
      sessionUser: session,
      stored: storedWithPlan,
      me: {
        ok: true,
        user: {
          _id: 'u1',
          name: 'Ada',
          email: 'ada@example.com',
        },
      },
    });
    expect(unsubscribed.planId).toBeUndefined();
    expect(hasActivePlan(unsubscribed)).toBe(false);
  });
});

describe('canStream', () => {
  it('lets ADMIN through without a plan, like requireActivePlan on the server', () => {
    expect(canStream({ role: 'ADMIN' })).toBe(true);
    expect(canStream({ role: 'admin', planExpiresAt: Date.now() - 1000 })).toBe(true);
  });

  it('requires an unexpired plan for everyone else', () => {
    expect(canStream({ role: 'user', planExpiresAt: Date.now() + 60_000 })).toBe(true);
    expect(canStream({ role: 'user', planExpiresAt: Date.now() - 60_000 })).toBe(false);
    expect(canStream({ role: 'USER' })).toBe(false);
    expect(canStream(null)).toBe(false);
  });
});
