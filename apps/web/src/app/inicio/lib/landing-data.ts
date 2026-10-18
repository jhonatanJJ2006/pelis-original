import { imageRemotePatterns } from '../../../../image-remote-patterns.mjs';

export interface LandingPlan {
  _id: string;
  name: string;
  price: number;
  description?: string | null;
  features: string[];
  months: number;
  recommended?: boolean;
}

export interface PosterSource {
  src: string | null | undefined;
  alt: string;
}

const ALLOWED_HOSTS = new Set(imageRemotePatterns.map((p: { hostname: string }) => p.hostname));

/** Rutas locales o hosts permitidos en next.config (next/image falla con otros). */
export function isRenderableImage(src: string | null | undefined): src is string {
  if (!src) return false;
  if (src.startsWith('/') && !src.startsWith('//')) return true;
  try {
    const url = new URL(src);
    return url.protocol === 'https:' && ALLOWED_HOSTS.has(url.hostname);
  } catch {
    return false;
  }
}

/** Pósters únicos y con imagen, en el orden recibido, hasta `limit`. */
export function buildPosterCollage(
  sources: PosterSource[],
  limit: number
): Array<{ src: string; alt: string }> {
  const seen = new Set<string>();
  const out: Array<{ src: string; alt: string }> = [];
  for (const source of sources) {
    const src = source.src?.trim();
    if (!src || seen.has(src)) continue;
    if (!isRenderableImage(src)) continue;
    seen.add(src);
    out.push({ src, alt: source.alt });
    if (out.length >= limit) break;
  }
  return out;
}

/** Planes ordenados por precio (máximo 3 para el teaser). */
export function pickPlans(plans: LandingPlan[], max = 3): LandingPlan[] {
  return [...plans]
    .filter((p) => Number.isFinite(p.price))
    .sort((a, b) => a.price - b.price)
    .slice(0, max);
}

export function formatPlanPrice(plan: Pick<LandingPlan, 'price' | 'months'>): string {
  const price = `$${plan.price.toFixed(2)}`;
  return plan.months > 1 ? `${price} cada ${plan.months} meses` : `${price} al mes`;
}
