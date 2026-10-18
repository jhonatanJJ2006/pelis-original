import { createSign, generateKeyPairSync, type KeyObject } from 'node:crypto';
import { beforeEach, describe, expect, it, vi } from 'vitest';

type Row = {
  code: string;
  deviceId: string;
  status: 'PENDING' | 'APPROVED' | 'CLAIMED' | 'EXPIRED';
  userAgent: string | null;
  expiresAt: Date;
  claimedAt?: Date | null;
};

const rows: Row[] = [];

vi.mock('../client', () => ({
  prisma: {
    tvPairing: {
      create: async ({ data }: { data: Row }) => {
        if (rows.some((r) => r.code === data.code))
          throw Object.assign(new Error('dup'), { code: 'P2002' });
        rows.push({ ...data });
        return data;
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
    },
  },
}));

const { createGoogleNonce, consumeGoogleNonce, googleNonceKey, signInWithGoogleIdToken } =
  await import('./app-auth-google');
const { verifyGoogleIdToken, GoogleIdTokenError } = await import('./google-id-token');
const { AuthError } = await import('./requireAdmin');

const WEB_CLIENT = '651974862711-web.apps.googleusercontent.com';
const ANDROID_CLIENT = '651974862711-android.apps.googleusercontent.com';
const NOW = new Date('2026-10-18T03:00:00Z');
const nowS = Math.floor(NOW.getTime() / 1000);

const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
const other = generateKeyPairSync('rsa', { modulusLength: 2048 });
const KID = 'test-kid';
const getKey = async (kid: string): Promise<KeyObject | null> => (kid === KID ? publicKey : null);

function sign(
  payload: Record<string, unknown>,
  opts: { key?: KeyObject; kid?: string; alg?: string } = {}
) {
  const header = { alg: opts.alg ?? 'RS256', kid: opts.kid ?? KID, typ: 'JWT' };
  const h = Buffer.from(JSON.stringify(header)).toString('base64url');
  const p = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const s = createSign('RSA-SHA256')
    .update(`${h}.${p}`)
    .sign(opts.key ?? privateKey);
  return `${h}.${p}.${s.toString('base64url')}`;
}

function claims(over: Record<string, unknown> = {}) {
  return {
    iss: 'https://accounts.google.com',
    aud: WEB_CLIENT,
    azp: ANDROID_CLIENT,
    sub: '1234567890',
    email: 'Ana@Example.com',
    email_verified: true,
    name: 'Ana',
    iat: nowS - 10,
    exp: nowS + 3600,
    ...over,
  };
}

beforeEach(() => {
  rows.length = 0;
});

async function reason(p: Promise<unknown>) {
  try {
    await p;
  } catch (e) {
    return e instanceof GoogleIdTokenError ? e.reason : String(e);
  }
  return 'ok';
}

describe('verifyGoogleIdToken', () => {
  const opts = { audience: WEB_CLIENT, now: NOW, getKey };

  it('acepta un token válido y normaliza el correo', async () => {
    const c = await verifyGoogleIdToken(sign(claims({ nonce: 'n1' })), { ...opts, nonce: 'n1' });
    expect(c).toMatchObject({ sub: '1234567890', email: 'ana@example.com', emailVerified: true });
  });

  it('acepta el emisor sin https', async () => {
    expect(
      await reason(verifyGoogleIdToken(sign(claims({ iss: 'accounts.google.com' })), opts))
    ).toBe('ok');
  });

  it('rechaza aud distinto del client id web (p. ej. el client id Android)', async () => {
    expect(await reason(verifyGoogleIdToken(sign(claims({ aud: ANDROID_CLIENT })), opts))).toBe(
      'aud'
    );
    expect(await reason(verifyGoogleIdToken(sign(claims({ aud: [WEB_CLIENT] })), opts))).toBe(
      'aud'
    );
  });

  it('rechaza token expirado (más allá de la tolerancia de reloj)', async () => {
    expect(await reason(verifyGoogleIdToken(sign(claims({ exp: nowS - 61 })), opts))).toBe('exp');
    expect(await reason(verifyGoogleIdToken(sign(claims({ exp: undefined })), opts))).toBe('exp');
  });

  it('rechaza iat en el futuro', async () => {
    expect(await reason(verifyGoogleIdToken(sign(claims({ iat: nowS + 600 })), opts))).toBe('iat');
  });

  it('rechaza nonce distinto o ausente', async () => {
    expect(
      await reason(verifyGoogleIdToken(sign(claims({ nonce: 'otro' })), { ...opts, nonce: 'n1' }))
    ).toBe('nonce');
    expect(await reason(verifyGoogleIdToken(sign(claims()), { ...opts, nonce: 'n1' }))).toBe(
      'nonce'
    );
  });

  it('rechaza correo no verificado', async () => {
    expect(await reason(verifyGoogleIdToken(sign(claims({ email_verified: false })), opts))).toBe(
      'email'
    );
    expect(
      await reason(verifyGoogleIdToken(sign(claims({ email_verified: undefined })), opts))
    ).toBe('email');
  });

  it('rechaza emisor, firma, alg o kid inválidos', async () => {
    expect(
      await reason(verifyGoogleIdToken(sign(claims({ iss: 'https://evil.example' })), opts))
    ).toBe('iss');
    expect(await reason(verifyGoogleIdToken(sign(claims(), { key: other.privateKey }), opts))).toBe(
      'signature'
    );
    expect(await reason(verifyGoogleIdToken(sign(claims(), { alg: 'HS256' }), opts))).toBe('alg');
    expect(await reason(verifyGoogleIdToken(sign(claims(), { kid: 'nope' }), opts))).toBe('key');
    expect(await reason(verifyGoogleIdToken('abc', opts))).toBe('malformed');
    expect(await reason(verifyGoogleIdToken(undefined, opts))).toBe('malformed');
  });
});

describe('nonce de un solo uso', () => {
  it('se guarda solo el hash y se consume una vez', async () => {
    const { nonce } = await createGoogleNonce(NOW);
    expect(rows).toHaveLength(1);
    expect(rows[0]!.code).toBe(googleNonceKey(nonce));
    expect(rows[0]!.code).not.toContain(nonce);
    expect(await consumeGoogleNonce(nonce, NOW)).toBe(true);
    expect(await consumeGoogleNonce(nonce, NOW)).toBe(false);
  });

  it('vence a los 10 minutos', async () => {
    const { nonce } = await createGoogleNonce(NOW);
    expect(await consumeGoogleNonce(nonce, new Date(NOW.getTime() + 10 * 60 * 1000 + 1))).toBe(
      false
    );
  });
});

describe('signInWithGoogleIdToken', () => {
  const resolveUser = vi.fn(async () => 'user-1');
  const base = { audience: WEB_CLIENT, now: NOW, getKey, resolveUser };

  beforeEach(() => resolveUser.mockClear());

  async function status(p: Promise<unknown>) {
    try {
      await p;
      return 200;
    } catch (e) {
      return e instanceof AuthError ? e.status : 500;
    }
  }

  it('crea la sesión con nonce emitido por el servidor', async () => {
    const { nonce } = await createGoogleNonce(NOW);
    const r = await signInWithGoogleIdToken({ ...base, idToken: sign(claims({ nonce })) });
    expect(r).toEqual({ userId: 'user-1', email: 'ana@example.com' });
    expect(resolveUser).toHaveBeenCalledWith(
      expect.objectContaining({ sub: '1234567890', email: 'ana@example.com' })
    );
  });

  it('rechaza reutilizar el mismo token/nonce (replay)', async () => {
    const { nonce } = await createGoogleNonce(NOW);
    const idToken = sign(claims({ nonce }));
    expect(await status(signInWithGoogleIdToken({ ...base, idToken }))).toBe(200);
    expect(await status(signInWithGoogleIdToken({ ...base, idToken }))).toBe(401);
  });

  it('rechaza nonce no emitido por el servidor', async () => {
    const idToken = sign(claims({ nonce: 'x'.repeat(43) }));
    expect(await status(signInWithGoogleIdToken({ ...base, idToken }))).toBe(401);
    expect(resolveUser).not.toHaveBeenCalled();
  });

  it('rechaza aud incorrecto, expirado o correo sin verificar sin gastar el nonce', async () => {
    const { nonce } = await createGoogleNonce(NOW);
    for (const bad of [{ aud: ANDROID_CLIENT }, { exp: nowS - 3600 }, { email_verified: false }]) {
      expect(
        await status(signInWithGoogleIdToken({ ...base, idToken: sign(claims({ nonce, ...bad })) }))
      ).toBe(401);
    }
    expect(resolveUser).not.toHaveBeenCalled();
    expect(
      await status(signInWithGoogleIdToken({ ...base, idToken: sign(claims({ nonce })) }))
    ).toBe(200);
  });

  it('503 si no hay client id web configurado', async () => {
    expect(await status(signInWithGoogleIdToken({ ...base, audience: '', idToken: 'a.b.c' }))).toBe(
      503
    );
  });
});
