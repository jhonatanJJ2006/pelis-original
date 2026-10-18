import { prisma } from '../client';
import { AuthError } from './requireAdmin';
import {
  APP_AUTH_CODE_TTL_MS,
  APP_AUTH_USER_AGENT,
  appAuthBinding,
  appAuthCodeKey,
  generateAppAuthCode,
  isAppAuthToken,
  pkceChallenge,
} from './app-auth-code';

export * from './app-auth-code';

const INVALID = 'Código inválido o expirado. Vuelve a intentarlo desde la app.';

/**
 * Emite un código de un solo uso para el usuario ya autenticado en el navegador.
 * Reutiliza la tabla de emparejamiento TV: fila APPROVED con el hash del código.
 */
export async function createAppAuthCode(input: {
  userId: string;
  state: string;
  challenge: string;
  now?: Date;
}): Promise<{ code: string; expiresAt: Date }> {
  const userId = input.userId?.trim();
  if (!userId) throw new AuthError('No autenticado', 401);
  if (!isAppAuthToken(input.state) || !isAppAuthToken(input.challenge)) {
    throw new AuthError('Parámetros inválidos', 400);
  }
  const now = input.now ?? new Date();
  const expiresAt = new Date(now.getTime() + APP_AUTH_CODE_TTL_MS);
  const code = generateAppAuthCode();
  await prisma.tvPairing.create({
    data: {
      code: appAuthCodeKey(code),
      deviceId: appAuthBinding(input.state, input.challenge),
      status: 'APPROVED',
      userId,
      userAgent: APP_AUTH_USER_AGENT,
      approvedAt: now,
      expiresAt,
    },
  });
  return { code, expiresAt };
}

/**
 * Canjea el código (una sola vez) si coincide con state + verifier y no venció.
 * El paso APPROVED → CLAIMED es atómico (updateMany con condición), así dos
 * canjes simultáneos no pueden obtener sesión los dos.
 */
export async function exchangeAppAuthCode(input: {
  code: unknown;
  state: unknown;
  verifier: unknown;
  now?: Date;
}): Promise<{ userId: string }> {
  const { code, state, verifier } = input;
  if (!isAppAuthToken(code) || !isAppAuthToken(state) || !isAppAuthToken(verifier)) {
    throw new AuthError(INVALID, 400);
  }
  const now = input.now ?? new Date();
  const key = appAuthCodeKey(code);
  const binding = appAuthBinding(state, pkceChallenge(verifier));

  const result = await prisma.tvPairing.updateMany({
    where: { code: key, deviceId: binding, status: 'APPROVED', expiresAt: { gt: now } },
    data: { status: 'CLAIMED', claimedAt: now },
  });
  if (result.count !== 1) throw new AuthError(INVALID, 400);

  const row = await prisma.tvPairing.findUnique({ where: { code: key } });
  if (!row?.userId) throw new AuthError(INVALID, 400);
  return { userId: row.userId };
}
