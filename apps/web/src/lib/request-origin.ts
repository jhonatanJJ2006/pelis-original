const PUBLIC_ORIGIN = 'https://verpelis.pro';

export function resolveRequestOrigin(request: Request): string {
  const forwardedHost = request.headers.get('x-forwarded-host');
  const forwardedProto = request.headers.get('x-forwarded-proto');
  const host = forwardedHost ?? request.headers.get('host');
  if (host) {
    const proto =
      forwardedProto ?? (host.includes('localhost') || host.startsWith('127.') ? 'http' : 'https');
    return `${proto}://${host.split(',')[0]!.trim()}`;
  }
  try {
    return new URL(request.url).origin;
  } catch {
    return PUBLIC_ORIGIN;
  }
}
