/** Correo del código de acceso (inicio de sesión sin contraseña), estilo Maison Noir. */
export const LOGIN_CODE_EXPIRES_MIN = 10;

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (c) =>
    c === '&' ? '&amp;' : c === '<' ? '&lt;' : c === '>' ? '&gt;' : c === '"' ? '&quot;' : '&#39;'
  );
}

export function buildLoginCodeEmail(otp: string): { subject: string; html: string } {
  const code = escapeHtml(otp);
  return {
    subject: `Tu código de acceso a Pelis: ${code}`,
    html: `<!DOCTYPE html>
<html lang="es">
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#0B0B0D;font-family:Inter,-apple-system,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0B0B0D;padding:40px 16px;">
    <tr><td align="center">
      <table width="520" cellpadding="0" cellspacing="0" style="background:#141417;border:1px solid #2A2A30;border-radius:8px;">
        <tr><td align="center" style="padding:40px 40px 8px;">
          <p style="margin:0 0 20px;color:#C4A35A;font-family:Georgia,serif;font-size:22px;letter-spacing:4px;">PELIS</p>
          <h1 style="margin:0 0 8px;color:#F2EEE6;font-family:Georgia,serif;font-size:24px;font-weight:500;">Tu código de acceso</h1>
          <p style="margin:0 0 28px;color:#A9A39A;font-size:14px;line-height:1.5;">Escribe este código en la pantalla de inicio de sesión para entrar a tu sala.</p>
        </td></tr>
        <tr><td style="padding:0 40px;">
          <div style="background:#0B0B0D;border:1px solid #2A2A30;border-radius:6px;padding:24px;text-align:center;">
            <span style="font-family:'Courier New',monospace;font-size:38px;font-weight:700;color:#C4A35A;letter-spacing:12px;">${code}</span>
          </div>
        </td></tr>
        <tr><td style="padding:24px 40px 40px;">
          <p style="margin:0;color:#6B675F;font-size:12px;line-height:1.5;text-align:center;">El código vence en ${LOGIN_CODE_EXPIRES_MIN} minutos y solo sirve una vez. Si no lo pediste, ignora este mensaje: tu cuenta sigue segura.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
  };
}

/** Envía el código por la API REST de Resend (mismo remitente que la verificación de correo). */
export async function sendLoginCodeEmail(to: string, otp: string): Promise<void> {
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error('Falta RESEND_API_KEY');
  const { subject, html } = buildLoginCodeEmail(otp);
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: 'Pelis <no-reply@verpelis.pro>', to, subject, html }),
  });
  if (!res.ok) {
    throw new Error(`Resend respondió ${res.status}`);
  }
}
