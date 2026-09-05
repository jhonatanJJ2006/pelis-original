import { describe, expect, it } from 'vitest';
import { resolveStripeRedirectUrl } from './stripe-client';

describe('resolveStripeRedirectUrl', () => {
  it('uses SITE_URL when it is already public', () => {
    expect(
      resolveStripeRedirectUrl({
        SITE_URL: 'https://verpelis.pro',
        BETTER_AUTH_URL: 'https://verpelis.pro',
      })
    ).toBe('https://verpelis.pro');
  });

  it('prefers the Movies tunnel URL when SITE_URL is still localhost', () => {
    expect(
      resolveStripeRedirectUrl({
        SITE_URL: 'http://localhost:3000',
        BETTER_AUTH_URL: 'https://verpelis.pro',
      })
    ).toBe('https://verpelis.pro');
  });

  it('keeps localhost when no public URL is configured (laptop dev)', () => {
    expect(resolveStripeRedirectUrl({ SITE_URL: 'http://localhost:3000' })).toBe(
      'http://localhost:3000'
    );
  });
});
