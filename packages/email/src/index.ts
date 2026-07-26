import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
}

export async function sendEmail({ to, subject, html }: SendEmailOptions) {
  const { data, error } = await resend.emails.send({
    from: 'Pelis <onboarding@resend.dev>',
    to,
    subject,
    html,
  });

  if (error) {
    throw error;
  }

  return data;
}

export async function sendVerificationEmail(to: string, token: string) {
  const verifyUrl = `${process.env.NEXT_PUBLIC_APP_URL}/auth/verify?token=${token}`;

  return sendEmail({
    to,
    subject: 'Verifica tu cuenta de Pelis',
    html: `
      <h1>Bienvenido a Pelis</h1>
      <p>Gracias por registrarte. Por favor verifica tu cuenta haciendo clic en el siguiente enlace:</p>
      <a href="${verifyUrl}">Verificar cuenta</a>
    `,
  });
}

export async function sendPasswordResetEmail(to: string, token: string) {
  const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL}/auth/reset?token=${token}`;

  return sendEmail({
    to,
    subject: 'Restablece tu contraseña de Pelis',
    html: `
      <h1>Restablecer contraseña</h1>
      <p>Has solicitado restablecer tu contraseña. Haz clic en el siguiente enlace:</p>
      <a href="${resetUrl}">Restablecer contraseña</a>
      <p>Si no solicitaste esto, ignora este email.</p>
    `,
  });
}
