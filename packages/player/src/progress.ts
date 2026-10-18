/**
 * Persistencia de progreso.
 *
 * Solo expone un throttle; *dónde* se guarda (API de historial de `@pelis/db`,
 * IndexedDB...) lo decide el consumidor.
 *
 * @module @pelis/player/progress
 */

export type ProgressSaver = (current: number, duration: number) => void | Promise<void>;

export type ThrottledSaver = {
  /** Registra la posición; guarda como mucho cada `intervalMs`. */
  call(current: number, duration: number): void;
  /** Guarda la última posición pendiente (pausa, desmontaje) y espera. */
  flush(): Promise<void>;
};

export type ThrottleOptions = {
  /** Intervalo mínimo entre guardados (ms). Por defecto 5000. */
  readonly intervalMs?: number;
  /** Fracción a partir de la cual se considera "terminado". Por defecto 0.95. */
  readonly nearEndRatio?: number;
  /** Reloj inyectable (tests). */
  readonly now?: () => number;
};

export function throttle(save: ProgressSaver, options: ThrottleOptions = {}): ThrottledSaver {
  const interval = options.intervalMs ?? 5000;
  const nearEndRatio = options.nearEndRatio ?? 0.95;
  const now = options.now ?? Date.now;

  let lastSavedAt = Number.NEGATIVE_INFINITY;
  let nearEndSent = false;
  let unsaved: [number, number] | null = null;
  let pending: Promise<void> = Promise.resolve();

  const send = (current: number, duration: number) => {
    lastSavedAt = now();
    unsaved = null;
    try {
      const result = save(current, duration) as Promise<void> | undefined;
      if (result && typeof result.then === 'function') {
        pending = result.then(
          () => undefined,
          () => undefined
        );
      }
    } catch {
      // El guardado es best-effort; nunca romper la reproducción.
    }
  };

  return {
    call(current, duration) {
      if (!(duration > 0) || !Number.isFinite(current)) return;
      const isNearEnd = current >= duration * nearEndRatio;
      if (!isNearEnd) nearEndSent = false;
      if (isNearEnd && !nearEndSent) {
        nearEndSent = true;
        send(current, duration);
        return;
      }
      if (now() - lastSavedAt < interval) {
        unsaved = [current, duration];
        return;
      }
      send(current, duration);
    },
    async flush() {
      if (unsaved) send(unsaved[0], unsaved[1]);
      await pending;
    },
  };
}
