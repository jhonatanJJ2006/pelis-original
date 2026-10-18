import { describe, expect, it } from 'vitest';
import { renderAppAuthPage } from './app-auth-page';

describe('renderAppAuthPage', () => {
  it('incluye el intent y el enlace de respaldo a la app', () => {
    const html = renderAppAuthPage({
      intentUrl:
        'intent://auth/callback?code=C&state=S#Intent;scheme=pro.verpelis.app;package=pro.verpelis.app.native;end',
      schemeUrl: 'pro.verpelis.app://auth/callback?code=C&state=S',
    });
    expect(html).toContain('href="pro.verpelis.app://auth/callback?code=C&amp;state=S"');
    expect(html).toContain('package=pro.verpelis.app.native');
    expect(html).toContain('name="referrer" content="no-referrer"');
  });

  it('escapa el mensaje de error', () => {
    const html = renderAppAuthPage({ error: '<script>x</script>' });
    expect(html).not.toContain('<script>x</script>');
    expect(html).toContain('&lt;script&gt;');
  });
});
