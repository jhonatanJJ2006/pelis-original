import type { User } from './store';

export interface SessionUserLike {
  id: string;
  name: string;
  email: string;
  image?: string | null;
  emailVerified: boolean;
  role?: string | null;
}

export interface MeUserLike {
  _id: string;
  name: string;
  email: string;
  image?: string;
  role?: string;
  emailVerified?: boolean;
  planId?: string;
  planExpiresAt?: number;
}

export function hasActivePlan(
  user: { planExpiresAt?: number } | null | undefined,
  now = Date.now()
): boolean {
  return !!(user?.planExpiresAt && user.planExpiresAt > now);
}

/**
 * Same rule as the server's requireActivePlan: ADMIN always streams, everyone
 * else needs a plan that has not expired. users.me returns "ADMIN"; the
 * session store holds "admin".
 */
export function canStream(
  user: { role?: string | null; planExpiresAt?: number } | null | undefined,
  now = Date.now()
): boolean {
  if (!user) return false;
  if (String(user.role ?? '').toUpperCase() === 'ADMIN') return true;
  return hasActivePlan(user, now);
}

function roleFrom(value?: string | null): User['role'] {
  return (value ?? 'USER').toString().toUpperCase() === 'ADMIN' ? 'admin' : 'user';
}

export function sessionFallbackUser(sessionUser: SessionUserLike): User {
  return {
    _id: sessionUser.id,
    name: sessionUser.name ?? 'User',
    email: sessionUser.email ?? '',
    image: sessionUser.image ?? undefined,
    role: roleFrom(sessionUser.role),
  };
}

export function mergeStoredAndSession(stored: User | null, sessionUser: SessionUserLike): User {
  const fromSession = sessionFallbackUser(sessionUser);
  if (!stored || stored._id !== fromSession._id) return fromSession;
  return {
    ...fromSession,
    planId: stored.planId,
    planExpiresAt: stored.planExpiresAt,
    role: stored.role === 'admin' || fromSession.role === 'admin' ? 'admin' : 'user',
  };
}

export function toAppUser(sessionUser: SessionUserLike, me?: MeUserLike | null): User {
  const role = roleFrom(me?.role ?? sessionUser.role);
  return {
    _id: me?._id ?? sessionUser.id,
    name: me?.name ?? sessionUser.name ?? 'User',
    email: me?.email ?? sessionUser.email ?? '',
    image: me?.image ?? sessionUser.image ?? undefined,
    role,
    planId: me?.planId,
    planExpiresAt: me?.planExpiresAt,
  };
}

export function storedAsMe(stored: User | null): MeUserLike | undefined {
  if (!stored) return undefined;
  return {
    _id: stored._id,
    name: stored.name,
    email: stored.email,
    image: stored.image,
    role: stored.role === 'admin' ? 'ADMIN' : 'USER',
    planId: stored.planId,
    planExpiresAt: stored.planExpiresAt,
  };
}

/**
 * UI user for playback/auth gates.
 * Session wins when present (plan is kept from the store).
 * If the session snapshot is empty, keep last-known-good from the store.
 * Confirmed logout is `clearUser()` in AuthSessionSync / logout().
 */
export function resolveUseUser(opts: {
  sessionUser: SessionUserLike | null;
  storedUser: User | null;
}): User | null {
  if (opts.sessionUser) {
    return mergeStoredAndSession(opts.storedUser, opts.sessionUser);
  }
  return opts.storedUser;
}

export type SessionSyncDecision = { action: 'keep' } | { action: 'clear' } | { action: 'hydrate' };

/**
 * Decide how to sync the zustand user from a Better Auth session snapshot.
 * Failed refetch (`sessionError`) and a later empty snapshot after we already
 * saw a live session are treated as transient — do not log the user out.
 */
export function decideSessionSync(opts: {
  isPending: boolean;
  sessionUserId?: string | null;
  sessionError?: unknown;
  hadLiveSession: boolean;
}): SessionSyncDecision {
  if (opts.isPending) return { action: 'keep' };
  if (!opts.sessionUserId) {
    if (opts.sessionError || opts.hadLiveSession) return { action: 'keep' };
    return { action: 'clear' };
  }
  return { action: 'hydrate' };
}

export type MeFetchResult = { ok: true; user: MeUserLike } | { ok: false };

/**
 * Build the store user after a session hydrate.
 * - No me result yet, or me fetch failed: keep last-known-good plan for the same user.
 * - Successful me fetch: apply server plan, including a genuine missing/expired plan.
 */
export function applyHydratedUser(opts: {
  sessionUser: SessionUserLike;
  stored: User | null;
  me?: MeFetchResult;
}): User {
  const sameUser = Boolean(opts.stored && opts.stored._id === opts.sessionUser.id);
  const preserved = sameUser ? storedAsMe(opts.stored) : undefined;
  if (!opts.me || !opts.me.ok) {
    return toAppUser(opts.sessionUser, preserved);
  }
  return toAppUser(opts.sessionUser, opts.me.user);
}
