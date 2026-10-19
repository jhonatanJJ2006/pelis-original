import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  buildPasswordResetEmail,
  buildResetUrl,
  PASSWORD_RESET_EXPIRES_MIN,
  sendPasswordResetEmail,
} from './passwordResetEmail';

describe('buildResetUrl', () => {
  it('apunta a /restablecer con el token', () => {
    expect(buildResetUrl('https://verpelis.pro/', 'a b')).toBe(
      'https://verpelis.pro/restablecer?token=a%20b'
    );
  });
});

describe('buildPasswordResetEmail', () => {
  it('incluye el enlace en HTML y texto, en español', () => {
    const url = 'https://verpelis.pro/restablecer?token=abc';
    const { subject, html, text } = buildPasswordResetEmail(url);
    expect(subject).toContain('contraseña');
    expect(html).toContain(url);
    expect(text).toContain(url);
    expect(html).toContain(`${PASSWORD_RESET_EXPIRES_MIN} minutos`);
  });

  it('escapa HTML en el enlace', () => {
    expect(buildPasswordResetEmail('https://x/"><script>').html).not.toContain('<script>');
  });
});

describe('sendPasswordResetEmail', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it('sin RESEND_API_KEY en desarrollo escribe el enlace en la consola', async () => {
    vi.stubEnv('RESEND_API_KEY', '');
    vi.stubEnv('NODE_ENV', 'development');
    const log = vi.spyOn(console, 'info').mockImplementation(() => {});
    await sendPasswordResetEmail('a@b.com', 'http://localhost:3000', 'tok');
    expect(log.mock.calls[0]?.[0]).toContain('http://localhost:3000/restablecer?token=tok');
  });

  it('con RESEND_API_KEY usa la API de Resend', async () => {
    vi.stubEnv('RESEND_API_KEY', 're_test');
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200 });
    vi.stubGlobal('fetch', fetchMock);
    await sendPasswordResetEmail('a@b.com', 'https://verpelis.pro', 'tok');
    expect(fetchMock).toHaveBeenCalledWith('https://api.resend.com/emails', expect.anything());
    vi.unstubAllGlobals();
  });
});
