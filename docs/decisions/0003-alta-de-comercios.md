# 0003 · Alta de comercios: cómo se implementó lo que el diseño no detallaba

Fecha: 2026-11-17 · Estado: aceptada · Etapa 8

Completa la sección 10 del diseño (`docs/diseno-tecnico-v1.md`). Si se cambia algo de esto, actualizar también el diseño.

## Decisiones

1. **`provision_tenant` y `set_tenant_published` corren con la clave secreta** desde `src/core/tenancy/provision.ts` (lista cerrada "alta de comercios"; figura en `SERVICE_KEY_ALLOWED`). Los envoltorios `public.*` son `SECURITY INVOKER` y solo los ejecuta `service_role`. El usuario sale de la sesión verificada y el comercio de `requireTenantAccess`.
2. **Un comercio por usuario en el autoservicio.** Si el usuario ya es dueño, `provision_tenant` devuelve ese comercio (`created: false`): un doble envío no crea dos y el asistente retoma. Varios comercios por persona quedan para el alta asistida (etapa 9).
3. **`private.user_is_confirmed`:** `service_role` no puede leer `auth.users` y no se tocan los permisos del esquema `auth`. La función, `security definer` en `private`, responde solo true o false.
4. **Correo de confirmación propio** (`supabase/templates/confirmation.html`) con enlace `token_hash` a `{SiteURL}/auth/callback?…&next=/nuevo`. El registro ocurre en el dominio principal y la confirmación vuelve a `app.`. Con el flujo PKCE por defecto, la clave de verificación quedaría en el otro host. En staging y producción hay que cargar la misma plantilla en el proyecto de Supabase.
5. **Registro con el cliente público, sin cookies**, porque el dominio principal nunca guarda sesiones. Supabase responde igual exista o no la cuenta.
6. **Módulo `settings`** para el asistente y Ajustes (configuración, horarios, marca y publicación). No es catálogo ni pedidos, y `core` no lleva interfaz.
7. **Una paleta de 9 colores para todos los rubros**, todos con texto blanco legible (AA). Cada rubro arranca con su color propio (`business_templates.default_theme.brand`). El diseño decía "colores dentro de la paleta de la plantilla"; una sola paleta es más simple y cumple la intención.
8. **Publicar invalida también `host:{host}`:** la respuesta cacheada de un comercio "no disponible" no lleva el tag del comercio, para no revelar su id.
9. **Rutas de logo y portada validadas en el catálogo:** solo se acepta `{tenant}/branding/{logo|cover}-{uuid}`, porque terminan dentro de un `url("…")` de CSS y el dueño puede escribir esas columnas con su sesión.
10. **Slug `nuevo` reservado**, porque es la ruta del asistente en el panel (`app.{dominio}/nuevo`).
11. **Importador:** pegado de celdas (tabulaciones, o punto y coma como CSV), hasta 300 filas, con vista previa y errores por fila. Los productos entran publicados y disponibles, y las categorías se reusan por nombre o se crean. Si el plan llega a su límite, se corta y se informa.
