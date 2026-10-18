import { randomBytes, webcrypto } from 'node:crypto';
import { beforeEach, describe, expect, it, vi } from 'vitest';

type Row = {
  id: string;
  code: string;
  deviceId: string;
  status: 'PENDING' | 'APPROVED' | 'CLAIMED' | 'EXPIRED';
  userId: string | null;
  userAgent: string | null;
  expiresAt: Date;
  approvedAt: Date | null;
  claimedAt: Date | null;
};

const rows: Row[] = [];

vi.mock('../client', () => ({
  prisma: {
    tvPairing: {
      create: async ({ data }: { data: Omit<Row, 'id' | 'claimedAt'> }) => {
        if (rows.some((r) => r.code === data.code))
          throw Object.assign(new Error('dup'), { code: 'P2002' });
        const row: Row = { id: String(rows.length + 1), claimedAt: null, ...data };
        rows.push(row);
        return row;
      },
      updateMany: async ({
        where,
        data,
      }: {
        where: { code: string; deviceId: string; status: Row['status']; expiresAt: { gt: Date } };
        data: Partial<Row>;
      }) => {
        const hits = rows.filter(
          (r) =>
            r.code === where.code &&
            r.deviceId === where.deviceId &&
            r.status === where.status &&
            r.expiresAt.getTime() > where.expiresAt.gt.getTime()
        );
        hits.forEach((r) => Object.assign(r, data));
        return { count: hits.length };
      },
      findUnique: async ({ where }: { where: { code: string } }) =>
        rows.find((r) => r.code === where.code) ?? null,
    },
  },
}));

const {
  APP_AUTH_CODE_TTL_MS,
  buildAppAuthCompletePath,
  buildAppCallbackUrl,
  buildAppIntentUrl,
  createAppAuthCode,
  exchangeAppAuthCode,
  isAppAuthToken,
  pkceChallenge,
} = await import('./app-auth');

const token = () => randomBytes(32).toString('base64url');

function setup() {
  const state = token();
  const verifier = token();
  return { state, verifier, challenge: pkceChallenge(verifier) };
}

beforeEach(() => {
  rows.length = 0;
});

describe('app-auth helpers', () => {
  it('valida el formato base64url de 43-128 caracteres', () => {
    expect(isAppAuthToken(token())).toBe(true);
    expect(isAppAuthToken('corto')).toBe(false);
    expect(isAppAuthToken('a'.repeat(129))).toBe(false);
    expect(isAppAuthToken(`${'a'.repeat(42)}=`)).toBe(false);
    expect(isAppAuthToken(undefined)).toBe(false);
  });

  it('calcula el challenge PKCE S256 (base64url de SHA-256, sin relleno)', async () => {
    const verifier = token();
    const digest = await webcrypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier));
    const expected = Buffer.from(digest).toString('base64url');
    expect(pkceChallenge(verifier)).toBe(expected);
    expect(pkceChallenge(verifier)).not.toContain('=');
  });

  it('arma el deep link, la URL intent y la ruta de retorno', () => {
    expect(buildAppCallbackUrl('C', 'S')).toBe('pro.verpelis.app://auth/callback?code=C&state=S');
    expect(buildAppIntentUrl('C', 'S')).toBe(
      'intent://auth/callback?code=C&state=S#Intent;scheme=pro.verpelis.app;package=pro.verpelis.app.native;end'
    );
    expect(buildAppAuthCompletePath('S', 'X')).toBe(
      '/api/app-auth/google/complete?state=S&challenge=X'
    );
  });

  it('el TTL no supera 2 minutos', () => {
    expect(APP_AUTH_CODE_TTL_MS).toBeLessThanOrEqual(2 * 60 * 1000);
  });
});

describe('createAppAuthCode / exchangeAppAuthCode', () => {
  it('canjea una vez con state + verifier correctos y devuelve el usuario', async () => {
    const { state, verifier, challenge } = setup();
    const { code, expiresAt } = await createAppAuthCode({ userId: 'u1', state, challenge });
    expect(isAppAuthToken(code)).toBe(true);
    expect(expiresAt.getTime() - Date.now()).toBeLessThanOrEqual(APP_AUTH_CODE_TTL_MS);
    await expect(exchangeAppAuthCode({ code, state, verifier })).resolves.toEqual({ userId: 'u1' });
  });

  it('no guarda el código en claro ni el state', async () => {
    const { state, challenge } = setup();
    const { code } = await createAppAuthCode({ userId: 'u1', state, challenge });
    expect(rows).toHaveLength(1);
    expect(rows[0]!.code).not.toContain(code);
    expect(rows[0]!.deviceId).not.toContain(state);
    expect(rows[0]!.status).toBe('APPROVED');
  });

  it('es de un solo uso', async () => {
    const { state, verifier, challenge } = setup();
    const { code } = await createAppAuthCode({ userId: 'u1', state, challenge });
    await exchangeAppAuthCode({ code, state, verifier });
    await expect(exchangeAppAuthCode({ code, state, verifier })).rejects.toMatchObject({
      status: 400,
    });
  });

  it('rechaza un state distinto', async () => {
    const { state, verifier, challenge } = setup();
    const { code } = await createAppAuthCode({ userId: 'u1', state, challenge });
    await expect(exchangeAppAuthCode({ code, state: token(), verifier })).rejects.toMatchObject({
      status: 400,
    });
    // el intento fallido no consume el código
    await expect(exchangeAppAuthCode({ code, state, verifier })).resolves.toEqual({ userId: 'u1' });
  });

  it('rechaza un verifier que no corresponde al challenge (código interceptado)', async () => {
    const { state, challenge } = setup();
    const { code } = await createAppAuthCode({ userId: 'u1', state, challenge });
    await expect(exchangeAppAuthCode({ code, state, verifier: token() })).rejects.toMatchObject({
      status: 400,
    });
  });

  it('rechaza el código vencido', async () => {
    const { state, verifier, challenge } = setup();
    const now = new Date('2026-10-17T12:00:00Z');
    const { code } = await createAppAuthCode({ userId: 'u1', state, challenge, now });
    const later = new Date(now.getTime() + APP_AUTH_CODE_TTL_MS + 1);
    await expect(exchangeAppAuthCode({ code, state, verifier, now: later })).rejects.toMatchObject({
      status: 400,
    });
  });

  it('rechaza códigos inventados y parámetros mal formados', async () => {
    const { state, verifier } = setup();
    await expect(exchangeAppAuthCode({ code: token(), state, verifier })).rejects.toMatchObject({
      status: 400,
    });
    await expect(exchangeAppAuthCode({ code: 'x', state, verifier })).rejects.toMatchObject({
      status: 400,
    });
    await expect(exchangeAppAuthCode({ code: {}, state: null, verifier })).rejects.toMatchObject({
      status: 400,
    });
  });

  it('exige usuario y parámetros válidos al emitir', async () => {
    const { state, challenge } = setup();
    await expect(createAppAuthCode({ userId: '', state, challenge })).rejects.toMatchObject({
      status: 401,
    });
    await expect(createAppAuthCode({ userId: 'u1', state: 'x', challenge })).rejects.toMatchObject({
      status: 400,
    });
  });
});
