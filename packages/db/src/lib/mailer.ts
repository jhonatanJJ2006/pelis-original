/**
 * Envío de correos transaccionales.
 * - Con `RESEND_API_KEY`: API REST de Resend (remitente `EMAIL_FROM`, por defecto
 *   `Pelis <no-reply@verpelis.pro>`).
 * - Sin clave fuera de producción: se escribe el correo en la consola del servidor
 *   (útil en desarrollo para copiar el enlace).
 * - Sin clave en producción: error (nunca se imprime el contenido).
 */
export type MailMessage = { to: string; subject: string; html: string; text?: string };

export const DEFAULT_FROM = 'Pelis <no-reply@verpelis.pro>';

export function resolveFrom(): string {
  return process.env.EMAIL_FROM?.trim() || DEFAULT_FROM;
}

export async function sendMail(msg: MailMessage): Promise<void> {
  const key = process.env.RESEND_API_KEY?.trim();
  if (!key) {
    if (process.env.NODE_ENV === 'production') throw new Error('Falta RESEND_API_KEY');
    console.info(
      `[mailer] RESEND_API_KEY no configurada; correo no enviado.\nPara: ${msg.to}\nAsunto: ${msg.subject}\n${msg.text ?? msg.html}`
    );
    return;
  }
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: resolveFrom(), ...msg }),
  });
  if (!res.ok) throw new Error(`Resend respondió ${res.status}`);
}
