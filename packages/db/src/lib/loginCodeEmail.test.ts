import { describe, expect, it } from 'vitest';
import { buildLoginCodeEmail, LOGIN_CODE_EXPIRES_MIN } from './loginCodeEmail';

describe('buildLoginCodeEmail', () => {
  it('pone el código en el asunto y en el cuerpo, en español', () => {
    const { subject, html } = buildLoginCodeEmail('123456');
    expect(subject).toContain('123456');
    expect(html).toContain('123456');
    expect(html).toContain('Tu código de acceso');
    expect(html).toContain(`${LOGIN_CODE_EXPIRES_MIN} minutos`);
  });

  it('escapa HTML en el código', () => {
    expect(buildLoginCodeEmail('<b>').html).not.toContain('<b>');
  });
});
