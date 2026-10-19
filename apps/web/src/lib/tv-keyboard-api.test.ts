import { beforeEach, describe, expect, it, vi } from 'vitest';

const db = vi.hoisted(() => ({
  createTvKeyboardSession: vi.fn(),
  getTvKeyboardSession: vi.fn(),
  updateTvKeyboardText: vi.fn(),
}));

vi.mock('@pelis/db', () => ({
  ...db,
  formatPairingCode: (c: string) => `${c.slice(0, 3)} ${c.slice(3)}`,
  buildTvKeyboardUrl: (o: string, c: string) => `${o}/tv-teclado?code=${c}`,
}));

import { GET, POST } from '../app/api/tv-keyboard/route';
import { POST as TEXT } from '../app/api/tv-keyboard/text/route';
import { SlidingWindowLimiter, TYPE_BURST } from './tv-keyboard-limits';

function textReq(body: unknown, ip = '10.0.0.1') {
  return new Request('https://verpelis.pro/api/tv-keyboard/text', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-forwarded-for': ip },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });
}

beforeEach(() => vi.clearAllMocks());

describe('POST /api/tv-keyboard (TV)', () => {
  it('devuelve código, código legible y URL del celular', async () => {
    db.createTvKeyboardSession.mockResolvedValue({
      ok: true,
      code: 'ABC234',
      expiresAt: new Date('2026-10-18T20:10:00Z'),
    });
    const res = await POST(new Request('https://verpelis.pro/api/tv-keyboard', { method: 'POST' }));
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.displayCode).toBe('ABC 234');
    expect(json.url).toMatch(/\/tv-teclado\?code=ABC234$/);
  });

  it('responde 429 con Retry-After si la IP abrió demasiadas', async () => {
    db.createTvKeyboardSession.mockResolvedValue({ ok: false, retryAfterSec: 120 });
    const res = await POST(new Request('https://verpelis.pro/api/tv-keyboard', { method: 'POST' }));
    expect(res.status).toBe(429);
    expect(res.headers.get('Retry-After')).toBe('120');
  });
});

describe('GET /api/tv-keyboard (TV pregunta)', () => {
  const state = { text: 'matrix', done: false, version: 4, expiresAt: new Date() };

  it('sin cambios solo devuelve la versión', async () => {
    db.getTvKeyboardSession.mockResolvedValue(state);
    const res = await GET(new Request('https://verpelis.pro/api/tv-keyboard?code=ABC234&v=4'));
    expect(await res.json()).toEqual({ v: 4 });
  });

  it('con cambios devuelve el texto', async () => {
    db.getTvKeyboardSession.mockResolvedValue(state);
    const res = await GET(new Request('https://verpelis.pro/api/tv-keyboard?code=ABC234&v=2'));
    expect(await res.json()).toEqual({ v: 4, text: 'matrix', done: false });
  });

  it('código vencido: 404', async () => {
    db.getTvKeyboardSession.mockResolvedValue(null);
    const res = await GET(new Request('https://verpelis.pro/api/tv-keyboard?code=ABC234'));
    expect(res.status).toBe(404);
    expect((await res.json()).expired).toBe(true);
  });
});

describe('POST /api/tv-keyboard/text (celular)', () => {
  it('guarda el texto', async () => {
    db.updateTvKeyboardText.mockResolvedValue({ ok: true, version: 1 });
    const res = await TEXT(textReq({ code: 'ABC234', text: 'mat', done: false }, '10.0.0.2'));
    expect(res.status).toBe(200);
    expect(db.updateTvKeyboardText).toHaveBeenCalledWith('ABC234', 'mat', false);
  });

  it('rechaza cuerpos grandes y JSON roto', async () => {
    expect(
      (await TEXT(textReq({ code: 'ABC234', text: 'x'.repeat(2000) }, '10.0.0.3'))).status
    ).toBe(413);
    expect((await TEXT(textReq('{no', '10.0.0.3'))).status).toBe(400);
    expect(db.updateTvKeyboardText).not.toHaveBeenCalled();
  });

  it('código vencido: 404 con mensaje claro', async () => {
    db.updateTvKeyboardText.mockResolvedValue({ ok: false, reason: 'not_found' });
    const res = await TEXT(textReq({ code: 'ABC234', text: 'a' }, '10.0.0.4'));
    expect(res.status).toBe(404);
    expect((await res.json()).error).toMatch(/venció/);
  });

  it('frena ráfagas largas desde la misma IP', async () => {
    db.updateTvKeyboardText.mockResolvedValue({ ok: true, version: 1 });
    let last = 200;
    for (let i = 0; i <= TYPE_BURST; i++) {
      last = (await TEXT(textReq({ code: 'ABC234', text: 'a' }, '10.0.0.9'))).status;
    }
    expect(last).toBe(429);
  });
});

describe('SlidingWindowLimiter', () => {
  it('vuelve a dejar pasar al terminar la ventana', () => {
    const l = new SlidingWindowLimiter(2, 1000);
    expect(l.allow('a', 0)).toBe(true);
    expect(l.allow('a', 10)).toBe(true);
    expect(l.allow('a', 20)).toBe(false);
    expect(l.allow('a', 1500)).toBe(true);
  });
});
