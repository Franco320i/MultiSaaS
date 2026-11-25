# Staging: cómo está armado y cómo se configura

Copia de prueba de toda la plataforma (diseño, sección 14). Datos ficticios, nunca copias de producción.
Dominio de la plataforma: `vidri.ar` (registrado en NIC Argentina).

| Qué | Dirección |
| --- | --- |
| Página principal y registro | `staging.vidri.ar` |
| Panel de comercios | `app.staging.vidri.ar` |
| Panel central | `admin.staging.vidri.ar` |
| Catálogos | `{slug}.staging.vidri.ar` |

## Piezas

- **Vercel:** proyecto `vidri-staging` (equipo en plan Pro desde el 2026-11-24, compartido con producción), conectado a `Franco320i/MultiSaaS`. Rama de producción del proyecto: `staging` (Settings → Environments → Production → Branch Tracking). Así la tarea diaria de `vercel.json` corre en staging: Vercel solo ejecuta crons en despliegues de producción del proyecto.
  - Dominios: `staging.vidri.ar` y `*.staging.vidri.ar`. El comodín exige que el DNS de `vidri.ar` lo maneje Vercel (nameservers de Vercel delegados en NIC).
  - No usar la integración "Supabase" del asistente de Vercel: crea otra base y reparte la clave secreta en todos los entornos.
- **Supabase:** organización `vidri-pruebas` (plan Free, separada de producción; el proyecto se mudó ahí el 2026-11-24 desde la organización que hoy es `vidri`, la paga) con el proyecto `vidri-staging` (ref `eysiaanpcwbxmxiwiscy`). Quedó en West US (Oregon), no en São Paulo: para staging alcanza; producción va en São Paulo. Se pausa tras una semana sin uso.
- **Migraciones:** las aplica el job `migrate-staging` de `ci.yml` después de CI, por el session pooler (`aws-0-us-west-2.pooler.supabase.com`): la conexión directa es solo IPv6 y GitHub no tiene IPv6. Secretos del repo: `STAGING_PROJECT_REF` y `STAGING_DB_PASSWORD`.
- **Cloudflare Turnstile:** un sitio para `staging.vidri.ar` con sus dos claves.
- **Correos:** los de Supabase Auth (confirmación, invitación) salen por el SMTP de Resend (paso 7). La app no manda otros correos (decisión 0005).
- **Sentry:** avisos de errores (etapa 10d). Una cuenta gratis, un proyecto Next.js para staging y producción; el entorno los separa. Sin datos personales (decisión 0005).

## Variables de entorno en Vercel (entorno Production del proyecto `vidri-staging`)

| Variable | De dónde sale |
| --- | --- |
| `ROOT_DOMAIN` | `staging.vidri.ar` |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Project Settings → API |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase → API Keys → publishable (`sb_publishable_…`) |
| `NEXT_PUBLIC_IMAGES_BASE_URL` | `{NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/catalog-public` |
| `SUPABASE_SECRET_KEY` | Supabase → API Keys → secret (`sb_secret_…`). Marcarla como Sensitive |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | Cloudflare Turnstile → clave del sitio |
| `TURNSTILE_SECRET_KEY` | Cloudflare Turnstile → clave secreta. Sensitive |
| `IP_HASH_SALT` | Generar una por entorno (comando abajo). Sensitive |
| `CRON_SECRET` | Generar una por entorno (comando abajo). Sensitive |
| `NEXT_PUBLIC_SENTRY_DSN` | Sentry → proyecto → Settings → Client Keys (DSN). No es secreta |
| `NEXT_PUBLIC_SENTRY_ENVIRONMENT` | `staging` |

```bash
node -e "console.log(require('crypto').randomBytes(24).toString('base64url'))"
```

Las claves secretas se copian directo del panel de cada servicio a Vercel. No se pegan en chats ni en archivos del repo.

## Pasos de la primera configuración

1. [x] Comprar `vidri.ar` en NIC.
2. [x] Crear el proyecto `vidri-staging` en Vercel desde el repo.
3. [x] Rama de producción del proyecto: `staging`.
4. [x] Agregar `staging.vidri.ar` y `*.staging.vidri.ar` en Vercel → Domains.
5. [x] Delegar `vidri.ar` en NIC a los nameservers de Vercel.
6. [x] Crear organización y proyecto en Supabase y aplicar las migraciones (12 aplicadas por `migrate-staging`).
7. [x] Configurar Auth en Supabase:
   - [x] Site URL `https://app.staging.vidri.ar`; redirecciones `https://app.staging.vidri.ar/auth/callback` y `https://admin.staging.vidri.ar/auth/callback`.
   - [x] Contraseña mínima 10 y "Secure password change" activado (igual que `config.toml`).
   - [x] MFA TOTP activado.
   - [x] Plantillas de correo (`supabase/templates/`, sin el comentario inicial). Supabase no deja editarlas sin SMTP propio: SMTP de Resend (`smtp.resend.com`, puerto 465, usuario `resend`, contraseña = API key `supabase-staging` con permiso de solo envío) y remitente `Vidri <no-responder@vidri.ar>`. Dominio `vidri.ar` verificado en Resend (región São Paulo) con DKIM, SPF (`send`, `rsend`) y DMARC cargados en Vercel DNS.
8. [x] Crear el sitio de Turnstile.
9. [x] Cargar las variables de entorno en Vercel y volver a desplegar.
10. [x] Crear el usuario administrador: "Invite user" desde Supabase y después, en el editor SQL, `insert into public.platform_admins (user_id, role) select id, 'superadmin' from auth.users where email = '…'`. MFA TOTP activado al primer ingreso.
11. [x] Recorrer la plataforma: registro → correo → asistente → producto con foto → publicar → pedido por WhatsApp → panel de pedidos; panel central con MFA, pago registrado y auditoría. `www` redirige bien. Caché revisada con un comercio, sin filtraciones.
12. [x] Sentry (10d):
   - [x] Crear la cuenta gratis en sentry.io (plan Developer, organización `vidri`) y un proyecto de tipo Next.js llamado `vidri`. Saltear el asistente de instalación: el código ya está.
   - [x] Copiar el DSN y cargar `NEXT_PUBLIC_SENTRY_DSN` y `NEXT_PUBLIC_SENTRY_ENVIRONMENT=staging` en Vercel. Después hay que volver a publicar **la versión más nueva**: "Redeploy" sobre una publicación vieja vuelve a poner código viejo en línea (pasó el 2026-11-21).
   - [x] Organization Settings → Security & Privacy → **Prevent Storing of IP Addresses** activado: Sentry anota la IP de quien tuvo el error al recibirlo, aunque la app no la mande. Queda la ciudad aproximada.
   - [x] Alerta de "problema nuevo" por correo (viene activa por defecto).
   - [x] Probado el 2026-11-21: un error del navegador en staging llegó con `host` = staging.vidri.ar, entorno `staging`, teléfono y correo tachados, sin parámetros de la URL, sin cookies e IP `<redacted>`.
13. [ ] Captcha de Supabase Auth: cuando staging tenga el código que manda el token de Turnstile (llega con el push a `staging`), Supabase de staging → Authentication → Attack Protection (puede figurar como "Bot and Abuse Protection") → **Enable Captcha protection**, proveedor **Turnstile**, clave secreta del sitio de Turnstile de staging (la de `TURNSTILE_SECRET_KEY`). Probar registro, login en `app.` y `admin.` y "Olvidé mi contraseña". Si algo falla, apagarlo (vuelve a andar al instante). No activarlo antes del código: nadie podría registrarse ni entrar.
