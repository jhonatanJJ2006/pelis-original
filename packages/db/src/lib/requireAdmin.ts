import { prisma } from '../client';

export class AuthError extends Error {
  constructor(
    message: string,
    public readonly status: number = 401
  ) {
    super(message);
  }
}

export type RequestCtx = {
  userId: string | null;
  isAdmin: boolean;
};

export function requireUser(ctx: RequestCtx): string {
  if (!ctx.userId) throw new AuthError('No autenticado', 401);
  return ctx.userId;
}

export async function requireAdmin(
  ctx: RequestCtx
): Promise<{ userId: string; email: string; name: string }> {
  if (!ctx.userId) throw new AuthError('No autenticado', 401);
  const user = await prisma.user.findUnique({ where: { id: ctx.userId } });
  if (!user || user.role !== 'ADMIN') {
    throw new AuthError('Requiere rol admin', 403);
  }
  return { userId: user.id, email: user.email, name: user.name };
}

export async function isAdmin(ctx: RequestCtx): Promise<boolean> {
  if (!ctx.userId) return false;
  const user = await prisma.user.findUnique({
    where: { id: ctx.userId },
    select: { role: true },
  });
  return user?.role === 'ADMIN';
}

/** Same “active” meaning as users.me + client hasActivePlan: ACTIVE and endDate in the future. */
export async function hasActivePlan(userId: string, now = Date.now()): Promise<boolean> {
  const subscription = await prisma.subscription.findFirst({
    where: { userId, status: 'ACTIVE', endDate: { gt: new Date(now) } },
    orderBy: { endDate: 'desc' },
  });
  return !!subscription;
}

/** Session required. ADMIN is allowed through; regular users need an active plan. */
export async function requireActivePlan(ctx: RequestCtx): Promise<string> {
  const userId = requireUser(ctx);
  if (ctx.isAdmin || (await isAdmin(ctx))) return userId;
  if (await hasActivePlan(userId)) return userId;
  throw new AuthError('Requiere plan activo', 403);
}
