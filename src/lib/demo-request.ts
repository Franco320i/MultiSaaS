/**
 * Links al WhatsApp de la plataforma (rediseño 11e: sin registro ni correos, todo se
 * coordina por WhatsApp). El número sale de SALES_WHATSAPP (+549…); sin él no hay link
 * y no se muestra el botón.
 */
function platformWhatsappUrl(salesWhatsapp: string | undefined, text: string): string | null {
  if (!salesWhatsapp) return null;
  return `https://wa.me/${salesWhatsapp.replace(/^\+/, "")}?text=${encodeURIComponent(text)}`;
}

/** "Pedí tu demo". */
export const demoRequestUrl = (salesWhatsapp: string | undefined) =>
  platformWhatsappUrl(salesWhatsapp, "Hola, quiero una demo de Vidri para mi local.");

/** "Olvidé mi contraseña": la plataforma genera una nueva desde el panel central. */
export const passwordHelpUrl = (salesWhatsapp: string | undefined) =>
  platformWhatsappUrl(salesWhatsapp, "Hola, me olvidé la contraseña de mi panel de Vidri.");
