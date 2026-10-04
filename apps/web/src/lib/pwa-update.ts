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

/** Respuesta de GET /api/app/availability (lee version.json del disco en Movies). */
export function parseAvailabilityVersion(data: unknown): WebVersionPayload {
  if (!data || typeof data !== 'object') {
    return { version: null };
  }

  const raw = (data as { webVersion?: unknown }).webVersion;
  return { version: typeof raw === 'string' ? normalizeVersion(raw) : null };
}

/**
 * El sitio (verpelis.pro) no muestra el aviso «Hay una nueva versión».
 * Las apps Android móvil y Android TV comparan su versionCode con
 * GET /api/app/availability y siguen ofreciendo Actualizar / Más tarde.
 * version.json se sigue publicando para esa API; aquí no hay prompt web.
 */
export function shouldOfferWebUpdate(_input: ShouldOfferWebUpdateInput): boolean {
  return false;
}
