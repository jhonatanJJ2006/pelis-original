import { describe, expect, it, vi } from 'vitest';

vi.mock('@pelis/db/client', () => ({ useMutation: () => vi.fn(), useQueryResult: () => ({}) }));
vi.mock('@pelis/db/api', () => ({ api: { history: {} } }));

describe('hlsFailureMessage', () => {
  it('states the real cause for each status', async () => {
    const { hlsFailureMessage } = await import('./index');
    expect(hlsFailureMessage(401)).toMatch(/Inicia sesión/);
    expect(hlsFailureMessage(403)).toMatch(/plan activo/);
    expect(hlsFailureMessage(404)).toMatch(/no está disponible en el servidor/);
    expect(hlsFailureMessage(503)).toMatch(/almacenamiento/);
    expect(hlsFailureMessage(undefined)).toMatch(/conexión/);
  });
});
