import type { MutationCtx, QueryCtx } from '../_generated/server';

type AuthCtx = Pick<QueryCtx, 'auth' | 'db'> | Pick<MutationCtx, 'auth' | 'db'>;

export async function requireAdmin(ctx: AuthCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error('No autenticado');

  const user = await ctx.db
    .query('users')
    .withIndex('by_userId', (q) => q.eq('userId', identity.subject))
    .first();

  if (!user || user.role !== 'admin') {
    throw new Error('Requiere rol admin');
  }

  return user;
}

export async function isAdmin(ctx: AuthCtx): Promise<boolean> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) return false;

  const user = await ctx.db
    .query('users')
    .withIndex('by_userId', (q) => q.eq('userId', identity.subject))
    .first();

  return user?.role === 'admin';
}
