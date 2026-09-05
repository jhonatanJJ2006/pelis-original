import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Política de privacidad — Pelis',
  description:
    'Cómo trata Pelis (verpelis.pro) los datos personales según el funcionamiento real del servicio',
};

const updated = '5 de septiembre de 2026';

export default function PrivacidadPage() {
  return (
    <article className="container mx-auto max-w-3xl">
      <p className="text-cinema-accent text-xs font-medium uppercase tracking-[0.24em] mb-3">
        Legal
      </p>
      <h1 className="font-display text-3xl md:text-4xl tracking-tight text-cinema-chalk mb-2">
        Política de privacidad
      </h1>
      <p className="text-cinema-muted text-sm mb-10">Última actualización: {updated}</p>

      <div className="space-y-8 text-cinema-silver text-sm md:text-base leading-relaxed">
        <section className="space-y-3">
          <h2 className="font-display text-xl text-cinema-chalk tracking-wide">1. Responsable</h2>
          <p>
            El servicio <strong className="text-cinema-chalk">Pelis</strong> opera en{' '}
            <strong className="text-cinema-chalk">verpelis.pro</strong>. Esta política describe qué
            datos trata la aplicación según su código y base de datos actuales. No inventamos
            domicilio societario, DPO ni prácticas que no existan en el sistema.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="font-display text-xl text-cinema-chalk tracking-wide">
            2. Datos que tratamos
          </h2>
          <p>Según el esquema y flujos de la app, podemos tratar:</p>
          <ul className="list-disc pl-5 space-y-2">
            <li>
              <strong className="text-cinema-chalk">Cuenta:</strong> email, nombre, imagen de perfil
              (si el proveedor la aporta), verificación de email, rol (usuario/admin) y, en su caso,
              estado de bloqueo.
            </li>
            <li>
              <strong className="text-cinema-chalk">Autenticación:</strong> contraseña (gestionada
              por Better Auth), códigos OTP temporales de verificación, sesiones (token, caducidad)
              y, cuando Better Auth lo registra, dirección IP y user-agent de la sesión.
            </li>
            <li>
              <strong className="text-cinema-chalk">OAuth Google:</strong> identificadores y tokens
              de cuenta vinculados al proveedor Google cuando inicias sesión con Google.
            </li>
            <li>
              <strong className="text-cinema-chalk">Uso del catálogo:</strong> favoritos de
              películas e historial de reproducción (progreso y duración asociados a títulos).
            </li>
            <li>
              <strong className="text-cinema-chalk">Suscripción:</strong> plan contratado, fechas,
              estado y referencias de Stripe (cliente, suscripción y precio) necesarias para cobrar
              y mantener el acceso.
            </li>
            <li>
              <strong className="text-cinema-chalk">Operación:</strong> marcas de último inicio de
              sesión y caducidad de sesión para seguridad y soporte.
            </li>
          </ul>
          <p>
            El catálogo (películas, series, anime, TV) es contenido del servicio; no es dato
            personal salvo cuando se vincula a tu cuenta (favoritos, historial, plan).
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="font-display text-xl text-cinema-chalk tracking-wide">3. Finalidades</h2>
          <ul className="list-disc pl-5 space-y-2">
            <li>Crear y autenticar tu cuenta (email/contraseña, OTP o Google).</li>
            <li>Permitir favoritos, historial y reproducción según tu plan.</li>
            <li>Gestionar suscripciones y pagos con Stripe.</li>
            <li>Enviar emails transaccionales de verificación (Resend).</li>
            <li>Mantener la seguridad del servicio (sesiones, roles, bloqueos).</li>
            <li>
              Enriquecer fichas del catálogo con metadatos/imágenes de terceros (p. ej. TMDB,
              AniList).
            </li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="font-display text-xl text-cinema-chalk tracking-wide">
            4. Base y necesidad
          </h2>
          <p>
            Tratamos estos datos porque son necesarios para prestar el servicio que solicitas
            (cuenta, streaming con plan, favoritos/historial y facturación). El login con Google
            implica que Google te autentica y nos comunica los datos de perfil necesarios para abrir
            o vincular la sesión.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="font-display text-xl text-cinema-chalk tracking-wide">
            5. Encargados y terceros
          </h2>
          <p>Según la configuración del proyecto, intervienen entre otros:</p>
          <ul className="list-disc pl-5 space-y-2">
            <li>
              <strong className="text-cinema-chalk">Google</strong> — inicio de sesión OAuth (si
              está habilitado con credenciales de cliente).
            </li>
            <li>
              <strong className="text-cinema-chalk">Stripe</strong> — pagos y portal de suscripción.
            </li>
            <li>
              <strong className="text-cinema-chalk">Resend</strong> — envío del código de
              verificación por email.
            </li>
            <li>
              <strong className="text-cinema-chalk">TMDB / AniList</strong> — metadatos e imágenes
              de catálogo (no son tu cuenta de usuario).
            </li>
            <li>
              <strong className="text-cinema-chalk">Proveedores de streaming de anime/TV</strong>{' '}
              (p. ej. integraciones tipo Consumet, Vidnest, AnimeFLV, Latanime u otros embeds
              configurados) — para obtener o reproducir fuentes; pueden recibir identificadores de
              título/episodio necesarios para la reproducción, no tu contraseña.
            </li>
            <li>
              <strong className="text-cinema-chalk">Alojamiento / base de datos</strong> — Postgres
              y la infraestructura donde corre la app.
            </li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="font-display text-xl text-cinema-chalk tracking-wide">6. Cookies</h2>
          <p>
            Usamos cookies de sesión de autenticación (Better Auth): preferiblemente HttpOnly,
            SameSite=Lax y Secure cuando el sitio se sirve por HTTPS en producción. Son necesarias
            para mantener tu sesión iniciada. No hay en el código un panel de cookies de marketing
            de terceros.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="font-display text-xl text-cinema-chalk tracking-wide">7. Conservación</h2>
          <p>
            Conservamos la cuenta y datos asociados mientras la cuenta exista y sea necesaria para
            el servicio (sesiones con caducidad configurable, OTP de corta duración, suscripciones e
            historial/favoritos mientras no los borres o se eliminen con la cuenta). No hay en el
            código una política automática de borrado por inactividad publicada; si necesitas
            eliminación de cuenta, contacta al soporte del dominio.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="font-display text-xl text-cinema-chalk tracking-wide">8. Tus opciones</h2>
          <ul className="list-disc pl-5 space-y-2">
            <li>Consultar y actualizar datos de perfil desde la cuenta cuando la UI lo permita.</li>
            <li>Gestionar favoritos y borrar historial desde las funciones de la app.</li>
            <li>Gestionar la suscripción vía portal de Stripe cuando esté disponible.</li>
            <li>Cerrar sesión en cualquier momento.</li>
            <li>
              Solicitar información o borrado de cuenta contactando el soporte de verpelis.pro (no
              hay aún un flujo de auto-borrado completo en la app).
            </li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="font-display text-xl text-cinema-chalk tracking-wide">
            9. Menores y clasificaciones
          </h2>
          <p>
            El catálogo puede incluir etiquetas de clasificación en fichas. Pelis no implementa un
            sistema avanzado de control parental ni verificación de edad más allá de lo que exija el
            registro ordinario. Si eres menor, usa el servicio solo con supervisión adecuada.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="font-display text-xl text-cinema-chalk tracking-wide">10. Cambios</h2>
          <p>
            Podemos actualizar esta política para reflejar cambios reales del producto. La fecha de
            «última actualización» se revisará en esta página. Ver también los{' '}
            <Link
              href="/terminos"
              className="text-cinema-gold hover:text-cinema-gold-light underline"
            >
              Términos de uso
            </Link>
            .
          </p>
        </section>
      </div>
    </article>
  );
}
