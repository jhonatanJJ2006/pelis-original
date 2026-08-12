import { z } from 'zod';
import { prisma } from '../client.js';
import { register } from '../registry.js';

export const me = register({
  kind: 'query',
  name: 'users.me',
  reads: ['user', 'subscription'],
  args: z.object({}).optional(),
  handler: async (ctx) => {
    if (!ctx.userId) return null;
    const user = await prisma.user.findUnique({ where: { id: ctx.userId } });
    if (!user) return null;
    const subscription = await prisma.subscription.findFirst({
      where: { userId: ctx.userId, status: 'ACTIVE' },
    });
    const endDate = subscription?.endDate.getTime();
    const hasValidExpiry = typeof endDate === 'number' && Number.isFinite(endDate) && endDate > 0;
    return {
      _id: user.id,
      name: user.name,
      email: user.email,
      image: undefined,
      role: user.role as 'USER' | 'ADMIN',
      emailVerified: user.emailVerified,
      planId: subscription?.planId,
      planExpiresAt: hasValidExpiry ? endDate : undefined,
    };
  },
});

export const getByEmail = register({
  kind: 'query',
  name: 'users.getByEmail',
  reads: ['user'],
  args: z.object({ email: z.string() }),
  handler: async (_ctx, { email }) => {
    return prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  },
});

export const setOtp = register({
  kind: 'mutation',
  name: 'users.setOtp',
  writes: ['user'],
  args: z.object({
    userId: z.string(),
    email: z.string(),
    name: z.string().optional(),
    otp: z.string(),
    otpExpiresAt: z.number(),
    otpLastSentAt: z.number(),
  }),
  handler: async (_ctx, args) => {
    const email = args.email.toLowerCase();
    const adminEmails = (process.env.ADMIN_EMAILS ?? '')
      .split(',')
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean);
    const role = adminEmails.includes(email) ? 'ADMIN' : 'USER';

    const existing = await prisma.user.findUnique({ where: { id: args.userId } });
    if (existing) {
      await prisma.user.update({
        where: { id: args.userId },
        data: {
          email,
          name: args.name ?? existing.name,
          otp: args.otp,
          otpExpiresAt: new Date(args.otpExpiresAt),
          otpAttempts: 0,
          otpLastSentAt: new Date(args.otpLastSentAt),
        },
      });
      return;
    }
    await prisma.user.create({
      data: {
        id: args.userId,
        email,
        name: args.name ?? email,
        role,
        emailVerified: false,
        otp: args.otp,
        otpExpiresAt: new Date(args.otpExpiresAt),
        otpAttempts: 0,
        otpLastSentAt: new Date(args.otpLastSentAt),
      },
    });
  },
});

export const verifyOtp = register({
  kind: 'mutation',
  name: 'users.verifyOtp',
  writes: ['user'],
  args: z.object({ email: z.string(), otp: z.string() }),
  handler: async (_ctx, { email, otp }) => {
    const e = email.toLowerCase();
    const user = await prisma.user.findUnique({ where: { email: e } });
    if (!user || !user.otp || !user.otpExpiresAt) {
      return { ok: false as const, status: 400, message: 'Código inválido o expirado' };
    }
    const now = Date.now();
    if (user.otpExpiresAt.getTime() < now) {
      await prisma.user.update({
        where: { id: user.id },
        data: { otp: null, otpExpiresAt: null, otpAttempts: 0, otpLastSentAt: null },
      });
      return { ok: false as const, status: 400, message: 'El código ha expirado. Solicita uno nuevo.' };
    }
    const attempts = user.otpAttempts ?? 0;
    if (attempts >= 3) {
      await prisma.user.update({
        where: { id: user.id },
        data: { otp: null, otpExpiresAt: null, otpAttempts: 0, otpLastSentAt: null },
      });
      return {
        ok: false as const,
        status: 403,
        message: 'Demasiados intentos. Solicita un código nuevo.',
      };
    }
    if (otp !== user.otp) {
      await prisma.user.update({
        where: { id: user.id },
        data: { otpAttempts: { increment: 1 } },
      });
      return { ok: false as const, status: 400, message: 'Código inválido o expirado' };
    }
    await prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerified: true,
        verifiedAt: new Date(),
        otp: null,
        otpExpiresAt: null,
        otpAttempts: 0,
        otpLastSentAt: null,
      },
    });
    return {
      ok: true as const,
      status: 200,
      user: { id: user.id, email: e, emailVerified: true, name: user.name },
    };
  },
});

export const recordLogin = register({
  kind: 'mutation',
  name: 'users.recordLogin',
  writes: ['user'],
  args: z.object({ userId: z.string(), expiresAt: z.number() }),
  handler: async (_ctx, { userId, expiresAt }) => {
    await prisma.user.update({
      where: { id: userId },
      data: {
        lastLoginAt: new Date(),
        lastSessionExpiresAt: new Date(expiresAt),
      },
    });
  },
});

export const upsertUser = register({
  kind: 'mutation',
  name: 'users.upsertUser',
  writes: ['user'],
  args: z.object({
    userId: z.string(),
    email: z.string(),
    name: z.string(),
    emailVerified: z.boolean(),
    verifiedAt: z.number().optional(),
  }),
  handler: async (_ctx, args) => {
    const email = args.email.toLowerCase();
    const adminEmails = (process.env.ADMIN_EMAILS ?? '')
      .split(',')
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean);
    const role = adminEmails.includes(email) ? 'ADMIN' : 'USER';
    const existing = await prisma.user.findUnique({ where: { id: args.userId } });
    if (existing) {
      await prisma.user.update({
        where: { id: args.userId },
        data: {
          email,
          name: args.name,
          emailVerified: args.emailVerified,
          verifiedAt: args.verifiedAt ? new Date(args.verifiedAt) : existing.verifiedAt,
          role: existing.role === 'ADMIN' || role === 'ADMIN' ? 'ADMIN' : existing.role,
        },
      });
      return args.userId;
    }
    await prisma.user.create({
      data: {
        id: args.userId,
        email,
        name: args.name,
        role,
        emailVerified: args.emailVerified,
        verifiedAt: args.verifiedAt ? new Date(args.verifiedAt) : null,
      },
    });
    return args.userId;
  },
});

export const setRole = register({
  kind: 'mutation',
  name: 'users.setRole',
  writes: ['user'],
  args: z.object({
    userId: z.string(),
    role: z.enum(['USER', 'ADMIN']),
  }),
  handler: async (ctx, args) => {
    const adminEmails = (process.env.ADMIN_EMAILS ?? '')
      .split(',')
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean);
    // First user from admin email becomes admin automatically.
    if (!ctx.userId) throw new Error('No autenticado');
    const caller = await prisma.user.findUnique({ where: { id: ctx.userId } });
    if (!caller || caller.role !== 'ADMIN') {
      // Allow bootstrap: if no admin yet and caller's email is in ADMIN_EMAILS, allow it.
      if (!adminEmails.includes(caller?.email ?? '')) {
        throw new Error('Requiere rol admin');
      }
    }
    await prisma.user.update({
      where: { id: args.userId },
      data: { role: args.role },
    });
  },
});