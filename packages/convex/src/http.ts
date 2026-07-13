import { httpRouter } from 'convex/server';
import { createClient } from '@convex-dev/better-auth';
import { betterAuth } from 'better-auth';
import { convex } from '@convex-dev/better-auth/plugins';
import { getAuthConfigProvider } from '@convex-dev/better-auth/auth-config';
import { emailOTP } from 'better-auth/plugins';
import { Resend } from 'resend';
import { components } from './_generated/api';

const http = httpRouter();

const authClient = createClient(components.betterAuth);

const siteUrl = process.env.SITE_URL || 'http://localhost:3000';

const resend = new Resend(process.env.RESEND_API_KEY!);

const FROM_EMAIL = 'Pelis <noreply@pelis.com>';

authClient.registerRoutes(http, (ctx) => {
  return betterAuth({
    baseURL: siteUrl,
    secret: process.env.BETTER_AUTH_SECRET!,
    trustedOrigins: [siteUrl],
    database: authClient.adapter(ctx),
    emailAndPassword: {
      enabled: true,
      autoSignIn: true,
      requireEmailVerification: true,
    },
    socialProviders: {
      ...(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET
        ? {
            google: {
              clientId: process.env.AUTH_GOOGLE_ID,
              clientSecret: process.env.AUTH_GOOGLE_SECRET,
            },
          }
        : {}),
    },
    plugins: [
      convex({
        authConfig: {
          providers: [getAuthConfigProvider()],
        },
      }),
      emailOTP({
        overrideDefaultEmailVerification: true,
        sendVerificationOnSignUp: true,
        expiresIn: 600,
        sendVerificationOTP: async ({ email, otp, type }) => {
          const subject =
            type === 'email-verification'
              ? 'Verifica tu cuenta de Pelis'
              : 'Tu código de verificación de Pelis';

          await resend.emails.send({
            from: FROM_EMAIL,
            to: email,
            subject,
            html: `
              <!DOCTYPE html>
              <html>
              <head><meta charset="utf-8"></head>
              <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0a0a0f; margin: 0; padding: 0;">
                <table width="100%" cellpadding="0" cellspacing="0" style="background: #0a0a0f; padding: 40px 20px;">
                  <tr>
                    <td align="center">
                      <table width="480" cellpadding="0" cellspacing="0" style="background: #14141f; border-radius: 16px; border: 1px solid #2a2a3a; overflow: hidden;">
                        <tr>
                          <td style="padding: 40px 40px 0;">
                            <table cellpadding="0" cellspacing="0" width="100%">
                              <tr>
                                <td align="center">
                                  <div style="width: 48px; height: 48px; background: linear-gradient(135deg, #8b5cf6, #14b8a6); border-radius: 10px; display: flex; align-items: center; justify-content: center; margin: 0 auto 16px;">
                                    <span style="color: #fff; font-size: 24px; line-height: 1;">🎬</span>
                                  </div>
                                  <h1 style="color: #ffffff; font-size: 24px; font-weight: 700; margin: 0 0 8px; letter-spacing: -0.3px;">
                                    ${subject}
                                  </h1>
                                  <p style="color: #a0a0b8; font-size: 15px; line-height: 1.5; margin: 0 0 32px;">
                                    Usa el siguiente código para verificar tu cuenta:
                                  </p>
                                </td>
                              </tr>
                            </table>
                          </td>
                        </tr>
                        <tr>
                          <td style="padding: 0 40px;">
                            <table cellpadding="0" cellspacing="0" width="100%">
                              <tr>
                                <td align="center" style="background: #1a1a2e; border-radius: 12px; padding: 24px; border: 1px solid #2a2a3a;">
                                  <span style="font-family: 'Courier New', Courier, monospace; font-size: 36px; font-weight: 700; color: #ffffff; letter-spacing: 12px; user-select: all;">
                                    ${otp}
                                  </span>
                                </td>
                              </tr>
                            </table>
                          </td>
                        </tr>
                        <tr>
                          <td style="padding: 32px 40px 40px;">
                            <p style="color: #6b6b80; font-size: 13px; line-height: 1.5; margin: 0 0 4px; text-align: center;">
                              Este código expira en 10 minutos. Si no solicitaste esta verificación, ignora este mensaje.
                            </p>
                          </td>
                        </tr>
                      </table>
                      <p style="color: #4a4a5a; font-size: 12px; margin: 24px 0 0;">
                        &copy; ${new Date().getFullYear()} Pelis &mdash; Todos los derechos reservados
                      </p>
                    </td>
                  </tr>
                </table>
              </body>
              </html>
            `,
          });
        },
      }),
    ],
    session: {
      expiresIn: 60 * 60 * 24 * 7,
      updateAge: 60 * 60 * 24,
    },
  });
});

export default http;
