import { NextResponse } from 'next/server';
import { invoke } from '@pelis/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  let body: { email?: string; otp?: string } = {};
  try {
    body = await req.json();
  } catch {
    // empty
  }
  const email = String(body.email ?? '').toLowerCase().trim();
  const otp = String(body.otp ?? '').trim();
  if (!email || !otp) {
    return NextResponse.json({ message: 'Correo o código inválido' }, { status: 400 });
  }
  try {
    const result = (await invoke({
      name: 'users.verifyOtp',
      args: { email, otp },
      ctx: { userId: null, isAdmin: false },
    })) as { ok: boolean; status: number; message?: string; user?: unknown };
    if (!result.ok) {
      return NextResponse.json({ message: result.message }, { status: result.status });
    }
    return NextResponse.json({ status: true, token: null, user: result.user });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error interno';
    return NextResponse.json({ message }, { status: 500 });
  }
}