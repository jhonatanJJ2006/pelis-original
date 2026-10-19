/**
 * Límite en memoria para las escrituras del celular (por proceso).
 * Cada pulsación es una petición, así que se permiten ráfagas cortas
 * pero no un flujo sostenido: `TYPE_BURST` peticiones cada `TYPE_WINDOW_MS`.
 */
export const TYPE_WINDOW_MS = 5_000;
export const TYPE_BURST = 40;
/** Cuerpo máximo aceptado (el texto va limitado a 80 caracteres). */
export const MAX_BODY_BYTES = 1_024;

export class SlidingWindowLimiter {
  private hits = new Map<string, number[]>();

  constructor(
    private readonly max: number,
    private readonly windowMs: number
  ) {}

  allow(key: string, now = Date.now()): boolean {
    const since = now - this.windowMs;
    const list = (this.hits.get(key) ?? []).filter((t) => t > since);
    if (list.length >= this.max) {
      this.hits.set(key, list);
      return false;
    }
    list.push(now);
    this.hits.set(key, list);
    if (this.hits.size > 5_000) this.prune(since);
    return true;
  }

  private prune(since: number) {
    for (const [key, list] of this.hits) {
      if (!list.some((t) => t > since)) this.hits.delete(key);
    }
  }
}

export function clientIp(req: Request): string {
  return (
    req.headers.get('cf-connecting-ip') ||
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    'desconocida'
  );
}
