import type { Metadata } from "next";
import { LegalPage, Pending } from "../_components/legal-page";

// Borrador redactado a partir de lo que la plataforma hace. Antes de producción (etapa 10e):
// completar los datos del responsable, que lo revise un abogado y sacar el noindex.
export const metadata: Metadata = {
  title: "Política de privacidad",
  robots: { index: false, follow: false },
};

export default function PrivacyPage() {
  return (
    <LegalPage title="Política de privacidad" updated="20 de noviembre de 2026">
      <p>
        Esta política explica qué datos personales trata Vidri, para qué y cuáles son tus derechos. El responsable es{" "}
        <Pending>nombre o razón social</Pending>, CUIT <Pending>CUIT</Pending>, con domicilio en <Pending>domicilio</Pending>. Para
        cualquier consulta sobre tus datos, escribinos a <Pending>correo de contacto</Pending>.
      </p>

      <h2>Qué datos tratamos</h2>
      <ul>
        <li>
          <strong>De los comercios que usan Vidri:</strong> correo y contraseña de la cuenta, nombre del comercio, WhatsApp,
          dirección, horarios, productos, fotos y los pagos del abono.
        </li>
        <li>
          <strong>De quienes compran en un catálogo:</strong> nombre, teléfono, dirección de entrega (si eligen envío), notas y
          los productos del pedido.
        </li>
        <li>
          <strong>Datos técnicos:</strong> una versión irreconocible de la dirección IP (no guardamos la IP real) para frenar abusos y los registros normales de
          funcionamiento del servicio.
        </li>
      </ul>

      <h2>Para qué los usamos</h2>
      <p>
        Para dar el servicio: mostrar el catálogo, registrar los pedidos y hacérselos llegar al comercio, cobrar el abono,
        enviar los correos de la cuenta y proteger la plataforma contra fraudes y bots. No vendemos datos ni los usamos para
        publicidad.
      </p>

      <h2>Quién más los ve</h2>
      <p>
        Los datos de un pedido los ve el comercio al que le compraste, que es quien decide qué hacer con ellos para entregarte
        el pedido. Para funcionar usamos estos proveedores, que tratan datos por cuenta nuestra:
      </p>
      <ul>
        <li>Supabase: base de datos, cuentas y archivos.</li>
        <li>Vercel: alojamiento de la aplicación.</li>
        <li>Resend: envío de correos.</li>
        <li>Cloudflare Turnstile: verificación contra bots en formularios.</li>
      </ul>
      <p>Algunos de estos proveedores guardan datos fuera de la Argentina.</p>

      <h2>Cookies y datos en tu navegador</h2>
      <p>
        El panel de los comercios usa cookies solo para mantener la sesión iniciada. En los catálogos, el pedido en curso y los
        datos que cargás para comprar se guardan en tu propio navegador para que no tengas que escribirlos de nuevo. No usamos
        cookies de publicidad.
      </p>

      <h2>Cuánto tiempo los guardamos</h2>
      <p>
        Mientras la cuenta del comercio esté activa y, después, el tiempo que exijan las obligaciones legales y contables.
      </p>

      <h2>Tus derechos</h2>
      <p>
        Podés pedir acceder a tus datos, corregirlos o eliminarlos escribiendo a <Pending>correo de contacto</Pending>. Si
        compraste en un catálogo, también podés pedírselo al comercio. La Agencia de Acceso a la Información Pública, órgano de
        control de la Ley 25.326, atiende las denuncias y reclamos por incumplimiento de las normas de protección de datos
        personales.
      </p>

      <h2>Cambios</h2>
      <p>Si cambiamos esta política, lo publicamos en esta página con la fecha de actualización.</p>
    </LegalPage>
  );
}
