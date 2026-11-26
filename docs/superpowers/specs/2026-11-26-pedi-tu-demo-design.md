# Rediseño 11e (parte a): "Pedí tu demo" sin registro · diseño corto

Aprobado por el usuario el 2026-11-26. El modo soporte con edición va en la parte b, porque cambia quién puede escribir en los datos de un comercio.

## Por qué

El usuario arma cada catálogo a mano y lo coordina todo por WhatsApp con el dueño del local. No quiere que nadie se registre solo ni que la app mande correos. Él le pasa al dueño el correo y la contraseña por WhatsApp, y el dueño maneja su propio panel.

## Recorrido

1. El cliente toca **"Pedí tu demo"** en `vidri.ar`. Se abre el WhatsApp de la plataforma con el texto "Hola, quiero una demo de Vidri para mi local".
2. El usuario crea el comercio en **Alta asistida** con el correo del dueño. Si el dueño no tiene cuenta, se crea una con el correo ya confirmado y una **contraseña generada**, que se muestra una sola vez con "Copiar". No sale ningún correo.
3. El usuario arma el catálogo (por ahora con el modo soporte de solo lectura; la edición llega en la parte b) y le manda al dueño por WhatsApp el link del panel, el correo y la contraseña.
4. El dueño entra y la cambia desde Mi local → **"Tu contraseña"**.
5. Si se olvida la contraseña, el usuario toca **"Nueva contraseña"** en la ficha del comercio y se la manda de nuevo. Queda en la auditoría y el dueño lo ve en "Accesos de la plataforma".

## Qué se hace

- **Página principal:** "Probar gratis", "Crear mi catálogo gratis" y "Empezar gratis" pasan a **"Pedí tu demo"** (`wa.me/{SALES_WHATSAPP}`).
  - "Cómo funciona" queda en: Nos escribís por WhatsApp → Te armamos el catálogo → Compartís el link y el QR.
  - Los "14 días gratis" siguen, porque el alta asistida crea el comercio en prueba.
  - Variable nueva **`SALES_WHATSAPP`**, opcional, en formato `+549…`. Sin ella no se muestran los botones de demo, así la página no tiene un botón que no funciona.
- **Sin registro:**
  - Se borran `/registro` (formulario, acción y `registerUser`) y `/nuevo` (asistente paso 1, `provisionTenantAction`, `ProvisionForm` y `provisionTenant`).
  - Un usuario sin comercio ve "Todavía no tenés un local" y el botón "Pedí tu demo".
  - El login cambia "¿No tenés cuenta? Creá tu catálogo" por "Pedí tu demo".
  - Supabase Auth con `enable_signup = false`: en local por `config.toml`, y en staging y producción a mano en el panel. Sin eso, cualquiera podría crear usuarios llamando directo a la API. La API de administración (`auth.admin.createUser`) sigue andando.
- **"Olvidé mi contraseña":** `/auth/recuperar` deja de mandar correos y dice que escriban por WhatsApp para recibir una nueva.
- **Alta asistida:** `auth.admin.createUser({ email, password, email_confirm: true })` en lugar de `inviteUserByEmail`.
  - La contraseña tiene 12 caracteres al azar sin letras confusas (`generatePassword`, con `crypto`).
  - La pantalla de éxito muestra el correo, la contraseña y el link del panel, con "Copiar todo".
  - Si el dueño ya tenía cuenta, no se toca su contraseña.
- **"Nueva contraseña" en la ficha** (solo superadmin):
  - Busca al dueño del comercio y le pone una contraseña generada (`auth.admin.updateUserById`).
  - Lo registra con `private.admin_log_owner_password_reset` (migración nueva: audit `owner.password_reset`) y muestra la contraseña una vez.
- **"Tu contraseña" en Mi local:** lleva a `/auth/nueva-contrasena`, que ya existe, con "‹ Volver".
  - Si Supabase pide volver a ingresar (`reauthentication_needed`, por `secure_password_change`), se explica qué hacer.
- **Catálogo de ejemplo:** ya está programado (`DEMO_CATALOG_SLUG`, `DEMO_TENANT_ID`). El usuario lo crea con el alta asistida y carga las dos variables. Se documenta en la guía.

## Fuera

- El modo soporte con edición queda para la parte b.
- La función `public.provision_tenant` queda en la base sin uso, porque sin registro no hay quién la llame. Se puede borrar en otra migración.

## Decisiones mías

- **Contraseña generada y no elegida por el usuario.** Evita contraseñas repetidas entre locales. El dueño la cambia apenas entra.
- **`SALES_WHATSAPP` opcional:** así local, CI y staging no se rompen hasta que se cargue el número.
- **La E2E del registro pasa a ser del alta.** Crea el dueño y el comercio con la API de administración (como la alta asistida), entra con la contraseña generada, importa, publica y pide.
