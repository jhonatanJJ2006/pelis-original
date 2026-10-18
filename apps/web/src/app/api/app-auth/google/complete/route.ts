import { NextResponse } from 'next/server';
import {
  AuthError,
  buildAppCallbackUrl,
  buildAppIntentUrl,
  createAppAuthCode,
  getRequestCtx,
  isAppAuthToken,
} from '@pelis/db';
import { renderAppAuthPage } from '@/lib/app-auth-page';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const NO_STORE = {
  'Cache-Control': 'no-store, max-age=0',
  'Referrer-Policy': 'no-referrer',
  'X-Robots-Tag': 'noindex',
  'Content-Type': 'text/html; charset=utf-8',
};

function page(status: number, html: string) {
  return new NextResponse(html, { status, headers: NO_STORE });
}

/**
 * Destino de better-auth tras Google (callbackURL). Con la sesión del navegador
 * ya creada, emite un código de un solo uso y devuelve el control a la app.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const state = url.searchParams.get('state');
  const challenge = url.searchParams.get('challenge');
  if (!isAppAuthToken(state) || !isAppAuthToken(challenge)) {
    return page(
      400,
      renderAppAuthPage({ error: 'Enlace inválido. Vuelve a la app e inténtalo de nuevo.' })
    );
  }

  const ctx = await getRequestCtx(req);
  if (!ctx.userId) {
    return page(
      401,
      renderAppAuthPage({ error: 'No se completó el inicio de sesión con Google.' })
    );
  }

  try {
    const { code } = await createAppAuthCode({ userId: ctx.userId, state, challenge });
    return page(
      200,
      renderAppAuthPage({
        intentUrl: buildAppIntentUrl(code, state),
        schemeUrl: buildAppCallbackUrl(code, state),
      })
    );
  } catch (err) {
    const status = err instanceof AuthError ? err.status : 500;
    return page(
      status,
      renderAppAuthPage({ error: 'No se pudo completar el acceso. Inténtalo de nuevo.' })
    );
  }
}
