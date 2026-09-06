import { randomBytes } from 'node:crypto';
import { prisma } from '../client';
import { AuthError } from './requireAdmin';
import {
  PAIRING_MAX_CREATE_ATTEMPTS,
  PAIRING_TTL_MS,
  generatePairingCode,
  isPairingCodeShape,
  normalizePairingCode,
  pairingPublicStatus,
} from './tv-pairing-code';

export {
  PAIRING_CODE_ALPHABET,
  PAIRING_CODE_LENGTH,
  PAIRING_MAX_CREATE_ATTEMPTS,
  PAIRING_TTL_MS,
  buildLinkTvUrl,
  formatPairingCode,
  generatePairingCode,
  isPairingCodeShape,
  normalizePairingCode,
  pairingPublicStatus,
} from './tv-pairing-code';
export type { TvPairingPublicStatus } from './tv-pairing-code';

function newDeviceId(): string {
  return randomBytes(16).toString('hex');
}

function randomCode(): string {
  return generatePairingCode(randomBytes(PAIRING_MAX_CREATE_ATTEMPTS + 6));
}

export async function createTvPairing(input: {
  deviceId?: string;
  userAgent?: string | null;
  now?: Date;
}) {
  const now = input.now ?? new Date();
  const deviceId = input.deviceId?.trim() || newDeviceId();
  const expiresAt = new Date(now.getTime() + PAIRING_TTL_MS);

  await prisma.tvPairing.updateMany({
    where: { deviceId, status: 'PENDING', expiresAt: { lte: now } },
    data: { status: 'EXPIRED' },
  });

  for (let attempt = 0; attempt < PAIRING_MAX_CREATE_ATTEMPTS; attempt++) {
    const code = randomCode();
    try {
      const row = await prisma.tvPairing.create({
        data: {
          code,
          deviceId,
          userAgent: input.userAgent ?? null,
          expiresAt,
        },
      });
      return row;
    } catch (err) {
      const codeClash =
        err &&
        typeof err === 'object' &&
        'code' in err &&
        (err as { code?: string }).code === 'P2002';
      if (!codeClash || attempt === PAIRING_MAX_CREATE_ATTEMPTS - 1) throw err;
    }
  }

  throw new Error('No se pudo crear un código de emparejamiento');
}

export async function getTvPairingForDevice(input: { code: string; deviceId: string; now?: Date }) {
  const code = normalizePairingCode(input.code);
  const deviceId = input.deviceId.trim();
  if (!isPairingCodeShape(code) || !deviceId) return null;

  const row = await prisma.tvPairing.findUnique({ where: { code } });
  if (!row || row.deviceId !== deviceId) return null;

  const now = input.now ?? new Date();
  const status = pairingPublicStatus(row.status, row.expiresAt, now);
  if (status === 'expired' && row.status === 'PENDING') {
    await prisma.tvPairing.update({
      where: { id: row.id },
      data: { status: 'EXPIRED' },
    });
  }
  return { ...row, publicStatus: status };
}

export async function approveTvPairing(input: { code: string; userId: string; now?: Date }) {
  const userId = input.userId.trim();
  if (!userId) throw new AuthError('No autenticado', 401);

  const code = normalizePairingCode(input.code);
  if (!isPairingCodeShape(code)) {
    throw new AuthError('Código inválido', 400);
  }

  const now = input.now ?? new Date();
  const row = await prisma.tvPairing.findUnique({ where: { code } });
  if (!row) throw new AuthError('Código no encontrado', 404);

  const status = pairingPublicStatus(row.status, row.expiresAt, now);
  if (status === 'expired')
    throw new AuthError('El código expiró. Genera uno nuevo en la tele.', 410);
  if (status === 'claimed') throw new AuthError('Este código ya se usó', 409);
  if (status === 'approved' && row.userId && row.userId !== userId) {
    throw new AuthError('Este código ya está vinculado a otra cuenta', 409);
  }

  if (status === 'approved' && row.userId === userId) {
    return row;
  }

  return prisma.tvPairing.update({
    where: { id: row.id },
    data: { status: 'APPROVED', userId, approvedAt: now },
  });
}

export async function claimTvPairing(input: { code: string; deviceId: string; now?: Date }) {
  const code = normalizePairingCode(input.code);
  const deviceId = input.deviceId.trim();
  if (!isPairingCodeShape(code) || !deviceId) {
    throw new AuthError('Código o dispositivo inválido', 400);
  }

  const now = input.now ?? new Date();
  const row = await prisma.tvPairing.findUnique({ where: { code } });
  if (!row || row.deviceId !== deviceId) {
    throw new AuthError('Código no encontrado', 404);
  }

  const status = pairingPublicStatus(row.status, row.expiresAt, now);
  if (status === 'expired') throw new AuthError('El código expiró', 410);
  if (status === 'pending') throw new AuthError('Todavía no se aprobó en el móvil', 409);
  if (status === 'claimed') throw new AuthError('Este código ya se usó', 409);
  if (!row.userId) throw new AuthError('El emparejamiento no tiene usuario', 409);

  return prisma.tvPairing.update({
    where: { id: row.id },
    data: { status: 'CLAIMED', claimedAt: now },
  });
}
