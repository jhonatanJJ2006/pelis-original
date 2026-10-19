/** Correo para restablecer la contraseña, estilo Maison Noir. */
import { sendMail } from './mailer';

export const PASSWORD_RESET_EXPIRES_MIN = 60;

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (c) =>
    c === '&' ? '&amp;' : c === '<' ? '&lt;' : c === '>' ? '&gt;' : c === '"' ? '&quot;' : '&#39;'
  );
}

export function buildResetUrl(baseUrl: string, token: string): string {
  return `${baseUrl.replace(/\/+$/, '')}/restablecer?token=${encodeURIComponent(token)}`;
}

export function buildPasswordResetEmail(resetUrl: string): {
  subject: string;
  html: string;
  text: string;
} {
  const url = escapeHtml(resetUrl);
  const subject = 'Restablece tu contraseña de Pelis';
  const text = `Restablece tu contraseña de Pelis

Recibimos una solicitud para cambiar la contraseña de tu cuenta.
Abre este enlace para elegir una nueva:

${resetUrl}

El enlace vence en ${PASSWORD_RESET_EXPIRES_MIN} minutos y solo sirve una vez.
Si no lo pediste, ignora este mensaje: tu contraseña no cambia.`;
  const html = `<!DOCTYPE html>
<html lang="es">
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#0B0B0D;font-family:Inter,-apple-system,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0B0B0D;padding:40px 16px;">
    <tr><td align="center">
      <table width="520" cellpadding="0" cellspacing="0" style="max-width:520px;width:100%;background:#141417;border:1px solid #2A2A30;border-radius:8px;">
        <tr><td align="center" style="padding:40px 32px 8px;">
          <p style="margin:0 0 20px;color:#C4A35A;font-family:Georgia,serif;font-size:22px;letter-spacing:4px;">PELIS</p>
          <h1 style="margin:0 0 8px;color:#F2EEE6;font-family:Georgia,serif;font-size:24px;font-weight:500;">Restablece tu contraseña</h1>
          <p style="margin:0 0 28px;color:#A9A39A;font-size:14px;line-height:1.5;">Recibimos una solicitud para cambiar la contraseña de tu cuenta. Pulsa el botón para elegir una nueva.</p>
        </td></tr>
        <tr><td align="center" style="padding:0 32px;">
          <a href="${url}" style="display:inline-block;background:#C4A35A;color:#0B0B0D;text-decoration:none;font-weight:600;font-size:15px;padding:14px 28px;border-radius:6px;">Elegir nueva contraseña</a>
          <p style="margin:20px 0 0;color:#6B675F;font-size:12px;line-height:1.5;word-break:break-all;">Si el botón no funciona, copia este enlace:<br><a href="${url}" style="color:#C4A35A;">${url}</a></p>
        </td></tr>
        <tr><td style="padding:24px 32px 40px;">
          <p style="margin:0;color:#6B675F;font-size:12px;line-height:1.5;text-align:center;">El enlace vence en ${PASSWORD_RESET_EXPIRES_MIN} minutos y solo sirve una vez. Si no lo pediste, ignora este mensaje: tu contraseña no cambia.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
  return { subject, html, text };
}

export async function sendPasswordResetEmail(
  to: string,
  baseUrl: string,
  token: string
): Promise<void> {
  await sendMail({ to, ...buildPasswordResetEmail(buildResetUrl(baseUrl, token)) });
}
