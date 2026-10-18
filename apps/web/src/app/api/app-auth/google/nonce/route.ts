import { NextResponse } from 'next/server';
import { createGoogleNonce, googleWebClientId } from '@pelis/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const NO_STORE = { 'Cache-Control': 'no-store' };

/**
 * Login nativo con Google (Credential Manager) — paso 1.
 * Devuelve un nonce de un solo uso y el client id OAuth WEB (no es secreto)
 * que la app usa como `serverClientId` al pedir el ID token a Google.
 */
export async function POST() {
  const clientId = googleWebClientId();
  if (!clientId) {
    return NextResponse.json(
      { error: 'Login con Google no configurado' },
      { status: 503, headers: NO_STORE }
    );
  }
  try {
    const { nonce, expiresAt } = await createGoogleNonce();
    return NextResponse.json(
      { nonce, clientId, expiresAt: expiresAt.toISOString() },
      { headers: NO_STORE }
    );
  } catch {
    return NextResponse.json(
      { error: 'No se pudo iniciar el acceso con Google' },
      { status: 500, headers: NO_STORE }
    );
  }
}
