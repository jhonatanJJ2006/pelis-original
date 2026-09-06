import Stripe from 'stripe';

export function assertStripeTestMode(secretKey: string) {
  if (secretKey.startsWith('sk_live_')) {
    throw new Error(
      'Stripe live keys are disabled. Use sk_test_… while subscriptions stay in test mode.'
    );
  }
  if (!secretKey.startsWith('sk_test_')) {
    throw new Error(
      'STRIPE_SECRET_KEY must be a real Stripe test key (sk_test_…). Placeholder values will not work.'
    );
  }
  if (secretKey.length < 40) {
    throw new Error(
      'STRIPE_SECRET_KEY looks like a placeholder. Paste a full sk_test_… key from the Stripe Dashboard (Test mode).'
    );
  }
}

export function getStripe(): Stripe {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) throw new Error('STRIPE_SECRET_KEY is not configured');
  assertStripeTestMode(secretKey);
  return new Stripe(secretKey);
}

export function assertWebhookSecret(webhookSecret: string | undefined): webhookSecret is string {
  return !!webhookSecret && webhookSecret.startsWith('whsec_') && webhookSecret.length >= 38;
}

function isLocalHostUrl(url: string | undefined): boolean {
  return !url || /localhost|127\.0\.0\.1/i.test(url);
}

/**
 * Public origin for Stripe success/cancel redirects on Movies.
 * If SITE_URL is still localhost but Better Auth / public URL is verpelis.pro
 * (tunnel → pelis-web), send the customer back to the tunnel, not the laptop.
 */
export function resolveStripeRedirectUrl(env: NodeJS.ProcessEnv = process.env): string {
  const site = env.SITE_URL?.trim();
  const publicCandidates = [env.BETTER_AUTH_URL, env.NEXT_PUBLIC_SITE_URL, env.NEXT_PUBLIC_APP_URL]
    .map((value) => value?.trim())
    .filter((value): value is string => !!value);

  if (isLocalHostUrl(site)) {
    const published = publicCandidates.find(
      (url) => /^https:\/\//i.test(url) && !isLocalHostUrl(url)
    );
    if (published) return published.replace(/\/$/, '');
  }
  return (site || publicCandidates[0] || 'http://localhost:3000').replace(/\/$/, '');
}
