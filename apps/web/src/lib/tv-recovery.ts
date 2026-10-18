/** Fatal network errors retried with backoff before showing an error. */
export const TV_MAX_NETWORK_RECOVERIES = 4;
/** recoverMediaError() attempts (the second one also swaps the audio codec). */
export const TV_MAX_MEDIA_RECOVERIES = 2;

/** 1 s, 2 s, 4 s, 8 s… capped at 8 s. */
export function tvRecoveryDelayMs(attempt: number): number {
  return Math.min(1000 * 2 ** Math.max(0, attempt), 8000);
}
