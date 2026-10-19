import { randomBytes } from 'node:crypto';
import { prisma } from '../client';
import {
  PAIRING_MAX_CREATE_ATTEMPTS,
  generatePairingCode,
  isPairingCodeShape,
  normalizePairingCode,
} from './tv-pairing-code';
import {
  TV_KEYBOARD_CREATE_PER_HOUR,
  TV_KEYBOARD_MAX_UPDATES,
  TV_KEYBOARD_TTL_MS,
  sanitizeKeyboardText,
} from './tv-keyboard-code';

export * from './tv-keyboard-code';

const BUCKET_CREATE = 'tv-keyboard:create';
const HOUR_MS = 3_600_000;

export type TvKeyboardState = { text: string; done: boolean; version: number; expiresAt: Date };

export type TvKeyboardCreateResult =
  { ok: true; code: string; expiresAt: Date } | { ok: false; retryAfterSec: number };

/** Crea una sesión de teclado para la TV. Limitado por IP. */
export async function createTvKeyboardSession(
  ip: string,
  now = new Date()
): Promise<TvKeyboardCreateResult> {
  const since = new Date(now.getTime() - HOUR_MS);
  const hits = await prisma.rateLimitHit.findMany({
    where: { bucket: BUCKET_CREATE, key: ip, createdAt: { gt: since } },
    orderBy: { createdAt: 'asc' },
    select: { createdAt: true },
    take: TV_KEYBOARD_CREATE_PER_HOUR,
  });
  if (hits.length >= TV_KEYBOARD_CREATE_PER_HOUR) {
    const first = hits[0]!.createdAt.getTime();
    return {
      ok: false,
      retryAfterSec: Math.max(1, Math.ceil((first + HOUR_MS - now.getTime()) / 1000)),
    };
  }
  await prisma.rateLimitHit.create({ data: { bucket: BUCKET_CREATE, key: ip, createdAt: now } });
  // Limpieza oportunista de sesiones vencidas.
  if (Math.random() < 0.05) {
    await prisma.tvKeyboardSession.deleteMany({ where: { expiresAt: { lt: now } } });
  }
  const expiresAt = new Date(now.getTime() + TV_KEYBOARD_TTL_MS);
  for (let attempt = 0; attempt < PAIRING_MAX_CREATE_ATTEMPTS; attempt++) {
    const code = generatePairingCode(randomBytes(12));
    try {
      await prisma.tvKeyboardSession.create({ data: { code, expiresAt } });
      return { ok: true, code, expiresAt };
    } catch (err) {
      if ((err as { code?: string })?.code !== 'P2002') throw err;
    }
  }
  throw new Error('No se pudo crear el código');
}

/** Estado actual para la TV, o `null` si el código no existe o venció. */
export async function getTvKeyboardSession(
  rawCode: string,
  now = new Date()
): Promise<TvKeyboardState | null> {
  const code = normalizePairingCode(rawCode);
  if (!isPairingCodeShape(code)) return null;
  const row = await prisma.tvKeyboardSession.findUnique({
    where: { code },
    select: { text: true, done: true, version: true, expiresAt: true },
  });
  if (!row || row.expiresAt <= now) return null;
  return row;
}

export type TvKeyboardUpdateResult =
  { ok: true; version: number } | { ok: false; reason: 'invalid' | 'not_found' | 'limit' };

/** Texto que manda el celular. Sin sesión de usuario: solo el código. */
export async function updateTvKeyboardText(
  rawCode: string,
  rawText: unknown,
  done: boolean,
  now = new Date()
): Promise<TvKeyboardUpdateResult> {
  const code = normalizePairingCode(rawCode);
  const text = sanitizeKeyboardText(rawText);
  if (!isPairingCodeShape(code) || text === null) return { ok: false, reason: 'invalid' };
  const res = await prisma.tvKeyboardSession.updateMany({
    where: { code, expiresAt: { gt: now }, version: { lt: TV_KEYBOARD_MAX_UPDATES } },
    data: { text, done, version: { increment: 1 } },
  });
  if (res.count === 1) {
    const row = await prisma.tvKeyboardSession.findUnique({
      where: { code },
      select: { version: true },
    });
    return { ok: true, version: row?.version ?? 0 };
  }
  const row = await prisma.tvKeyboardSession.findUnique({
    where: { code },
    select: { expiresAt: true, version: true },
  });
  if (!row || row.expiresAt <= now) return { ok: false, reason: 'not_found' };
  return { ok: false, reason: 'limit' };
}
