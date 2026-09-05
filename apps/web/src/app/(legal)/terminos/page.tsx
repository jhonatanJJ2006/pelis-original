import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Términos de uso — Pelis',
  description: 'Condiciones de uso del servicio de streaming Pelis (verpelis.pro)',
};

const updated = '5 de septiembre de 2026';

export default function TerminosPage() {
  return (
    <article className="container mx-auto max-w-3xl">
      <p className="text-cinema-accent text-xs font-medium uppercase tracking-[0.24em] mb-3">
        Legal
      </p>
      <h1 className="font-display text-3xl md:text-4xl tracking-tight text-cinema-chalk mb-2">
        Términos de uso
      </h1>
      <p className="text-cinema-muted text-sm mb-10">Última actualización: {updated}</p>

      <div className="space-y-8 text-cinema-silver text-sm md:text-base leading-relaxed">
        <section className="space-y-3">
          <h2 className="font-display text-xl text-cinema-chalk tracking-wide">1. Qué es Pelis</h2>
          <p>
            Pelis es un servicio web (y aplicaciones relacionadas) disponible en{' '}
            <strong className="text-cinema-chalk">verpelis.pro</strong> que permite explorar y
            reproducir catálogo de películas, series, anime y canales de TV en streaming, gestionar
            favoritos e historial de reproducción, y contratar planes de suscripción cuando están
            disponibles.
          </p>
          <p>
            Estos términos regulan el acceso y uso de la plataforma. Al crear una cuenta, iniciar
            sesión o usar el servicio, aceptas estas condiciones.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="font-display text-xl text-cinema-chalk tracking-wide">2. Cuenta y acceso</h2>
          <ul className="list-disc pl-5 space-y-2">
            <li>
              Puedes registrarte con email y contraseña (verificación por código enviado al correo)
              o, si está configurado, con Google.
            </li>
            <li>Eres responsable de mantener la confidencialidad de tus credenciales.</li>
            <li>
              La reproducción de contenido protegido por plan requiere sesión iniciada y, salvo
              cuentas de administración, un plan de suscripción activo.
            </li>
            <li>
              Podemos suspender o restringir cuentas (por ejemplo, cuentas marcadas como bloqueadas
              en el sistema) cuando sea necesario para proteger el servicio o a otros usuarios.
            </li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="font-display text-xl text-cinema-chalk tracking-wide">
            3. Suscripciones y pagos
          </h2>
          <p>
            Los planes se muestran en la página de suscripción. Los pagos se procesan a través de{' '}
            <strong className="text-cinema-chalk">Stripe</strong> (checkout y portal de facturación).
            El acceso al plan se activa o actualiza según los eventos de pago/suscripción que
            recibimos de Stripe.
          </p>
          <p>
            Precios, duración y características de cada plan son los publicados en la aplicación en
            el momento de la compra. La gestión de métodos de pago, facturas y cancelaciones se
            realiza principalmente desde el portal de Stripe cuando está disponible.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="font-display text-xl text-cinema-chalk tracking-wide">4. Uso permitido</h2>
          <p>Te comprometes a usar Pelis de forma lícita y razonable. En particular, no debes:</p>
          <ul className="list-disc pl-5 space-y-2">
            <li>Intentar eludir controles de acceso, planes o medidas de seguridad.</li>
            <li>Abusar de la API, automatizar scrapes masivos o sobrecargar el servicio.</li>
            <li>Suplantar identidades o interferir con cuentas de terceros.</li>
            <li>Usar el servicio de forma que vulnere derechos de terceros o la ley aplicable.</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="font-display text-xl text-cinema-chalk tracking-wide">
            5. Contenido y terceros
          </h2>
          <p>
            El catálogo y las reproducciones pueden apoyarse en metadatos e infraestructura de
            terceros (por ejemplo, enriquecimiento de fichas, proveedores de anime/streaming o
            listas de TV). Pelis no garantiza disponibilidad ininterrumpida de cada título,
            episodio o canal, ni que todas las fuentes externas estén siempre operativas.
          </p>
          <p>
            No afirmamos titularidad exclusiva sobre obras audiovisuales de terceros. Las marcas y
            títulos pertenecen a sus respectivos titulares.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="font-display text-xl text-cinema-chalk tracking-wide">
            6. Disponibilidad y cambios
          </h2>
          <p>
            El servicio se ofrece «tal cual». Podemos modificar catálogo, funciones, planes o estos
            términos. Cuando cambiemos condiciones relevantes, actualizaremos la fecha de esta
            página. El uso continuado tras un cambio razonable implica aceptación de la versión
            vigente.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="font-display text-xl text-cinema-chalk tracking-wide">
            7. Limitación de responsabilidad
          </h2>
          <p>
            En la medida permitida por la ley aplicable, Pelis no responde por daños indirectos,
            pérdida de datos derivada de fallos de terceros, o interrupciones ajenas a nuestro
            control razonable. Nada en estos términos excluye responsabilidades que no puedan
            limitarse legalmente.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="font-display text-xl text-cinema-chalk tracking-wide">8. Privacidad</h2>
          <p>
            El tratamiento de datos personales se describe en la{' '}
            <Link href="/privacidad" className="text-cinema-gold hover:text-cinema-gold-light underline">
              Política de privacidad
            </Link>
            .
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="font-display text-xl text-cinema-chalk tracking-wide">9. Contacto</h2>
          <p>
            Para consultas sobre estos términos puedes escribirnos al correo de soporte asociado al
            dominio del servicio (verpelis.pro). No publicamos aquí domicilio fiscal ni datos de
            representante legal porque no están configurados en la aplicación.
          </p>
        </section>
      </div>
    </article>
  );
}
