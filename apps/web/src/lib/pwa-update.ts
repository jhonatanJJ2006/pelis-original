export const STORED_VERSION_KEY = 'pelis_app_version';
export const DISMISSED_VERSION_KEY = 'pelis_web_update_dismissed';

export interface WebVersionPayload {
  version: string | null;
}

export interface ShouldOfferWebUpdateInput {
  storedVersion: string | null;
  latestVersion: string | null;
  dismissedVersion: string | null;
  hasWaitingWorker: boolean;
}

function normalizeVersion(value: string | null | undefined): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function parseVersionPayload(data: unknown): WebVersionPayload {
  if (!data || typeof data !== 'object') {
    return { version: null };
  }

  const raw = (data as { version?: unknown }).version;
  return { version: typeof raw === 'string' ? normalizeVersion(raw) : null };
}

/**
 * Decide si hay que pedir consentimiento para actualizar.
 * Primera visita (sin versión guardada) solo memoriza; no interrumpe.
 * «Más tarde» silencia esa misma versión hasta que aparezca otra.
 */
export function shouldOfferWebUpdate({
  storedVersion,
  latestVersion,
  dismissedVersion,
  hasWaitingWorker,
}: ShouldOfferWebUpdateInput): boolean {
  const stored = normalizeVersion(storedVersion);
  const latest = normalizeVersion(latestVersion);
  const dismissed = normalizeVersion(dismissedVersion);

  if (latest && dismissed === latest) {
    return false;
  }

  if (hasWaitingWorker) {
    return true;
  }

  return Boolean(stored && latest && stored !== latest);
}
