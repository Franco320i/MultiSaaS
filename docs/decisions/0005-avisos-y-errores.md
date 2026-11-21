# 0005 · Avisos y errores: sin correos automáticos, sin suspensión automática y Sentry

Fecha: 2026-11-21 · Estado: aceptada · Etapa 10d

Cambia las secciones 9, 10 y 14 del diseño (`docs/diseno-tecnico-v1.md`) y el punto 7 de la decisión 0004.

## Contexto

El diseño preveía para 10d dos correos (aviso de prueba por vencer al dueño del comercio y resumen diario a la plataforma) y la suspensión automática a los 5 días de `past_due`. Antes de abrir a los primeros comercios reales, el dueño de la plataforma definió cómo quiere operar:

- Cobro y confirmación de pago **manuales** por ahora; el cobro automático se verá más adelante.
- **No** quiere correos de resumen ni de comercios nuevos: prefiere mirar el panel central.
- **No** quiere correos de vencimiento a los comercios: si alguien quiere dejar el servicio, se lo dice a él.
- **Sí** quiere enterarse cuando algo falla o a un cliente no le funciona algo.

## Decisiones

1. **La tarea diaria no suspende sola.** Solo pasa a `past_due` lo vencido sin pago (el catálogo sigue visible) y limpia. Con cobro manual y sin avisos, suspender solo podía cortar el catálogo de alguien que ya pagó y todavía no estaba registrado. Suspender queda como acción del panel central, con motivo (`admin_set_tenant_status`). Migración `20261121174420_core_daily_no_auto_suspend.sql` (misma firma de `private.daily_maintenance`; devuelve `past_due` y `rate_limits_cleaned`).
2. **Sin correos automáticos.** La función ya no calcula avisos de prueba por vencer. Lo que había que avisar se ve en el panel central: Resumen y filtros "Pruebas que vencen en 7 días" y "Pago pendiente". El dueño del comercio ve "Pago pendiente" como estado en el inicio de su panel.
3. **Sentry solo para errores** (`@sentry/nextjs` 11.11.0, versión de dos semanas al instalar):
   - Servidor: `src/instrumentation.ts` (`register` + `onRequestError` con `captureRequestError`). Navegador: `src/instrumentation-client.ts`, que carga Sentry aparte y solo si hay DSN, para no sumar peso a la primera carga del catálogo. `src/app/global-error.tsx` avisa si falla todo el layout.
   - Sin `withSentryConfig` ni subida de mapas de código: no hace falta otra clave y el build no cambia. Los errores del navegador llegan con el código minificado; si molesta, se agrega más adelante con un `SENTRY_AUTH_TOKEN`.
   - Sin trazas de rendimiento ni grabación de sesiones (`tracesSampleRate: 0`): cuota gratis y privacidad.
   - Privacidad (`src/lib/observability/scrub.ts`, probado): `sendDefaultPii: false` y un filtro antes de enviar que borra cuerpo, cookies, headers y parámetros de las URLs, usuario e IP, datos extra, migas de consola y variables locales, y tacha teléfonos y correos en mensajes y errores. El comercio queda como etiqueta `host` (el diseño decía `tenant_id`: el host lo identifica igual y no hace falta consultarlo).
   - Variables opcionales `NEXT_PUBLIC_SENTRY_DSN` (el DSN no es secreto: solo permite enviar errores a ese proyecto) y `NEXT_PUBLIC_SENTRY_ENVIRONMENT` (`staging` / `production`). Sin DSN no se envía nada: local, CI y E2E no mandan errores.
   - Verificado en local con un receptor falso: un error de una ruta y uno del navegador llegaron sin teléfono, correo, dirección ni parámetros.
   - Los avisos por correo los manda Sentry al dueño de la cuenta (alerta de "problema nuevo", activa por defecto).

## Pendiente

- Cobro automático (Mercado Pago): cuando el dueño lo decida. Con él puede volver la suspensión automática.
- La página principal sigue diciendo "14 días gratis · Sin tarjeta": correcto con cobro manual.
