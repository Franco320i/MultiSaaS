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

- **Vercel:** proyecto `vidri-staging` (plan Hobby), conectado a `Franco320i/MultiSaaS`. Rama de producción del proyecto: `staging` (Settings → Environments → Production → Branch Tracking). Así la tarea diaria de `vercel.json` corre en staging: Vercel solo ejecuta crons en despliegues de producción del proyecto.
  - Dominios: `staging.vidri.ar` y `*.staging.vidri.ar`. El comodín exige que el DNS de `vidri.ar` lo maneje Vercel (nameservers de Vercel delegados en NIC).
  - No usar la integración "Supabase" del asistente de Vercel: crea otra base y reparte la clave secreta en todos los entornos.
- **Supabase:** organización `vidri-staging` (plan Free, separada de producción) con el proyecto `vidri-staging` (ref `eysiaanpcwbxmxiwiscy`). Quedó en West US (Oregon), no en São Paulo: para staging alcanza; producción va en São Paulo. Se pausa tras una semana sin uso.
- **Migraciones:** las aplica el job `migrate-staging` de `ci.yml` después de CI, por el session pooler (`aws-0-us-west-2.pooler.supabase.com`): la conexión directa es solo IPv6 y GitHub no tiene IPv6. Secretos del repo: `STAGING_PROJECT_REF` y `STAGING_DB_PASSWORD`.
- **Cloudflare Turnstile:** un sitio para `staging.vidri.ar` con sus dos claves.
- **Correos:** el SMTP propio de Supabase alcanza para probar (pocos por hora). Resend llega en 10d.

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
7. [ ] Configurar Auth en Supabase:
   - [x] Site URL `https://app.staging.vidri.ar`; redirecciones `https://app.staging.vidri.ar/auth/callback` y `https://admin.staging.vidri.ar/auth/callback`.
   - [x] Contraseña mínima 10 y "Secure password change" activado (igual que `config.toml`).
   - [x] MFA TOTP activado.
   - [ ] Plantillas de correo (`supabase/templates/`): Supabase no deja editarlas sin SMTP propio. Con el SMTP por defecto manda las plantillas en inglés, cuyo enlace no lleva a `/nuevo`, y solo entrega correos a miembros de la organización de Supabase. Requiere Resend.
8. [x] Crear el sitio de Turnstile.
9. [x] Cargar las variables de entorno en Vercel y volver a desplegar.
10. [ ] Crear el usuario administrador (sin el seed: sus contraseñas están en el repo).
11. [ ] Recorrer la plataforma en `staging.vidri.ar` y anotar lo que falle.
