# Producción: paso a paso, límites de gasto y cómo publicar

La plataforma real, con comercios y datos de verdad (diseño, sección 14). Es igual a staging (`docs/runbooks/staging.md`), con tres diferencias: planes pagos, región São Paulo y publicación manual con las migraciones antes del código.

| Qué | Dirección |
| --- | --- |
| Página principal y registro | `vidri.ar` (`www.vidri.ar` redirige) |
| Panel de comercios | `app.vidri.ar` |
| Panel central | `admin.vidri.ar` |
| Catálogos | `{slug}.vidri.ar` |

## Piezas

- **Vercel:** el mismo equipo de staging pasado a **Pro** (Hobby no permite uso comercial). Proyecto nuevo `vidri` con rama de producción `produccion`, que la mueve solo el flujo "Publicar en producción" (ver más abajo). Los dos proyectos quedan en el mismo equipo porque el DNS de `vidri.ar` vive ahí.
- **Supabase:** organización nueva `vidri` en plan **Pro**, separada de la de staging, con el proyecto `vidri` en **South America (São Paulo)**. Copia diaria incluida en Pro.
- **Migraciones:** las aplica el flujo `.github/workflows/produccion.yml`, solo cuando lo disparás a mano, y recién después publica el código.
- **Correo:** Resend (el mismo dominio ya verificado, API key nueva). **Turnstile:** sitio nuevo para `vidri.ar`. **Sentry:** el mismo proyecto, entorno `production`.

## Parte 1: límites para que no llegue una factura sorpresa

La idea: cada servicio tiene un **techo**. Si alguien ataca la web o un catálogo se vuelve viral, el servicio se frena en vez de cobrar de más. **La contra:** frenar significa que la plataforma, o una parte, deja de andar hasta que lo revises. Para un negocio que arranca es preferible una caída de unas horas a una factura de cientos de dólares.

| Servicio | Plan | Costo fijo aprox. (verificar al pagar) | Techo | Qué pasa al llegar |
| --- | --- | --- | --- | --- |
| Vercel | Pro | USD 20 por mes por persona del equipo | Presupuesto de USD 30 extra, con pausa | Todos los sitios del proyecto muestran un error 503 hasta que lo reactives |
| Supabase | Pro | USD 25 por mes (incluye la base chica "Micro") | Spend Cap activado | Lo que supere la cuota del mes (tráfico, almacenamiento, usuarios) se restringe en vez de cobrarse |
| Resend | Free | USD 0 | Cuota del plan gratis (hoy 100 correos por día) | Los correos de confirmación dejan de salir hasta el día siguiente |
| Sentry | Developer (gratis) | USD 0 | Cuota del plan gratis | Deja de recibir errores hasta el mes siguiente |
| Cloudflare Turnstile | Gratis | USD 0 | — | — |
| GitHub | Free | USD 0 | 2.000 minutos de Actions por mes en repos privados | CI deja de correr hasta el mes siguiente |

**Flat Rate CDN de Vercel** (aparece al pagar Pro): incluye 1 millón de pedidos de archivos por mes (unas 30.000 a 50.000 visitas a catálogos; las fotos no cuentan porque salen de Supabase). Un pico corto no cambia nada. Solo si el **mes entero** pasa ese número, al mes siguiente sube de escalón (+USD 20 por 10 millones, y así hasta +USD 300). Ese escalón **no** lo frena el presupuesto de USD 30: se controla mirando Usage una vez por semana. Si se acerca al millón por un ataque, se bloquea el ataque (Parte 1.4) antes de que cierre el mes.

**Techo aproximado por mes: unos USD 75** (Vercel 20 + 30 de presupuesto, Supabase 25), más los impuestos que tu banco suma a los pagos en dólares.

Ningún límite es instantáneo: Vercel revisa el gasto cada pocos minutos, así que se puede pasar por unos centavos o dólares. Y en Supabase la base de datos se cobra siempre (es el fijo); el Spend Cap cubre el resto.

### 1.1 Tarjeta

- [ ] Pagá Vercel y Supabase con una **tarjeta virtual con tope mensual** (la ofrecen muchos bancos y billeteras). Si algo falla en los límites de abajo, el cobro rebota y no se pasa de ese tope. Un tope de USD 100 deja margen sobre el techo de arriba.
- [ ] Resend, Sentry y GitHub: **no cargues tarjeta**. Sin tarjeta no pueden cobrarte nada; si llegás a su cuota, se frenan.

### 1.2 Vercel (Settings del equipo → Billing → Spend Management)

- [ ] Activar Spend Management con un monto de **USD 30** (es gasto **por encima** de lo que incluye Pro).
- [ ] Avisos por correo (y SMS si querés) al 50 %, 75 % y 100 %.
- [ ] **"Pause production deployments" activado.** Sin esto, el presupuesto solo avisa y no frena. Se puede poner al equipo entero o a cada proyecto; con el del equipo alcanza.
- [ ] Para volver a prender después de una pausa: subir el monto **no alcanza**, hay que quitar la pausa en esa misma pantalla.
- [ ] Settings del equipo → Billing → revisá que no haya complementos pagos activados que no uses (por ejemplo análisis web pago, observabilidad avanzada o protección avanzada).

Lo que ya ayuda desde el código: las fotos **no** pasan por el optimizador de imágenes de Vercel (se sirven directo desde Supabase), así que un ataque a las fotos no suma gasto en Vercel.

### 1.3 Supabase (Organization → Billing → Cost Control)

- [ ] **Spend Cap activado** (viene así en Pro: confirmalo).
- [ ] Compute del proyecto: dejarlo en **Micro** (lo cubre el crédito de Pro). Cambiarlo a uno más grande se cobra aparte y no lo frena el Spend Cap.
- [ ] **No activar** complementos que se cobran aparte: PITR (recuperación a un minuto exacto), dirección IPv4, dominio propio, réplicas de lectura, branching ni log drains.
- [ ] Authentication → Rate Limits: correos por hora en **30**. Así, aunque alguien intente registrar cuentas en masa, Supabase no manda más de 30 correos por hora (y Resend gratis tampoco pasaría de 100 por día).

- [ ] Authentication → Attack Protection (puede figurar como "Bot and Abuse Protection") → **Enable Captcha protection**, proveedor **Turnstile**, con la clave secreta del sitio de Turnstile de producción (la misma de `TURNSTILE_SECRET_KEY`). Así nadie puede registrarse, entrar ni pedir otra contraseña llamando a Supabase directo, salteando nuestras páginas. **Activarlo recién cuando producción ya tenga el código que manda el token** (paso 29): con el código viejo, nadie podría registrarse ni entrar.

### 1.4 Ante un ataque

Señales: aviso de gasto de Vercel, la pestaña Usage de Vercel o de Supabase que sube de golpe, catálogos lentos.

1. Vercel → proyecto `vidri` → **Firewall**: mirá qué direcciones o países concentran el tráfico.
2. Activá **Attack Challenge Mode** (en Firewall): a cada visitante le pide una verificación automática antes de entrar. Frena bots y lo pueden pasar las personas. Apagalo cuando termine.
3. Si una IP o una ruta concreta es el problema: Firewall → regla propia que la bloquee (Deny).
4. Si se te va de las manos: Settings del proyecto → **Pause** (la plataforma queda caída hasta que la reactives) y escribime.

Lo que ya frena la app por su cuenta: pedidos con Turnstile y límites por IP y por comercio (200 por hora), registro, inicio de sesión y recuperación de contraseña con Turnstile (verificado por Supabase) y fotos con tamaño máximo.

## Parte 2: paso a paso de la primera configuración

Hacé los pasos en orden. Las claves secretas las copiás directo de cada panel al lugar donde van; nunca por chat ni en archivos.

### Antes de empezar

1. [ ] **MFA** (código del celular) en GitHub, Vercel, Supabase, Resend, Cloudflare, Sentry, NIC Argentina y tu correo. Si alguien entra a una de estas cuentas, entra a la plataforma.
2. [x] En el proyecto `vidri-staging` de Vercel: Settings → Git → **Ignored Build Step** → "Only build production". Sin esto, staging intenta armar la rama `produccion` y te manda un correo de error cada vez que publicás.

### Supabase

3. [x] Organización `vidri` en plan **Pro** (2026-11-24: era la de staging; el proyecto de staging se mudó a `vidri-pruebas`, gratis).
   [x] Proyecto `vidri` creado en South America (São Paulo), compute Micro (ref `hzcwtoagrmsoqmbnswnd`). Spend Cap de la organización verificado. Contraseña de la base larga y generada; guardala en tu gestor de contraseñas.
4. [x] Parte 1.3: Spend Cap, Micro y 30 correos por hora (ya venía así), 60 s entre correos a la misma persona.
5. [x] Authentication → URL Configuration: Site URL `https://app.vidri.ar`; redirecciones `https://app.vidri.ar/auth/callback` y `https://admin.vidri.ar/auth/callback`.
6. [x] Authentication → contraseña mínima de 10 caracteres, "Secure password change" y **rechazo de contraseñas filtradas** (de Pro; staging no lo tiene). MFA → TOTP activado (venía así).
7. [x] Resend → API Keys → crear `supabase-produccion` con permiso **solo de envío** y pegarla en Supabase → Authentication → SMTP (`smtp.resend.com`, puerto 465, usuario `resend`, remitente `Vidri <no-responder@vidri.ar>`).
8. [x] Authentication → Email Templates: cargar las plantillas de `supabase/templates/` (sin el comentario inicial), como en staging.
9. [x] Datos para el paso 10: ref `hzcwtoagrmsoqmbnswnd` y Session pooler `aws-0-sa-east-1.pooler.supabase.com` (puerto 5432, usuario `postgres.hzcwtoagrmsoqmbnswnd`).

### GitHub

10. [x] Repo → Settings → Secrets and variables → Actions → New repository secret, tres veces:
    - `PRODUCTION_PROJECT_REF`: el ref del paso 9.
    - `PRODUCTION_DB_PASSWORD`: la contraseña del paso 3.
    - `PRODUCTION_POOLER_HOST`: el host del paso 9.
11. [x] Settings → Billing: confirmar que no hay tarjeta cargada (o que el límite de gasto de Actions está en USD 0).

### Cloudflare Turnstile

12. [x] Crear un sitio nuevo para `vidri.ar` (widget `vidri-produccion`, modo Managed, sin pre-clearance). Anotar sus dos claves para el paso 16.

### Vercel

13. [x] Equipo pasado a **Pro** y presupuesto de USD 30 con pausa (2026-11-24).
14. [x] Add New → Project → importar `Franco320i/MultiSaaS` con el nombre `vidri`. La primera publicación va a fallar por falta de variables: es normal. **No** usar la integración "Supabase" que ofrece el asistente.
15. [x] Settings → Environments → Production → Branch Tracking: rama **`produccion`**. Vercel solo acepta una rama que ya exista en GitHub: se creó a mano el 2026-11-24 en el commit anterior (1109eee), para que la primera publicación la mueva y dispare el despliegue. Settings → Functions → región **São Paulo (gru1)**, cerca de la base. Settings → Git → Ignored Build Step → "Only build production".
16. [x] Settings → Environment Variables, entorno **Production** (tabla de abajo). Las secretas, marcadas como Sensitive.
17. [x] Settings → Domains (sin "Redirect apex domains to www": la app ya manda `www` a `vidri.ar`): agregar `vidri.ar`, `www.vidri.ar` y `*.vidri.ar` a este proyecto. Los de staging (`staging.vidri.ar`, `*.staging.vidri.ar`) quedan en `vidri-staging`; el dominio más específico gana.
18. [x] Cloudflare Turnstile: si en el paso 12 no pusiste los hosts, agregar `vidri.ar` (cubre los subdominios).

### Primera publicación

19. [x] GitHub → Actions → **Publicar en producción** → Run workflow (rama `main`). Aplica las migraciones en la base de producción y crea la rama `produccion`. Vercel la publica sola en unos minutos.
20. [x] Vercel → proyecto `vidri` → Deployments: la publicación de la rama `produccion` tiene que quedar en "Ready" y `vidri.ar` mostrar la página principal. Primera publicación el 2026-11-25 (commit 2fc85ad, 1 min 31 s): página principal, registro con Turnstile, `app.` y `www` → 308 a `vidri.ar` verificados.

### Administrador y prueba completa

21. [x] Supabase → Authentication → Users → **Invite user** con tu correo. Ojo: llega con la plantilla de comercios ("Tu catálogo está listo"); es esperable (pendiente conocido). Entrá por el link y elegí la contraseña.
22. [x] Supabase → SQL Editor: `insert into public.platform_admins (user_id, role) select id, 'superadmin' from auth.users where email = 'tu-correo';`
23. [x] Entrar a `admin.vidri.ar`, activar MFA con la app autenticadora.
24. [x] Recorrido completo, como en staging: registro → correo → asistente → producto con foto → publicar → pedido por WhatsApp → panel de pedidos; panel central con un pago registrado y la auditoría; `www.vidri.ar` redirige a `vidri.ar`.
25. [x] (Probada el 2026-11-25: 200.) Probar la tarea diaria: Vercel → proyecto `vidri` → Settings → Cron Jobs → "Run" en `/api/cron/daily` (tiene que responder bien).
26. [x] (Probado el 2026-11-25: llegó con entorno production y url vidri.ar.) Provocar un error de prueba y verlo en Sentry con entorno `production`.

### Captcha de Supabase Auth

29. [x] (Hecho y probado el 2026-11-25.) Publicar en producción (paso 19) el commit que pasa el token de Turnstile a Supabase y, enseguida, activar el captcha en Supabase (sección 1.3). Probar: crear una cuenta, entrar a `app.vidri.ar` y a `admin.vidri.ar`, y pedir "Olvidé mi contraseña". Si algo falla, apagar el captcha en Supabase (vuelve a andar al instante) y avisar. Antes hacer lo mismo en staging (guía de staging, paso 13).

### Sin registro automático (rediseño 11e)

30. [ ] Publicar en producción (paso 19) el commit de "Pedí tu demo" y, **después**, Supabase → Authentication → Sign In / Providers → apagar **Allow new users to sign up**. Las cuentas de los dueños las crea el panel central (Alta asistida) con la API de administración, que sigue andando. Probar: un alta asistida nueva muestra la contraseña, el dueño entra con ella y la cambia en Mi local → Tu contraseña; "Nueva contraseña" en la ficha genera otra. Antes hacer lo mismo en staging (guía de staging, paso 14).
31. [ ] Cargar `SALES_WHATSAPP` (tu WhatsApp con código de país, por ejemplo `+5492954123456`) y publicar de nuevo con el paso 19: sin él no aparecen los botones "Pedí tu demo". Va al armar la página, así que un cambio de número pide publicar de nuevo.

### Antes de abrir al público

27. [ ] Legales: completar los `[PENDIENTE]`, revisión de un abogado y sacar el `noindex`.
28. [ ] Comercio de ejemplo: crearlo con el Alta asistida del panel central (con tu propio correo como dueño), armarlo y publicarlo, y cargar `DEMO_CATALOG_SLUG` (su dirección) y `DEMO_TENANT_ID` (el id de su ficha) en Vercel. Después publicar de nuevo con el paso 19.

## Variables de entorno en Vercel (proyecto `vidri`, entorno Production)

| Variable | Valor o de dónde sale |
| --- | --- |
| `ROOT_DOMAIN` | `vidri.ar` |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase (proyecto `vidri`) → Project Settings → API |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase → API Keys → publishable (`sb_publishable_…`) |
| `NEXT_PUBLIC_IMAGES_BASE_URL` | `{NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/catalog-public` |
| `SUPABASE_SECRET_KEY` | Supabase → API Keys → secret (`sb_secret_…`). Sensitive |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | Turnstile (sitio del paso 12) → clave del sitio |
| `TURNSTILE_SECRET_KEY` | Turnstile → clave secreta. Sensitive |
| `IP_HASH_SALT` | Generar una nueva (comando abajo). Sensitive |
| `CRON_SECRET` | Generar una nueva (comando abajo). Sensitive |
| `NEXT_PUBLIC_SENTRY_DSN` | El mismo DSN de staging |
| `NEXT_PUBLIC_SENTRY_ENVIRONMENT` | `production` |
| `DEMO_CATALOG_SLUG` / `DEMO_TENANT_ID` | Opcionales, paso 28 |
| `SALES_WHATSAPP` | Tu WhatsApp para "Pedí tu demo" (`+549…`), paso 31 |

```bash
node -e "console.log(require('crypto').randomBytes(24).toString('base64url'))"
```

Todas distintas de las de staging. Si una se filtra, se cambia solo en ese entorno.

## Cómo publicar una versión nueva

1. Subir los cambios a `main` y después a `staging`. Esperar CI en verde y que `migrate-staging` aplique las migraciones.
2. Revisar staging rápido: un catálogo, un pedido, el panel.
3. GitHub → Actions → **Publicar en producción** → Run workflow (rama `main`).
   - Antes de tocar nada, comprueba que ese commit pasó CI y ya está en staging. Si no, se frena con el motivo.
   - Aplica las migraciones en producción y **recién después** mueve la rama `produccion`. Vercel publica en unos minutos.
   - Si la migración falla, el código nuevo no se publica y la versión anterior sigue andando.
4. Mirar Sentry un rato.

**Volver atrás:** Vercel → proyecto `vidri` → Deployments → la publicación anterior → **Instant Rollback**. Eso vuelve el código, no la base: las migraciones solo van hacia adelante, por eso los cambios de base se hacen en dos pasos (diseño, sección 14, regla 4). **No usar "Redeploy"** sobre una publicación vieja (vuelve a poner código viejo con las variables de hoy; pasó en staging el 2026-11-21).

**Por qué la rama `produccion` y no un entorno protegido:** el diseño pedía aprobación manual con un entorno protegido de GitHub, pero en GitHub Free los repos privados no tienen "required reviewers". El botón "Run workflow" cumple ese papel: nada llega a producción sin que lo dispares vos.
