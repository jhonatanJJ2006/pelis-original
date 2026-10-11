import { describe, expect, it } from 'vitest';
import {
  EMAIL_COOLDOWN_MS,
  IP_MAX_PER_HOUR,
  LoginCodeRateLimiter,
  isValidEmail,
} from './login-code-rate-limit';

describe('LoginCodeRateLimiter', () => {
  it('aplica una espera de 60 s por correo', () => {
    const rl = new LoginCodeRateLimiter();
    expect(rl.check('a@b.co', '1.1.1.1', 0)).toEqual({ ok: true });
    expect(rl.check('a@b.co', '1.1.1.1', 1000)).toEqual({ ok: false, retryAfterSec: 59 });
    expect(rl.check('a@b.co', '1.1.1.1', EMAIL_COOLDOWN_MS)).toEqual({ ok: true });
  });

  it('limita a 5 envíos por hora por correo', () => {
    const rl = new LoginCodeRateLimiter();
    for (let i = 0; i < 5; i++)
      expect(rl.check('a@b.co', 'ip', i * EMAIL_COOLDOWN_MS).ok).toBe(true);
    expect(rl.check('a@b.co', 'ip', 5 * EMAIL_COOLDOWN_MS).ok).toBe(false);
  });

  it('limita por IP aunque cambie el correo', () => {
    const rl = new LoginCodeRateLimiter();
    for (let i = 0; i < IP_MAX_PER_HOUR; i++) expect(rl.check(`u${i}@b.co`, 'ip', i).ok).toBe(true);
    expect(rl.check('otro@b.co', 'ip', 100).ok).toBe(false);
    expect(rl.check('otro@b.co', 'ip2', 100).ok).toBe(true);
  });
});

describe('isValidEmail', () => {
  it('valida formato básico', () => {
    expect(isValidEmail('jhona@verpelis.pro')).toBe(true);
    expect(isValidEmail('no-es-correo')).toBe(false);
  });
});
