import { prisma } from '../client.js';

export class AuthError extends Error {
  constructor(message: string, public readonly status: number = 401) {
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

export async function requireAdmin(ctx: RequestCtx): Promise<{ userId: string; email: string; name: string }> {
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