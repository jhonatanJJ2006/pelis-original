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
  return !!webhookSecret && webhookSecret.startsWith('whsec_') && webhookSecret.length >= 40;
}
