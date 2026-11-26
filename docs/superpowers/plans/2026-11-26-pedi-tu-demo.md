# Rediseño 11e (parte a): "Pedí tu demo" · plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Sacar el registro automático y los correos de alta, y llevar todo a "Pedí tu demo" por WhatsApp con contraseñas generadas por el panel central.

**Spec:** `docs/superpowers/specs/2026-11-26-pedi-tu-demo-design.md`

## Global Constraints

- La clave secreta solo en `src/core/admin/service.ts` (lista cerrada). Las acciones del panel central usan `requirePlatformAdmin(…, "superadmin")` + Zod.
- Migración nueva por `supabase migration new`, función en `private` con `search_path = ''`, envoltorio `public` solo para `service_role`, prueba pgTAP.
- La contraseña generada no se guarda ni se registra (ni en logs ni en la auditoría): solo se muestra una vez.
- Español rioplatense; estilo Noche en la página principal y Grafito en el panel central.

## Review Focus

1. La contraseña nunca aparece en la auditoría, en Sentry ni en la URL.
2. Con `enable_signup = false`, `signUp` directo falla y `admin.createUser` anda.
3. "Nueva contraseña" para un comercio sin dueño o cancelado da un error claro.
4. Sin `SALES_WHATSAPP` la página principal no muestra botones rotos.
5. Un usuario con sesión y sin comercio no cae en un 404 ni en un bucle de redirecciones.

---

### Task 1: Contraseña generada

- [ ] Prueba `generatePassword()`: 12 caracteres del alfabeto sin `0 O o 1 l I`, distintas en dos llamadas → FAIL → `src/lib/password.ts` con `crypto.getRandomValues` → PASS.
- [ ] Commit.

### Task 2: Alta asistida sin correo y "Nueva contraseña"

- [ ] Migración `core_admin_password_reset`: `private.admin_log_owner_password_reset(p_actor, p_tenant_id) returns uuid` (superadmin, dueño del comercio; si no hay → `owner_not_found`), audit `owner.password_reset`, `public.*` solo `service_role`. Prueba pgTAP: superadmin ok y devuelve el dueño, support → `not_superadmin`, anon/authenticated sin permiso.
- [ ] `service.ts`: `provisionAssisted` crea con `createUser` + contraseña y devuelve `password` (solo al crear). `resetOwnerPassword(actor, tenantId)` = log (devuelve dueño) + `updateUserById`.
- [ ] Integración (`admin.test.ts`): el alta nueva devuelve contraseña y se puede iniciar sesión con ella; con cuenta existente no devuelve contraseña; la nueva contraseña permite entrar y la auditoría tiene `owner.password_reset` sin la contraseña.
- [ ] Acciones y pantallas: éxito del alta con correo, contraseña, link y "Copiar todo"; botón "Nueva contraseña" con confirmación en la ficha. "Accesos de la plataforma" muestra "Te generamos una contraseña nueva".
- [ ] Commit.

### Task 3: Sin registro

- [ ] Borrar `/registro`, `registerUser`, `/nuevo`, `provisionTenantAction`, `ProvisionForm`, `provisionTenant` y sus pruebas (las de `provision_tenant` en la base siguen en pgTAP).
- [ ] `panel/page.tsx`: sin comercios → pantalla "Todavía no tenés un local" con "Pedí tu demo".
- [ ] `config.toml`: `enable_signup = false`. Prueba de integración: `signUp` devuelve error.
- [ ] Login: "Pedí tu demo". `/auth/recuperar`: texto de WhatsApp, sin formulario; borrar la acción de recuperación.
- [ ] Commit.

### Task 4: Página principal "Pedí tu demo"

- [ ] `SALES_WHATSAPP` en `env.ts` (opcional, `^\+[1-9]\d{7,14}$`) y `demoRequestUrl()` en `src/lib/urls.ts` con prueba.
- [ ] Header, hero, precios, cierre y "Cómo funciona"; los botones se ocultan sin número.
- [ ] Commit.

### Task 5: "Tu contraseña" en Mi local

- [ ] Fila "Tu contraseña" en el índice → `/auth/nueva-contrasena`; la página suma "‹ Volver" y el mensaje de `reauthentication_needed`.
- [ ] Commit.

### Task 6: Verificación y cierre

- [ ] E2E: `registro-a-pedido` → `alta-a-pedido`, con la API de administración.
- [ ] Guías de staging y producción (desactivar el registro en Supabase, `SALES_WHATSAPP`, catálogo de ejemplo), decisión 0004 al día, `CLAUDE.md`.
- [ ] `db:reset`, `db:test`, `db:lint`, `db:advisors`, `db:types`, `check`, `test:integration`, `build`, `check:build`, `test:e2e`. Revisión final y `/auditoria-aislamiento`.
