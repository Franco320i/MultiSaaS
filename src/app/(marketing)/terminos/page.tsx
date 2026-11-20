import type { Metadata } from "next";
import { LegalPage, Pending } from "../_components/legal-page";

// Borrador redactado a partir de lo que la plataforma hace. Antes de producción (etapa 10e):
// completar los datos del responsable, que lo revise un abogado y sacar el noindex.
export const metadata: Metadata = {
  title: "Términos y condiciones",
  robots: { index: false, follow: false },
};

export default function TermsPage() {
  return (
    <LegalPage title="Términos y condiciones" updated="20 de noviembre de 2026">
      <p>
        Estos términos regulan el uso de Vidri, un servicio de <Pending>nombre o razón social</Pending>, CUIT{" "}
        <Pending>CUIT</Pending>, con domicilio en <Pending>domicilio</Pending>. Al crear una cuenta, aceptás estos términos.
        Contacto: <Pending>correo de contacto</Pending>.
      </p>

      <h2>Qué es Vidri</h2>
      <p>
        Vidri permite a un comercio publicar un catálogo digital y recibir pedidos que llegan a su WhatsApp y a su panel. Vidri
        no vende productos ni cobra las ventas: la venta, el cobro y la entrega son entre el comercio y su cliente.
      </p>

      <h2>Prueba gratis y abono</h2>
      <ul>
        <li>Cada comercio nuevo tiene 14 días de prueba gratis, sin cargar tarjeta.</li>
        <li>Después, el servicio se paga por mes según el plan elegido. Los precios están publicados en la página principal.</li>
        <li>No hay permanencia mínima ni comisiones por venta.</li>
        <li>Si el abono no se paga, el catálogo se pausa. Los datos quedan guardados y se reactiva al pagar.</li>
        <li>Podemos cambiar los precios avisando con anticipación. El cambio corre desde el período siguiente.</li>
      </ul>

      <h2>Responsabilidad del comercio</h2>
      <ul>
        <li>Es responsable por sus productos, precios, fotos, descripciones, promociones, entregas y por cumplir las normas que le correspondan, incluidas las de defensa del consumidor.</li>
        <li>Tiene que tener los derechos sobre las fotos y textos que publica.</li>
        <li>Tiene que usar los datos de sus clientes solo para atender sus pedidos.</li>
        <li>Es responsable de cuidar su contraseña y de lo que se haga desde su cuenta.</li>
      </ul>

      <h2>Uso aceptable</h2>
      <p>
        No se puede usar Vidri para vender productos ilegales, publicar contenido engañoso u ofensivo, enviar spam ni intentar
        acceder a datos de otros comercios. Podemos pausar o dar de baja una cuenta que incumpla estas reglas.
      </p>

      <h2>Disponibilidad</h2>
      <p>
        Hacemos lo posible para que el servicio funcione sin cortes, pero puede haber interrupciones por mantenimiento o fallas
        de proveedores. No respondemos por ventas perdidas por esas interrupciones, salvo lo que disponga la ley.
      </p>

      <h2>Baja</h2>
      <p>El comercio puede dejar de usar Vidri cuando quiera, dejando de pagar el abono o pidiéndolo por correo.</p>

      <h2>Cambios en estos términos</h2>
      <p>Si los cambiamos, lo publicamos en esta página y avisamos a los comercios por correo.</p>

      <h2>Ley aplicable</h2>
      <p>
        Estos términos se rigen por las leyes de la República Argentina. <Pending>jurisdicción</Pending>.
      </p>
    </LegalPage>
  );
}
