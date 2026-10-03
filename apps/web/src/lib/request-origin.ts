import { PRODUCTION_URL } from './app-download';

/**
 * Hosts that a phone cannot open when they appear inside the TV pairing QR.
 * Same private ranges as tv-stream-proxy (loopback, RFC1918, link-local).
 */
const PRIVATE_HOST_RE =
  /^(localhost|127\.\d+\.\d+\.\d+|10\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+|169\.254\.\d+\.\d+|0\.0\.0\.0|\[::1\])$/i;

export function isPrivateOrLocalHost(hostname: string): boolean {
  const host = hostname.trim().toLowerCase().replace(/^\[|\]$/g, '');
  if (!host) return true;
  if (host.endsWith('.local')) return true;
  return PRIVATE_HOST_RE.test(host);
}

export function isPrivateOrLocalOrigin(origin: string): boolean {
  try {
    const parsed = new URL(origin);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return true;
    return isPrivateOrLocalHost(parsed.hostname);
  } catch {
    return true;
  }
}

/**
 * First publicly reachable origin from env (tunnel / prod URL).
 * Returns null when only localhost (or nothing) is configured — pure local stack.
 */
export function resolvePublicAppOrigin(env: NodeJS.ProcessEnv = process.env): string | null {
  const candidates = [
    env.BETTER_AUTH_URL,
    env.NEXT_PUBLIC_SITE_URL,
    env.NEXT_PUBLIC_APP_URL,
    env.SITE_URL,
  ]
    .map((value) => value?.trim())
    .filter((value): value is string => !!value);

  const httpsPublic = candidates.find((raw) => {
    try {
      const parsed = new URL(raw);
      return parsed.protocol === 'https:' && !isPrivateOrLocalHost(parsed.hostname);
    } catch {
      return false;
    }
  });
  if (httpsPublic) return new URL(httpsPublic).origin;

  const anyPublic = candidates.find((raw) => {
    try {
      const parsed = new URL(raw);
      return (
        (parsed.protocol === 'http:' || parsed.protocol === 'https:') &&
        !isPrivateOrLocalHost(parsed.hostname)
      );
    } catch {
      return false;
    }
  });
  return anyPublic ? new URL(anyPublic).origin : null;
}

function firstHeaderValue(value: string | null): string {
  return (value ?? '').split(',')[0]!.trim();
}

function originFromHost(host: string, protoHint: string | null): string | null {
  const cleanHost = firstHeaderValue(host);
  if (!cleanHost) return null;
  const hostname = cleanHost.split(':')[0]!.trim();
  let proto = firstHeaderValue(protoHint);
  if (proto !== 'http' && proto !== 'https') {
    proto =
      hostname === 'localhost' || hostname.startsWith('127.') || isPrivateOrLocalHost(hostname)
        ? 'http'
        : 'https';
  }
  return `${proto}://${cleanHost}`;
}

/**
 * Origin used to build the TV pairing QR (`verifyUrl`).
 *
 * Movies runs Next on localhost:3000 behind Cloudflare Tunnel. Request Host /
 * X-Forwarded-Host can be loopback or a LAN IP (debug APK with -PpelisApiBase).
 * The phone that scans the QR cannot open those hosts, so we substitute the
 * public app origin when the request origin is private — while still allowing a
 * pure-local stack (no public env, non-production) to keep localhost.
 */
export function resolveRequestOrigin(
  request: Request,
  env: NodeJS.ProcessEnv = process.env
): string {
  const forwardedHost = request.headers.get('x-forwarded-host');
  const forwardedProto = request.headers.get('x-forwarded-proto');
  const hostHeader = request.headers.get('host');

  const fromForwarded = originFromHost(forwardedHost ?? '', forwardedProto);
  const fromHost = originFromHost(hostHeader ?? '', forwardedProto);

  let candidate = fromForwarded ?? fromHost;
  if (!candidate) {
    try {
      candidate = new URL(request.url).origin;
    } catch {
      candidate = '';
    }
  }

  if (candidate && !isPrivateOrLocalOrigin(candidate)) {
    return candidate.replace(/\/$/, '');
  }

  const published = resolvePublicAppOrigin(env);
  if (published) {
    return published.replace(/\/$/, '');
  }

  // Production without a public env still must not emit localhost in the QR.
  if (env.NODE_ENV === 'production') {
    return PRODUCTION_URL.replace(/\/$/, '');
  }

  if (candidate) {
    return candidate.replace(/\/$/, '');
  }

  return 'http://localhost:3000';
}
