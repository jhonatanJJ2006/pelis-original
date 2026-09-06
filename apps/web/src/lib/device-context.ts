function readUserAgent(ua?: string): string {
  if (ua) return ua;
  if (typeof navigator === 'undefined') return '';
  return navigator.userAgent;
}

export const TV_FORCE_STORAGE_KEY = 'pelis_force_tv';

/** Query `?device=tv|web` para forzar experiencia (tests / WebView). */
export function readDeviceOverride(search?: string | null): 'tv' | 'web' | null {
  if (!search) return null;
  try {
    const raw = search.startsWith('?') ? search.slice(1) : search;
    const device = new URLSearchParams(raw).get('device');
    if (device === 'tv') return 'tv';
    if (device === 'web') return 'web';
  } catch {
    return null;
  }
  return null;
}

export function persistDeviceOverride(override: 'tv' | 'web' | null): void {
  if (typeof window === 'undefined') return;
  try {
    if (override === 'tv') window.localStorage.setItem(TV_FORCE_STORAGE_KEY, '1');
    if (override === 'web') window.localStorage.removeItem(TV_FORCE_STORAGE_KEY);
  } catch {
    // storage bloqueado
  }
}

function readStoredTvForce(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.localStorage.getItem(TV_FORCE_STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

/** Android TV / TV Box: UA incluye Android pero no «Mobile». */
export function detectAndroidTv(ua?: string): boolean {
  const value = readUserAgent(ua);
  return /android/i.test(value) && !/mobile/i.test(value);
}

/** Televisor o dispositivo de salón (Android TV, Fire TV, Smart TV, etc.). */
export function detectTvDevice(ua?: string): boolean {
  const value = readUserAgent(ua);
  if (/Mi Box|MIBOX|MiTV|Xiaomi.*TV|Google TV|GoogleTV|Redmi.*TV/i.test(value)) return true;

  return (
    detectAndroidTv(value) ||
    /\b(aft|aftb|aftm|aftt|bravia|smart-tv|smarttv|hbbtv|webos|tizen|netcast|viera)\b/i.test(
      value
    ) ||
    /MiTV|Mi Box|MIBOX|Xiaomi.*TV|GoogleTV|CrKey|AppleTV|Redmi.*TV/i.test(value)
  );
}

/** UA + override de query/localStorage. */
export function detectTvExperience(input?: { ua?: string; search?: string | null }): boolean {
  const search = input?.search ?? (typeof window !== 'undefined' ? window.location.search : '');
  const override = readDeviceOverride(search);
  if (override === 'tv') return true;
  if (override === 'web') return false;
  if (readStoredTvForce()) return true;
  return detectTvDevice(input?.ua);
}

/** Destino de arranque en frío: la tele cae en canales en vivo. */
export function tvColdStartPath(pathname: string, isTv: boolean): string | null {
  if (!isTv) return null;
  if (pathname === '/') return '/tv';
  return null;
}

/** Pantalla grande típica de tele (ancho lógico amplio). */
export function detectLargeScreen(): boolean {
  if (typeof window === 'undefined') return false;
  return window.innerWidth >= 768;
}

/** Navegador web en televisor (no app instalada). */
export function detectTvBrowser(): boolean {
  return detectTvExperience() && typeof window !== 'undefined';
}
