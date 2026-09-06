export const TV_APK_STORED_VERSION_KEY = 'pelis_tv_apk_version';
export const TV_APK_DISMISSED_VERSION_KEY = 'pelis_tv_apk_update_dismissed';

export interface TvApkAvailability {
  tvApkAvailable: boolean;
  tvApkVersionCode: number | null;
  tvApkVersionName: string | null;
}

export interface TvApkInstalled {
  apkVersionCode: number | null;
  apkVersionName: string | null;
}

export interface ShouldOfferTvApkUpdateInput {
  storedVersion: string | null;
  latestVersion: string | null;
  dismissedVersion: string | null;
  apkAvailable: boolean;
}

function normalizeVersion(value: string | null | undefined): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function tvApkVersionKey(input: {
  apkVersionCode?: number | null;
  apkVersionName?: string | null;
}): string | null {
  if (typeof input.apkVersionCode === 'number' && Number.isFinite(input.apkVersionCode)) {
    return `code:${input.apkVersionCode}`;
  }
  return normalizeVersion(input.apkVersionName);
}

export function parseTvApkAvailability(data: unknown): TvApkAvailability {
  if (!data || typeof data !== 'object') {
    return { tvApkAvailable: false, tvApkVersionCode: null, tvApkVersionName: null };
  }
  const raw = data as {
    tvApkAvailable?: unknown;
    tvApkVersionCode?: unknown;
    tvApkVersionName?: unknown;
  };
  return {
    tvApkAvailable: raw.tvApkAvailable === true,
    tvApkVersionCode: typeof raw.tvApkVersionCode === 'number' ? raw.tvApkVersionCode : null,
    tvApkVersionName:
      typeof raw.tvApkVersionName === 'string' ? normalizeVersion(raw.tvApkVersionName) : null,
  };
}

/** Versión que reporta el APK TV (query, bridge JS o localStorage). */
export function readInstalledTvApk(input: {
  search?: string | null;
  bridge?: { apkVersionCode?: unknown; apkVersionName?: unknown } | null;
}): TvApkInstalled {
  const fromBridge = input.bridge
    ? {
        apkVersionCode:
          typeof input.bridge.apkVersionCode === 'number' ? input.bridge.apkVersionCode : null,
        apkVersionName:
          typeof input.bridge.apkVersionName === 'string'
            ? normalizeVersion(input.bridge.apkVersionName)
            : null,
      }
    : { apkVersionCode: null, apkVersionName: null };

  if (!input.search) return fromBridge;

  try {
    const params = new URLSearchParams(
      input.search.startsWith('?') ? input.search.slice(1) : input.search
    );
    const codeRaw = params.get('apkVersionCode');
    const nameRaw = params.get('apkVersion');
    const code = codeRaw ? Number(codeRaw) : NaN;
    return {
      apkVersionCode: Number.isFinite(code) ? code : fromBridge.apkVersionCode,
      apkVersionName: nameRaw ? normalizeVersion(nameRaw) : fromBridge.apkVersionName,
    };
  } catch {
    return fromBridge;
  }
}

/**
 * Misma semántica que el modal PWA: primera visita memoriza; «Más tarde»
 * silencia esa versión; un code/name nuevo vuelve a ofrecer.
 */
export function shouldOfferTvApkUpdate({
  storedVersion,
  latestVersion,
  dismissedVersion,
  apkAvailable,
}: ShouldOfferTvApkUpdateInput): boolean {
  if (!apkAvailable) return false;
  const stored = normalizeVersion(storedVersion);
  const latest = normalizeVersion(latestVersion);
  const dismissed = normalizeVersion(dismissedVersion);
  if (!latest) return false;
  if (dismissed === latest) return false;
  return Boolean(stored && stored !== latest);
}
