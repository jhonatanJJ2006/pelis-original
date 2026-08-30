function readUserAgent(ua?: string): string {
  if (ua) return ua;
  if (typeof navigator === 'undefined') return '';
  return navigator.userAgent;
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

/** Pantalla grande típica de tele (ancho lógico amplio). */
export function detectLargeScreen(): boolean {
  if (typeof window === 'undefined') return false;
  return window.innerWidth >= 768;
}

/** Navegador web en televisor (no app instalada). */
export function detectTvBrowser(): boolean {
  return detectTvDevice() && typeof window !== 'undefined';
}
