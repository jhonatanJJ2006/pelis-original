import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import { invoke } from '@pelis/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const OTP_EXPIRES_MS = 10 * 60 * 1000;
const OTP_COOLDOWN_MS = 30 * 1000;
const FROM_EMAIL = 'Pelis <no-reply@verpelis.pro>';

const OTP_HTML = (otp: string) => `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #07070d; margin: 0; padding: 0;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background: #07070d; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="520" cellpadding="0" cellspacing="0" style="background: linear-gradient(180deg, #0f0f1a 0%, #0a0a14 100%); border-radius: 20px; border: 1px solid #1e1e32; overflow: hidden;">
          <tr>
            <td align="center" style="padding: 48px 48px 0;">
              <h1 style="color: #fff; font-size: 26px; margin: 0 0 8px;">Bienvenido a Pelis</h1>
              <p style="color: #9a9ab0; font-size: 15px; margin: 0 0 32px;">
                Estás a un paso de disfrutar del mejor cine y series en streaming.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding: 0 48px 40px;">
              <p style="color: #c0c0d0; font-size: 14px; text-transform: uppercase; margin: 0 0 12px;">
                Tu código de verificación
              </p>
              <div style="background: #12121f; border-radius: 14px; border: 1px solid #1e1e32; padding: 28px 24px; text-align: center;">
                <span style="font-family: 'Courier New', monospace; font-size: 42px; font-weight: 700; color: #fff; letter-spacing: 14px;">
                  ${otp}
                </span>
              </div>
              <p style="color: #6b6b80; font-size: 12px; margin: 24px 0 0; text-align: center;">
                Si no solicitaste esta verificación, ignora este mensaje.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;

export async function POST(req: Request) {
  let body: { email?: string } = {};
  try {
    body = await req.json();
  } catch {
    // empty
  }
  const email = String(body.email ?? '').toLowerCase().trim();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ message: 'Correo inválido' }, { status: 400 });
  }

  // Verify user exists in Better Auth.
  const { auth } = await import('@pelis/db/auth');
  try {
    // We need to check by email. Use Prisma directly via the imported client.
    const { prisma } = await import('@pelis/db');
    const baUser = await prisma.user.findUnique({ where: { email } });
    if (!baUser) {
      return NextResponse.json({ message: 'No existe una cuenta con este correo' }, { status: 404 });
    }

    const now = Date.now();
    const lastSent = baUser.otpLastSentAt?.getTime() ?? 0;
    if (lastSent > 0 && now - lastSent < OTP_COOLDOWN_MS) {
      const remaining = Math.ceil((OTP_COOLDOWN_MS - (now - lastSent)) / 1000);
      return NextResponse.json(
        { message: `Vuelve a intentarlo en ${remaining} segundos` },
        { status: 429 },
      );
    }

    const otp = String(Math.floor(100000 + Math.random() * 900000));
    const resendKey = process.env.RESEND_API_KEY;
    if (!resendKey) {
      return NextResponse.json({ message: 'Falta RESEND_API_KEY' }, { status: 500 });
    }
    const resend = new Resend(resendKey);
    const { error: sendError } = await resend.emails.send({
      from: FROM_EMAIL,
      to: email,
      subject: 'Verifica tu cuenta de Pelis',
      html: OTP_HTML(otp),
    });
    if (sendError) {
      console.error('Error enviando email de verificación', sendError);
      return NextResponse.json({ message: 'Error al enviar el código' }, { status: 500 });
    }

    await invoke({
      name: 'users.setOtp',
      args: {
        userId: baUser.id,
        email,
        name: baUser.name ?? email,
        otp,
        otpExpiresAt: now + OTP_EXPIRES_MS,
        otpLastSentAt: now,
      },
      ctx: { userId: null, isAdmin: false },
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('email-otp send failed', err);
    return NextResponse.json({ message: 'Error interno' }, { status: 500 });
  }
  void auth;
}