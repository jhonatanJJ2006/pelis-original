import { beforeEach, describe, expect, it, vi } from 'vitest';

const db = vi.hoisted(() => ({
  rateLimitHit: { findMany: vi.fn(), create: vi.fn() },
  tvKeyboardSession: {
    create: vi.fn(),
    deleteMany: vi.fn(),
    findUnique: vi.fn(),
    updateMany: vi.fn(),
  },
}));

vi.mock('./client', () => ({ prisma: db }));

import {
  TV_KEYBOARD_CREATE_PER_HOUR,
  TV_KEYBOARD_MAX_TEXT,
  TV_KEYBOARD_MAX_UPDATES,
  buildTvKeyboardUrl,
  createTvKeyboardSession,
  getTvKeyboardSession,
  sanitizeKeyboardText,
  updateTvKeyboardText,
} from './lib/tv-keyboard';
import { isPairingCodeShape } from './lib/tv-pairing-code';

const now = new Date('2026-10-18T20:00:00Z');

beforeEach(() => {
  vi.clearAllMocks();
  db.rateLimitHit.findMany.mockResolvedValue([]);
  db.tvKeyboardSession.create.mockResolvedValue({});
});

describe('sanitizeKeyboardText', () => {
  it('quita caracteres de control y limita el largo', () => {
    expect(sanitizeKeyboardText('  hola\n\tmundo ')).toBe('hola mundo ');
    expect(sanitizeKeyboardText('a'.repeat(200))).toHaveLength(TV_KEYBOARD_MAX_TEXT);
    expect(sanitizeKeyboardText('ñandú 🎬')).toBe('ñandú 🎬');
    expect(sanitizeKeyboardText(42)).toBeNull();
  });

  it('arma la URL del celular', () => {
    expect(buildTvKeyboardUrl('https://verpelis.pro/', 'ABC234')).toBe(
      'https://verpelis.pro/tv-teclado?code=ABC234'
    );
  });
});

describe('createTvKeyboardSession', () => {
  it('crea un código válido de 10 minutos', async () => {
    const res = await createTvKeyboardSession('1.2.3.4', now);
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(isPairingCodeShape(res.code)).toBe(true);
    expect(res.expiresAt.getTime() - now.getTime()).toBe(10 * 60 * 1000);
    expect(db.rateLimitHit.create).toHaveBeenCalledOnce();
  });

  it('limita las sesiones por IP', async () => {
    db.rateLimitHit.findMany.mockResolvedValue(
      Array.from({ length: TV_KEYBOARD_CREATE_PER_HOUR }, () => ({
        createdAt: new Date(now.getTime() - 60_000),
      }))
    );
    const res = await createTvKeyboardSession('1.2.3.4', now);
    expect(res).toEqual({ ok: false, retryAfterSec: 3540 });
    expect(db.tvKeyboardSession.create).not.toHaveBeenCalled();
  });

  it('reintenta si el código ya existe', async () => {
    db.tvKeyboardSession.create.mockRejectedValueOnce({ code: 'P2002' }).mockResolvedValueOnce({});
    const res = await createTvKeyboardSession('1.2.3.4', now);
    expect(res.ok).toBe(true);
    expect(db.tvKeyboardSession.create).toHaveBeenCalledTimes(2);
  });
});

describe('getTvKeyboardSession', () => {
  it('no consulta códigos mal formados y oculta los vencidos', async () => {
    expect(await getTvKeyboardSession('???', now)).toBeNull();
    expect(db.tvKeyboardSession.findUnique).not.toHaveBeenCalled();
    db.tvKeyboardSession.findUnique.mockResolvedValue({
      text: 'x',
      done: false,
      version: 1,
      expiresAt: new Date(now.getTime() - 1),
    });
    expect(await getTvKeyboardSession('ABC234', now)).toBeNull();
  });
});

describe('updateTvKeyboardText', () => {
  it('guarda el texto limpio y sube la versión', async () => {
    db.tvKeyboardSession.updateMany.mockResolvedValue({ count: 1 });
    db.tvKeyboardSession.findUnique.mockResolvedValue({ version: 3 });
    const res = await updateTvKeyboardText('abc 234', 'matrix\n', true, now);
    expect(res).toEqual({ ok: true, version: 3 });
    expect(db.tvKeyboardSession.updateMany).toHaveBeenCalledWith({
      where: { code: 'ABC234', expiresAt: { gt: now }, version: { lt: TV_KEYBOARD_MAX_UPDATES } },
      data: { text: 'matrix ', done: true, version: { increment: 1 } },
    });
  });

  it('rechaza datos no válidos', async () => {
    expect(await updateTvKeyboardText('ABC234', { x: 1 }, false, now)).toEqual({
      ok: false,
      reason: 'invalid',
    });
    expect(await updateTvKeyboardText('A', 'hola', false, now)).toEqual({
      ok: false,
      reason: 'invalid',
    });
    expect(db.tvKeyboardSession.updateMany).not.toHaveBeenCalled();
  });

  it('distingue código vencido y límite de escrituras', async () => {
    db.tvKeyboardSession.updateMany.mockResolvedValue({ count: 0 });
    db.tvKeyboardSession.findUnique.mockResolvedValueOnce(null);
    expect(await updateTvKeyboardText('ABC234', 'a', false, now)).toEqual({
      ok: false,
      reason: 'not_found',
    });
    db.tvKeyboardSession.findUnique.mockResolvedValueOnce({
      expiresAt: new Date(now.getTime() + 60_000),
      version: TV_KEYBOARD_MAX_UPDATES,
    });
    expect(await updateTvKeyboardText('ABC234', 'a', false, now)).toEqual({
      ok: false,
      reason: 'limit',
    });
  });
});
