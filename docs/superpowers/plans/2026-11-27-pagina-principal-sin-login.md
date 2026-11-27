# Página principal sin login y "Ver ejemplo" — plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Sacar el login de la página principal y renombrar el botón de ejemplo del hero a "Ver ejemplo" (pestaña nueva).

**Architecture:** Cambios solo en `src/app/(marketing)` y en un E2E. Se reusa `DemoButton` + `getDemoCatalogUrl` sin tocar la lógica.

**Tech Stack:** Next.js 16, React 19, Tailwind 4, Playwright.

**Spec:** `docs/superpowers/specs/2026-11-27-pagina-principal-sin-login-design.md`

## Global Constraints

- Textos de interfaz en español; el botón dice exactamente "Ver ejemplo".
- `app.vidri.ar/auth/login` no se toca.
- Ninguna referencia a `loginUrl` ni "Ingresar" dentro de `src/app/(marketing)`.
- `npm run check` tiene que pasar antes del commit (hook).

## Review Focus

- Celular: el menú desplegable queda solo con las secciones, sin separador vacío al final.
- Sin `DEMO_CATALOG_SLUG`/`DEMO_TENANT_ID`: el hero muestra solo "Pedí tu demo" y no queda un hueco raro.
- Pestaña nueva: `rel="noopener noreferrer"` presente.
- El pie sigue mostrando términos y privacidad con la columna "Legales".

---

### Task 1: Sacar el login y renombrar el botón

**Files:**
- Modify: `src/app/(marketing)/layout.tsx` (quitar `loginUrl` y el import de `platformUrl` si queda sin uso)
- Modify: `src/app/(marketing)/_components/site-header.tsx` (prop `loginUrl` y link fuera; firma `SiteHeader({ demoRequest }: { demoRequest: string | null })`)
- Modify: `src/app/(marketing)/_components/mobile-menu.tsx` (firma `MobileMenu()` sin props; quitar el `<li>` de "Ingresar")
- Modify: `src/app/(marketing)/_components/site-footer.tsx` (firma `SiteFooter()` sin props; quitar el `<li>` de "Ingresar"; `aria-label="Legales"`)
- Modify: `src/app/(marketing)/_components/hero.tsx` (`DemoButton` → texto "Ver ejemplo", `target="_blank"`, `rel="noopener noreferrer"`; si `ButtonLink` no acepta esos atributos, sumarle `target`/`rel` opcionales en `button-link.tsx`)
- Test: `e2e/pagina-principal.spec.ts`

- [ ] **Step 1:** En `e2e/pagina-principal.spec.ts`, reemplazar la comprobación de "Ingresar" por: con el menú del celular abierto, `await expect(page.getByRole("link", { name: "Ingresar" })).toHaveCount(0)`.
- [ ] **Step 2:** Hacer los cambios de los archivos de arriba.
- [ ] **Step 3:** `grep -rn "loginUrl\|Ingresar" "src/app/(marketing)"` → sin resultados.
- [ ] **Step 4:** `npm run check` → pasa.
- [ ] **Step 5:** `npm run build` y E2E de la página principal (`npx playwright test e2e/pagina-principal.spec.ts`) con `next start` → pasa.
- [ ] **Step 6:** Revisar en el navegador `localhost:3000` (escritorio y celular): sin "Ingresar" en cabecera, menú y pie.
- [ ] **Step 7:** Commit "Página principal: sin login y botón Ver ejemplo".
