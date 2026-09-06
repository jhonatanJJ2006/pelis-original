export const PAIRING_TTL_MS = 10 * 60 * 1000;
export const PAIRING_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export const PAIRING_CODE_LENGTH = 6;
export const PAIRING_MAX_CREATE_ATTEMPTS = 8;

export type TvPairingPublicStatus = 'pending' | 'approved' | 'claimed' | 'expired';

export function generatePairingCode(bytes: Uint8Array): string {
  let out = '';
  for (let i = 0; i < PAIRING_CODE_LENGTH; i++) {
    out += PAIRING_CODE_ALPHABET[bytes[i % bytes.length]! % PAIRING_CODE_ALPHABET.length];
  }
  return out;
}

export function normalizePairingCode(input: string): string {
  return input
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, PAIRING_CODE_LENGTH);
}

export function isPairingCodeShape(code: string): boolean {
  return (
    code.length === PAIRING_CODE_LENGTH &&
    [...code].every((ch) => PAIRING_CODE_ALPHABET.includes(ch))
  );
}

export function buildLinkTvUrl(origin: string, code: string): string {
  const base = origin.replace(/\/$/, '');
  return `${base}/link-tv?code=${encodeURIComponent(code)}`;
}

export function formatPairingCode(code: string): string {
  const normalized = normalizePairingCode(code);
  if (normalized.length !== PAIRING_CODE_LENGTH) return normalized;
  return `${normalized.slice(0, 3)} ${normalized.slice(3)}`;
}

export function pairingPublicStatus(
  status: 'PENDING' | 'APPROVED' | 'CLAIMED' | 'EXPIRED',
  expiresAt: Date,
  now = new Date()
): TvPairingPublicStatus {
  if (expiresAt.getTime() <= now.getTime() && status !== 'CLAIMED') return 'expired';
  return status.toLowerCase() as TvPairingPublicStatus;
}
