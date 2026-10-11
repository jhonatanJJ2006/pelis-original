/**
 * Límite de envíos del código de acceso, en memoria (un solo proceso de Next en el servidor).
 * - Por correo: 1 envío cada 60 s y máximo 5 por hora.
 * - Por IP: máximo 20 por hora.
 */
export const EMAIL_COOLDOWN_MS = 60_000;
export const EMAIL_MAX_PER_HOUR = 5;
export const IP_MAX_PER_HOUR = 20;
const HOUR_MS = 3_600_000;

export type RateLimitResult = { ok: true } | { ok: false; retryAfterSec: number };

export class LoginCodeRateLimiter {
  private byEmail = new Map<string, number[]>();
  private byIp = new Map<string, number[]>();

  check(email: string, ip: string, now = Date.now()): RateLimitResult {
    const emailHits = this.recent(this.byEmail, email, now);
    const ipHits = this.recent(this.byIp, ip, now);
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
    emailHits.push(now);
    ipHits.push(now);
    this.byEmail.set(email, emailHits);
    this.byIp.set(ip, ipHits);
    return { ok: true };
  }

  private recent(map: Map<string, number[]>, key: string, now: number): number[] {
    return (map.get(key) ?? []).filter((t) => now - t < HOUR_MS);
  }
}

export const loginCodeRateLimiter = new LoginCodeRateLimiter();

export function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}
