/**
 * Deadline shared by every provider lookup of one request. Cloudflare cuts a
 * request at 100 s, and "Buscando fuentes…" used to chain slow providers
 * past that. Each step gets its own timeout, capped by what is left overall.
 */
export const ANIME_STREAM_BUDGET_MS = 25_000;

export const ANIME_STEP_TIMEOUTS_MS = {
  anilist: 8_000,
  vidnest: 10_000,
  resolveEmbed: 8_000,
  embedHealth: 5_000,
  consumet: 6_000,
} as const;

/** Resolves to `fallback` if `promise` takes longer than `ms` (or rejects). */
export async function withTimeout<T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> {
  if (ms <= 0) {
    promise.catch(() => {});
    return fallback;
  }
  let timer: ReturnType<typeof setTimeout> | null = null;
  try {
    return await Promise.race([
      promise.catch(() => fallback),
      new Promise<T>((resolve) => {
        timer = setTimeout(() => resolve(fallback), ms);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export class TimeBudget {
  private readonly deadline: number;

  constructor(
    totalMs: number,
    private readonly now: () => number = Date.now
  ) {
    this.deadline = now() + totalMs;
  }

  remaining(): number {
    return Math.max(0, this.deadline - this.now());
  }

  expired(): boolean {
    return this.remaining() <= 0;
  }

  /** Runs one step with min(stepMs, remaining) and `fallback` on timeout/error. */
  run<T>(step: () => Promise<T>, stepMs: number, fallback: T): Promise<T> {
    const ms = Math.min(stepMs, this.remaining());
    if (ms <= 0) return Promise.resolve(fallback);
    let promise: Promise<T>;
    try {
      promise = step();
    } catch {
      return Promise.resolve(fallback);
    }
    return withTimeout(promise, ms, fallback);
  }
}
