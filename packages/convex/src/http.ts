import { httpRouter } from 'convex/server';
import { createClient } from '@convex-dev/better-auth';
import { betterAuth } from 'better-auth';
import { convex } from '@convex-dev/better-auth/plugins';
import { getAuthConfigProvider } from '@convex-dev/better-auth/auth-config';
import { Resend } from 'resend';
import { httpAction } from './_generated/server';
import { components, api, internal } from './_generated/api';

const http = httpRouter();

const authClient = createClient(components.betterAuth);

const siteUrl = process.env.SITE_URL || 'http://localhost:3000';

const resend = new Resend(process.env.RESEND_API_KEY!);

const FROM_EMAIL = 'Pelis <no-reply@verpelis.pro>';

const OTP_EXPIRES_MS = 10 * 60 * 1000;
const OTP_COOLDOWN_MS = 30 * 1000;

const trustedOrigins = [siteUrl];

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

async function sendVerificationEmail(email: string, otp: string) {
  return await resend.emails.send({
    from: FROM_EMAIL,
    to: email,
    subject: 'Verifica tu cuenta de Pelis',
    html: `
      <!DOCTYPE html>
      <html>
      <head><meta charset="utf-8"></head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #07070d; margin: 0; padding: 0;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background: #07070d; padding: 40px 20px;">
          <tr>
            <td align="center">
              <table width="520" cellpadding="0" cellspacing="0" style="background: linear-gradient(180deg, #0f0f1a 0%, #0a0a14 100%); border-radius: 20px; border: 1px solid #1e1e32; overflow: hidden; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.8);">
                <tr>
                  <td style="background: linear-gradient(135deg, rgba(139,92,246,0.12) 0%, rgba(20,184,166,0.08) 100%); padding: 0;">
                    <table cellpadding="0" cellspacing="0" width="100%">
                      <tr>
                        <td align="center" style="padding: 48px 48px 0;">
                          <div style="width: 56px; height: 56px; background: linear-gradient(135deg, #8b5cf6, #14b8a6); border-radius: 14px; margin: 0 auto 20px; display: flex; align-items: center; justify-content: center;">
                            <span style="color: #fff; font-size: 28px; line-height: 1;">🎬</span>
                          </div>
                          <h1 style="color: #ffffff; font-size: 26px; font-weight: 800; margin: 0 0 8px; letter-spacing: -0.5px;">
                            Bienvenido a Pelis
                          </h1>
                          <p style="color: #9a9ab0; font-size: 15px; line-height: 1.6; margin: 0 0 32px;">
                            Estás a un paso de disfrutar del mejor cine y series en streaming sin distracciones.
                          </p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 0 48px;">
                    <div style="height: 1px; background: linear-gradient(90deg, transparent, #1e1e32, transparent);"></div>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 32px 48px 0;">
                    <table cellpadding="0" cellspacing="0" width="100%">
                      <tr>
                        <td>
                          <p style="color: #c0c0d0; font-size: 14px; font-weight: 600; margin: 0 0 12px; letter-spacing: 0.5px; text-transform: uppercase;">
                            Tu código de verificación
                          </p>
                          <table cellpadding="0" cellspacing="0" width="100%" style="background: linear-gradient(135deg, #12121f, #0d0d1a); border-radius: 14px; border: 1px solid #1e1e32; padding: 28px 24px;">
                            <tr>
                              <td align="center">
                                <span style="font-family: 'Courier New', Courier, monospace; font-size: 42px; font-weight: 700; color: #ffffff; letter-spacing: 14px; user-select: all; -webkit-user-select: all; -moz-user-select: all;">
                                  ${otp}
                                </span>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 24px 48px 0;">
                    <table cellpadding="0" cellspacing="0" width="100%">
                      <tr>
                        <td>
                          <table cellpadding="0" cellspacing="0" style="background: rgba(139,92,246,0.06); border-radius: 10px; padding: 16px 20px; border: 1px solid rgba(139,92,246,0.1);" width="100%">
                            <tr>
                              <td align="center">
                                <span style="color: #9a9ab0; font-size: 13px;">
                                  ⏱️ Este código expira en <strong style="color: #e0e0f0;">10 minutos</strong>
                                </span>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 32px 48px 0;">
                    <table cellpadding="0" cellspacing="0" width="100%">
                      <tr>
                        <td style="padding-bottom: 12px;">
                          <p style="color: #c0c0d0; font-size: 14px; font-weight: 600; margin: 0 0 16px; letter-spacing: 0.5px; text-transform: uppercase;">
                            ¿Qué puedes hacer en Pelis?
                          </p>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding-bottom: 10px;">
                          <table cellpadding="0" cellspacing="0">
                            <tr>
                              <td style="width: 20px; vertical-align: top; padding-top: 1px;">
                                <span style="color: #14b8a6; font-size: 14px;">✦</span>
                              </td>
                              <td>
                                <span style="color: #9a9ab0; font-size: 14px; line-height: 1.5;">Accede a cientos de películas y series sin publicidad</span>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding-bottom: 10px;">
                          <table cellpadding="0" cellspacing="0">
                            <tr>
                              <td style="width: 20px; vertical-align: top; padding-top: 1px;">
                                <span style="color: #14b8a6; font-size: 14px;">✦</span>
                              </td>
                              <td>
                                <span style="color: #9a9ab0; font-size: 14px; line-height: 1.5;">Crea tu lista de favoritos y retoma donde lo dejaste</span>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding-bottom: 10px;">
                          <table cellpadding="0" cellspacing="0">
                            <tr>
                              <td style="width: 20px; vertical-align: top; padding-top: 1px;">
                                <span style="color: #14b8a6; font-size: 14px;">✦</span>
                              </td>
                              <td>
                                <span style="color: #9a9ab0; font-size: 14px; line-height: 1.5;">Disfruta en cualquier dispositivo, cuando y donde quieras</span>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding-bottom: 10px;">
                          <table cellpadding="0" cellspacing="0">
                            <tr>
                              <td style="width: 20px; vertical-align: top; padding-top: 1px;">
                                <span style="color: #14b8a6; font-size: 14px;">✦</span>
                              </td>
                              <td>
                                <span style="color: #9a9ab0; font-size: 14px; line-height: 1.5;">Planes flexibles desde <strong style="color: #e0e0f0;">$6.99/mes</strong></span>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 32px 48px 40px;">
                    <table cellpadding="0" cellspacing="0" width="100%" style="background: #0f0f1a; border-radius: 12px; border: 1px solid #1a1a2e;">
                      <tr>
                        <td align="center" style="padding: 20px 24px;">
                          <p style="color: #6b6b80; font-size: 12px; line-height: 1.5; margin: 0;">
                            ¿No solicitaste esta verificación? Puedes ignorar este mensaje.<br>
                            Si tienes alguna duda, contáctanos en <a href="mailto:soporte@pelis.app" style="color: #8b5cf6; text-decoration: none;">soporte@pelis.app</a>
                          </p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 0 48px 40px;">
                    <table cellpadding="0" cellspacing="0" width="100%">
                      <tr>
                        <td align="center">
                          <p style="color: #4a4a5a; font-size: 12px; margin: 0;">
                            &copy; ${new Date().getFullYear()} Pelis &mdash; Hecho para amantes del cine
                          </p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `,
  });
}

authClient.registerRoutes(http, (httpCtx) => {
  const run = {
    mutation: (fn: any, args: any) => (httpCtx as any).runMutation(fn, args),
    query: (fn: any, args: any) => (httpCtx as any).runQuery(fn, args),
  };

  const syncUser = async (doc: any) => {
    if (!doc || !doc.id || !doc.email) return;
    await run.mutation(api.users.upsertUser, {
      userId: doc.id,
      email: doc.email,
      name: doc.name ?? doc.email,
      emailVerified: !!doc.emailVerified,
      verifiedAt: doc.emailVerified ? Date.now() : undefined,
    });
  };

  return betterAuth({
    baseURL: siteUrl,
    secret: process.env.BETTER_AUTH_SECRET!,
    trustedOrigins: [siteUrl],
    database: authClient.adapter(httpCtx),
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
    databaseHooks: {
      user: {
        create: {
          after: async (user: any) => {
            await syncUser(user);
          },
        },
        update: {
          after: async (user: any) => {
            const docs = Array.isArray(user) ? user : [user];
            for (const doc of docs) await syncUser(doc);
          },
        },
      },
      session: {
        create: {
          after: async (session: any) => {
            if (!session?.userId) return;
            const expiresAt =
              typeof session.expiresAt === 'number'
                ? session.expiresAt
                : new Date(session.expiresAt).getTime();
            await run.mutation(api.users.recordLogin, {
              userId: session.userId,
              expiresAt: Number.isFinite(expiresAt) ? expiresAt : 0,
            });
          },
        },
      },
    },
    plugins: [
      convex({
        authConfig: {
          providers: [getAuthConfigProvider()],
        },
      }),
    ],
    session: {
      expiresIn: 60 * 60 * 24 * 7,
      updateAge: 60 * 60 * 24,
    },
  });
});

http.route({
  path: '/api/auth/email-otp/send-verification-otp',
  method: 'POST',
  handler: httpAction(async (ctx, request) => {
    const body = await request.json().catch(() => null);
    const email = String(body?.email ?? '').toLowerCase().trim();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return jsonResponse({ message: 'Correo inválido' }, 400);
    }

    const baUser = await ctx.runQuery(components.betterAuth.adapter.findOne, {
      model: 'user',
      where: [{ field: 'email', operator: 'eq', value: email }],
    });
    if (!baUser) {
      return jsonResponse({ message: 'No existe una cuenta con este correo' }, 404);
    }

    const existing = await ctx.runQuery(api.users.getByEmail, { email });
    const now = Date.now();
    const lastSent = existing?.otpLastSentAt ?? 0;
    if (lastSent > 0 && now - lastSent < OTP_COOLDOWN_MS) {
      const remaining = Math.ceil((OTP_COOLDOWN_MS - (now - lastSent)) / 1000);
      return jsonResponse(
        { message: `Vuelve a intentarlo en ${remaining} segundos` },
        429
      );
    }

    const otp = String(Math.floor(100000 + Math.random() * 900000));
    try {
      const { error: sendError } = await sendVerificationEmail(email, otp);
      if (sendError) {
        console.error('Error enviando email de verificación', sendError);
        return jsonResponse({ message: 'Error al enviar el código' }, 500);
      }
    } catch (err) {
      console.error('Error enviando email de verificación', err);
      return jsonResponse({ message: 'Error al enviar el código' }, 500);
    }

    await ctx.runMutation(api.users.setOtp, {
      userId: baUser.id ?? baUser._id,
      email,
      name: baUser.name ?? email,
      otp,
      otpExpiresAt: now + OTP_EXPIRES_MS,
      otpLastSentAt: now,
    });

    return jsonResponse({ success: true });
  }),
});

http.route({
  path: '/api/auth/email-otp/verify-email',
  method: 'POST',
  handler: httpAction(async (ctx, request) => {
    const body = await request.json().catch(() => null);
    const email = String(body?.email ?? '').toLowerCase().trim();
    const otp = String(body?.otp ?? '').trim();
    if (!email || !otp) {
      return jsonResponse({ message: 'Correo o código inválido' }, 400);
    }

    const result = await ctx.runMutation(api.users.verifyOtp, { email, otp });
    if (!result.ok) {
      return jsonResponse({ message: result.message }, result.status);
    }

    return jsonResponse({ status: true, token: null, user: result.user });
  }),
});

http.route({
  path: '/stripe/webhook',
  method: 'POST',
  handler: httpAction(async (ctx, request) => {
    const body = await request.text();
    const signature = request.headers.get('stripe-signature');

    if (!signature) {
      return new Response('Missing stripe-signature header', { status: 400 });
    }

    const result = await ctx.runAction(internal.stripeWebhookAction.processWebhook, {
      body,
      signature,
    });

    if (!result.ok) {
      return new Response(result.message ?? 'Webhook error', { status: result.status });
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }),
});

export default http;
