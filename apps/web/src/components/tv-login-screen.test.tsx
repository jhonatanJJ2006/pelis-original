import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const signInEmail = vi.fn();
const getSession = vi.fn();

vi.mock('@pelis/auth/hooks', () => ({
  useUser: () => ({ user: null, isLoading: false }),
}));

vi.mock('@pelis/auth/client', () => ({
  authClient: {
    signIn: {
      email: (...args: unknown[]) => signInEmail(...args),
    },
    getSession: (...args: unknown[]) => getSession(...args),
  },
}));

import { TvLoginScreen } from './tv-login-screen';

function pairingResponse() {
  return {
    ok: true,
    json: async () => ({
      code: 'ABC123',
      displayCode: 'ABC 123',
      deviceId: 'dev-1',
      expiresAt: '2099-01-01T00:00:00.000Z',
      verifyUrl: 'https://verpelis.pro/link-tv?code=ABC123',
      status: 'pending',
    }),
  };
}

beforeEach(() => {
  signInEmail.mockReset();
  getSession.mockReset();
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes('/api/tv-auth/pairing') && !url.includes('code=')) {
        return pairingResponse();
      }
      return { ok: true, json: async () => ({ status: 'pending' }) };
    })
  );
});

describe('TvLoginScreen', () => {
  it('keeps the QR code and offers email sign-in', async () => {
    render(<TvLoginScreen />);
    expect(await screen.findByText('ABC 123')).toBeTruthy();
    expect(screen.getByRole('img', { name: 'Código QR para vincular la tele' })).toBeTruthy();
    expect(screen.getAllByRole('button', { name: 'Entrar con correo' }).length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: 'Código QR' })).toBeTruthy();
  });

  it('focusable email form signs in with Better Auth and can return to QR', async () => {
    const user = userEvent.setup();
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});
    signInEmail.mockResolvedValue({ error: { message: 'Credenciales inválidas' } });

    render(<TvLoginScreen />);
    await screen.findByText('ABC 123');
    await user.click(screen.getAllByRole('button', { name: 'Entrar con correo' })[0]);

    const email = screen.getByLabelText('Correo');
    const password = screen.getByLabelText('Contraseña');
    const submit = screen.getByRole('button', { name: 'Entrar' });
    expect(email.getAttribute('tabindex')).toBe('0');
    expect(password.getAttribute('tabindex')).toBe('0');
    expect(password.getAttribute('type')).toBe('password');
    expect(submit.getAttribute('tabindex')).toBe('0');

    await user.type(email, 'persona@ejemplo.com');
    await user.type(password, 'clave-secreta');
    await user.click(submit);

    expect(signInEmail).toHaveBeenCalledWith({
      email: 'persona@ejemplo.com',
      password: 'clave-secreta',
    });
    expect(screen.getByRole('alert').textContent).toContain('Credenciales inválidas');
    const logged = log.mock.calls.flat().join(' ');
    expect(logged).not.toContain('clave-secreta');

    await user.click(screen.getByRole('button', { name: 'Volver al código QR' }));
    expect(screen.getByText('ABC 123')).toBeTruthy();
    log.mockRestore();
  });
});
