import { mutation, query, internalMutation } from './_generated/server';
import { v } from 'convex/values';
import { components } from './_generated/api';

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS ?? '')
  .split(',')
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

export const purgeVerificationTable = internalMutation({
  args: {},
  handler: async (ctx) => {
    await ctx.runMutation(components.betterAuth.adapter.deleteMany, {
      input: { model: 'verification' },
      paginationOpts: { cursor: null, numItems: 10000 },
    } as any);
  },
});

export const me = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const user = await ctx.db
      .query('users')
      .withIndex('by_userId', (q) => q.eq('userId', identity.subject))
      .first();

    const subscription = await ctx.db
      .query('subscriptions')
      .withIndex('by_user', (q) => q.eq('userId', identity.subject))
      .filter((q) => q.eq(q.field('status'), 'active'))
      .first();

    const endDate = subscription?.endDate;
    const hasValidExpiry =
      typeof endDate === 'number' && Number.isFinite(endDate) && endDate > 0;

    return {
      _id: identity.subject,
      name: identity.name ?? user?.name ?? 'User',
      email: identity.email ?? user?.email ?? '',
      image: identity.pictureUrl ?? undefined,
      role: user?.role ?? 'user',
      emailVerified: user?.emailVerified ?? false,
      planId: subscription?.planId,
      planExpiresAt: hasValidExpiry ? endDate : undefined,
    };
  },
});

export const upsertUser = mutation({
  args: {
    userId: v.string(),
    email: v.string(),
    name: v.string(),
    emailVerified: v.boolean(),
    verifiedAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const email = args.email.toLowerCase();
    const existing = await ctx.db
      .query('users')
      .withIndex('by_userId', (q) => q.eq('userId', args.userId))
      .first();
    const now = Date.now();

    if (existing) {
      await ctx.db.patch(existing._id, {
        email,
        name: args.name,
        emailVerified: args.emailVerified,
        verifiedAt: args.verifiedAt ?? existing.verifiedAt,
        role: ADMIN_EMAILS.includes(email) ? 'admin' : existing.role,
        updatedAt: now,
      });
      return existing._id;
    }

    return await ctx.db.insert('users', {
      userId: args.userId,
      email,
      name: args.name,
      role: ADMIN_EMAILS.includes(email) ? 'admin' : 'user',
      emailVerified: args.emailVerified,
      verifiedAt: args.verifiedAt,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const getByEmail = query({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query('users')
      .withIndex('by_email', (q) => q.eq('email', args.email.toLowerCase()))
      .first();
  },
});

export const setOtp = mutation({
  args: {
    userId: v.string(),
    email: v.string(),
    name: v.optional(v.string()),
    otp: v.string(),
    otpExpiresAt: v.number(),
    otpLastSentAt: v.number(),
  },
  handler: async (ctx, args) => {
    const email = args.email.toLowerCase();
    const existing = await ctx.db
      .query('users')
      .withIndex('by_userId', (q) => q.eq('userId', args.userId))
      .first();
    const now = Date.now();

    if (existing) {
      await ctx.db.patch(existing._id, {
        email,
        name: args.name ?? existing.name,
        otp: args.otp,
        otpExpiresAt: args.otpExpiresAt,
        otpAttempts: 0,
        otpLastSentAt: args.otpLastSentAt,
        updatedAt: now,
      });
      return;
    }

    await ctx.db.insert('users', {
      userId: args.userId,
      email,
      name: args.name ?? email,
      role: ADMIN_EMAILS.includes(email) ? 'admin' : 'user',
      emailVerified: false,
      otp: args.otp,
      otpExpiresAt: args.otpExpiresAt,
      otpAttempts: 0,
      otpLastSentAt: args.otpLastSentAt,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const verifyOtp = mutation({
  args: { email: v.string(), otp: v.string() },
  handler: async (ctx, args) => {
    const email = args.email.toLowerCase();
    const user = await ctx.db
      .query('users')
      .withIndex('by_email', (q) => q.eq('email', email))
      .first();

    if (!user || !user.otp || !user.otpExpiresAt) {
      return { ok: false, status: 400, message: 'Código inválido o expirado' };
    }

    const now = Date.now();
    if (now > user.otpExpiresAt) {
      await ctx.db.patch(user._id, {
        otp: undefined,
        otpExpiresAt: undefined,
        otpAttempts: undefined,
        otpLastSentAt: undefined,
        updatedAt: now,
      });
      return { ok: false, status: 400, message: 'El código ha expirado. Solicita uno nuevo.' };
    }

    const attempts = user.otpAttempts ?? 0;
    if (attempts >= 3) {
      await ctx.db.patch(user._id, {
        otp: undefined,
        otpExpiresAt: undefined,
        otpAttempts: undefined,
        otpLastSentAt: undefined,
        updatedAt: now,
      });
      return {
        ok: false,
        status: 403,
        message: 'Demasiados intentos. Solicita un código nuevo.',
      };
    }

    if (args.otp !== user.otp) {
      await ctx.db.patch(user._id, {
        otpAttempts: attempts + 1,
        updatedAt: now,
      });
      return { ok: false, status: 400, message: 'Código inválido o expirado' };
    }

    await ctx.db.patch(user._id, {
      emailVerified: true,
      verifiedAt: now,
      otp: undefined,
      otpExpiresAt: undefined,
      otpAttempts: undefined,
      otpLastSentAt: undefined,
      updatedAt: now,
    });

    await ctx.runMutation(components.betterAuth.adapter.updateMany, {
      input: {
        model: 'user',
        update: { emailVerified: true, updatedAt: now },
        where: [{ field: 'email', operator: 'eq', value: email }],
      },
      paginationOpts: { cursor: null, numItems: 10 },
    } as any);

    return {
      ok: true,
      status: 200,
      user: {
        id: user.userId,
        email,
        emailVerified: true,
        name: user.name,
      },
    };
  },
});

export const recordLogin = mutation({
  args: { userId: v.string(), expiresAt: v.number() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query('users')
      .withIndex('by_userId', (q) => q.eq('userId', args.userId))
      .first();
    if (!user) return;
    await ctx.db.patch(user._id, {
      lastLoginAt: Date.now(),
      lastSessionExpiresAt: args.expiresAt,
      updatedAt: Date.now(),
    });
  },
});

export const setRole = mutation({
  args: { userId: v.string(), role: v.union(v.literal('user'), v.literal('admin')) },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error('No autenticado');

    const caller = await ctx.db
      .query('users')
      .withIndex('by_userId', (q) => q.eq('userId', identity.subject))
      .first();
    if (!caller || caller.role !== 'admin') throw new Error('Requiere rol admin');

    const target = await ctx.db
      .query('users')
      .withIndex('by_userId', (q) => q.eq('userId', args.userId))
      .first();
    if (!target) throw new Error('Usuario no encontrado');

    await ctx.db.patch(target._id, { role: args.role, updatedAt: Date.now() });
  },
});
