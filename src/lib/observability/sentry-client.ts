// Solo lo que usa el navegador. Importar nombres sueltos (y no todo el módulo) deja afuera
// la grabación de sesiones, el formulario de comentarios y las trazas, que no usamos:
// el bloque que baja el navegador pasa de ~180 KB a una fracción.
import { captureException, init } from "@sentry/nextjs";

export { captureException, init };
