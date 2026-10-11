/**
 * Límite de envíos del código de acceso.
 * - Por correo: 1 envío cada 60 s y máximo 5 por hora.
 * - Por IP: máximo 20 por hora.
 *
 * Los eventos se guardan en Postgres (`RateLimitHit`) para que el límite sea el
 * mismo en todos los procesos de Next (cluster). `decideLoginCodeRateLimit` es
 * la lógica pura; `LoginCodeRateLimiter` la usa en memoria (tests y respaldo).
 */
export const EMAIL_COOLDOWN_MS = 60_000;
export const EMAIL_MAX_PER_HOUR = 5;
export const IP_MAX_PER_HOUR = 20;
export const HOUR_MS = 3_600_000;

export type RateLimitResult = { ok: true } | { ok: false; retryAfterSec: number };

/** `emailHits` / `ipHits`: marcas de tiempo de la última hora, ascendentes. */
export function decideLoginCodeRateLimit(
  emailHits: number[],
  ipHits: number[],
  now: number
): RateLimitResult {
  const last = emailHits[emailHits.length - 1];
  if (last !== undefined && now - last < EMAIL_COOLDOWN_MS) {
    return { ok: false, retryAfterSec: Math.ceil((EMAIL_COOLDOWN_MS - (now - last)) / 1000) };
  }
  if (emailHits.length >= EMAIL_MAX_PER_HOUR) {
    return { ok: false, retryAfterSec: Math.ceil((emailHits[0]! + HOUR_MS - now) / 1000) };
  }
  if (ipHits.length >= IP_MAX_PER_HOUR) {
    return { ok: false, retryAfterSec: Math.ceil((ipHits[0]! + HOUR_MS - now) / 1000) };
  }
  return { ok: true };
}

export class LoginCodeRateLimiter {
  private byEmail = new Map<string, number[]>();
  private byIp = new Map<string, number[]>();

  check(email: string, ip: string, now = Date.now()): RateLimitResult {
    const emailHits = this.recent(this.byEmail, email, now);
    const ipHits = this.recent(this.byIp, ip, now);
    const result = decideLoginCodeRateLimit(emailHits, ipHits, now);
    if (!result.ok) return result;
    emailHits.push(now);
    ipHits.push(now);
    this.byEmail.set(email, emailHits);
    this.byIp.set(ip, ipHits);
    return result;
  }

  private recent(map: Map<string, number[]>, key: string, now: number): number[] {
    return (map.get(key) ?? []).filter((t) => now - t < HOUR_MS);
  }
}

export const loginCodeRateLimiter = new LoginCodeRateLimiter();

const BUCKET_EMAIL = 'login-code:email';
const BUCKET_IP = 'login-code:ip';

/**
 * Límite compartido entre procesos. Serializa por correo con un advisory lock
 * de la transacción para que dos workers no dejen pasar dos envíos a la vez.
 */
export async function checkLoginCodeRateLimit(
  email: string,
  ip: string,
  now = Date.now()
): Promise<RateLimitResult> {
  const { prisma } = await import('@pelis/db/server');
  const since = new Date(now - HOUR_MS);
  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`login-code:${email}`}))`;
    const [emailRows, ipRows] = await Promise.all([
      tx.rateLimitHit.findMany({
        where: { bucket: BUCKET_EMAIL, key: email, createdAt: { gt: since } },
        orderBy: { createdAt: 'asc' },
        select: { createdAt: true },
      }),
      tx.rateLimitHit.findMany({
        where: { bucket: BUCKET_IP, key: ip, createdAt: { gt: since } },
        orderBy: { createdAt: 'asc' },
        select: { createdAt: true },
      }),
    ]);
    const result = decideLoginCodeRateLimit(
      emailRows.map((r) => r.createdAt.getTime()),
      ipRows.map((r) => r.createdAt.getTime()),
      now
    );
    if (!result.ok) return result;
    const at = new Date(now);
    await tx.rateLimitHit.createMany({
      data: [
        { bucket: BUCKET_EMAIL, key: email, createdAt: at },
        { bucket: BUCKET_IP, key: ip, createdAt: at },
      ],
    });
    // Limpieza oportunista de eventos viejos.
    if (Math.random() < 0.02) {
      await tx.rateLimitHit.deleteMany({ where: { createdAt: { lt: since } } });
    }
    return result;
  });
}

export function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}
