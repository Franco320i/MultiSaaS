# Página principal de Vidri: plan de implementación

> **Para agentes:** SUB-SKILL REQUERIDA: usar superpowers:subagent-driven-development (recomendado) o superpowers:executing-plans para implementar este plan tarea por tarea. Los pasos usan casillas (`- [ ]`).

**Objetivo:** reemplazar la landing provisoria de `vidri.ar` por una página que venda, con planes leídos de la base y páginas de términos y privacidad.

**Arquitectura:** todo vive en `src/app/(marketing)`, que el proxy sirve en el host raíz sin reescribir. Un layout pone `data-surface="marketing"` y activa los tokens "Noche". Las secciones son Server Components en `_components/`; solo el menú móvil es de cliente. Los planes se leen en `src/core/billing/plans.ts` con el cliente público sin cookies, dentro de `'use cache'` con el tag `plans`.

**Tecnología:** Next.js 16.4 (`cacheComponents`), React 19.3, Tailwind 4, Supabase, Vitest, Playwright. Sin dependencias nuevas.

**Diseño (fuente de verdad):** `docs/superpowers/specs/2026-11-20-pagina-principal-design.md`. Los valores de la muestra aprobada (paleta y maqueta del celular) están copiados en las Tareas 2 y 3.

## Restricciones globales

- Antes de usar una API de Next (`'use cache'`, `cacheTag`, `cacheLife`, `next/og`, metadata), leer su guía en `node_modules/next/dist/docs/`.
- Sin dependencias nuevas. Animaciones solo en CSS. Íconos como SVG propios, sin emojis.
- Tokens por nombre (`bg-surface`, `text-muted`); nada de `bg-[#...]` en el código de la página, salvo los colores fijos de las maquetas del comercio ficticio (naranja `#C2410C`, verde WhatsApp `#25D366`, pantalla clara `#FBFBF9` / `#22261F`), que van como variables CSS de la maqueta (`--mock-*`) dentro de `globals.css`.
- Textos en castellano rioplatense con voseo. Plata con `formatCents` de `src/lib/money.ts` (`$ 24.900`).
- Nada de testimonios, cifras, descuentos ni urgencias. Solo funciones que existen hoy (lista en el diseño, sección 5 de la estructura). No mencionar variantes, stock, dominio propio, varios miembros ni quitar la marca.
- Accesibilidad AA, objetivos táctiles de 44 px, foco visible, `prefers-reduced-motion`. Celular primero (375 px), después 1280 px. Sin scroll horizontal a 375 px.
- Caché: dentro de una función cacheada no se leen `headers()`, `cookies()` ni la sesión. `check:build` tiene que seguir en verde.
- Links al panel con `platformUrl(env.ROOT_DOMAIN, "app", ruta)` de `src/lib/urls.ts`; nunca hosts escritos a mano.
- Copia fija del diseño (usar textual):
  - Etiqueta: "Catálogos con pedidos a WhatsApp".
  - Título: "Dejá de mandar fotos y precios por WhatsApp. Tu catálogo, con tu marca, en un link." (la segunda oración en `accent-soft`).
  - Bajada: "Tus clientes eligen, arman el pedido y te llega al WhatsApp ya escrito. Vos lo manejás todo desde el celular."
  - Botones: "Crear mi catálogo gratis" (→ `/registro`) y "Mirá un catálogo de ejemplo".
  - Riesgo: "14 días gratis · Sin tarjeta · Sin comisiones por venta".
  - Frase de funciones: "Sin comisiones por venta. Pagás el abono y listo."
  - Cierre: "Empezá a vender de una manera más profesional." / "Tu catálogo puede estar listo para compartir en pocos minutos."

## Puntos de revisión

1. **Base caída o tabla `plans` vacía durante el build o en una petición:** la página tiene que renderizar igual; la sección de planes muestra "Estamos actualizando los precios. Creá tu cuenta y probá 14 días gratis." en lugar de romper el build. Lo implementan la Tarea 1 (`getPublicPlans` devuelve `[]` ante error) y la Tarea 4 (`Pricing` con lista vacía); se revisa a mano en la Tarea 6 con Supabase apagado.
2. **Plan con `max_products = null`:** se muestra "Productos ilimitados", nunca "null" ni "0 productos". Prueba en la Tarea 1.
3. **Pantalla de 375 px:** la maqueta del celular y la burbuja de WhatsApp no generan scroll horizontal. Prueba en la Tarea 6 (`scrollWidth <= clientWidth`).
4. **`/registro` sobre fondo oscuro:** campos, errores y el widget de Turnstile legibles (Turnstile con `theme: "dark"` si el formulario lo permite configurar; si no, dejarlo en "auto"). Lo cubre el E2E de registro existente, que tiene que seguir pasando, más revisión visual en la Tarea 6.
5. **Hosts en staging:** "Ingresar" apunta a `app.staging.vidri.ar` en staging y a `app.localhost:3000` en local, nunca a otro. Prueba en la Tarea 6 (el href contiene `app.`).

---

### Tarea 1: Planes desde la base

**Archivos:**
- Crear: `src/core/billing/plans.ts`, `src/core/billing/plan-display.ts`
- Probar: `src/core/billing/plan-display.test.ts`
- Modificar: `src/lib/cache/tags.ts` (agregar `plans`)

**Interfaces:**
- Produce:
  - `type PublicPlan = { id: string; name: string; priceCents: number; maxProducts: number | null; maxImagesPerProduct: number; sort: number }`
  - `getPublicPlans(): Promise<PublicPlan[]>` en `plans.ts` (`import "server-only"`): `'use cache'`, `cacheTag(cacheTags.plans())`, `cacheLife("hours")`; `select id, name, price_ars, max_products, max_images_per_product, sort` de `plans` con `is_public = true`, orden por `sort`; valida con Zod; ante error de Supabase o filas inválidas devuelve `[]` (y `console.error` con un mensaje genérico, sin datos).
  - `planHighlights(plan: PublicPlan): string[]` en `plan-display.ts` (puro, sin `server-only`).
  - `recommendedPlanId(plans: PublicPlan[]): string | null`: el de mayor `sort`; `null` si hay menos de 2 planes.
  - `TRIAL_DAYS = 14` en `plan-display.ts`, con comentario: "Copia del valor de `provision_tenant` (`interval '14 days'`); si cambia allá, cambiar acá."
  - `cacheTags.plans = () => "plans"`, con comentario: es el único tag global porque los planes son datos de la plataforma, no de un comercio.

- [ ] **Paso 1: escribir las pruebas que fallan** en `plan-display.test.ts`:

```ts
const base = { id: "base", name: "Base", priceCents: 2490000, maxProducts: 150, maxImagesPerProduct: 3, sort: 1 };
const pro = { id: "pro", name: "Pro", priceCents: 3990000, maxProducts: null, maxImagesPerProduct: 8, sort: 2 };

test("planHighlights con límite", () => {
  expect(planHighlights(base)).toEqual(["Hasta 150 productos", "Hasta 3 fotos por producto"]);
});
test("planHighlights sin límite de productos", () => {
  expect(planHighlights(pro)).toEqual(["Productos ilimitados", "Hasta 8 fotos por producto"]);
});
test("planHighlights con una sola foto", () => {
  expect(planHighlights({ ...base, maxImagesPerProduct: 1 })[1]).toBe("1 foto por producto");
});
test("recommendedPlanId elige el de mayor sort", () => {
  expect(recommendedPlanId([pro, base])).toBe("pro");
});
test("recommendedPlanId sin elección con un solo plan o ninguno", () => {
  expect(recommendedPlanId([base])).toBeNull();
  expect(recommendedPlanId([])).toBeNull();
});
```

- [ ] **Paso 2:** `npm run test -- plan-display` → FALLA (no existe el módulo).
- [ ] **Paso 3:** implementar `plan-display.ts` y `plans.ts` con las firmas de arriba. Formato de miles en `planHighlights` con `toLocaleString("es-AR")` ("Hasta 1.000 productos").
- [ ] **Paso 4:** `npm run test -- plan-display` → PASA. `npm run check` → PASA.
- [ ] **Paso 5:** commit `Página principal: planes públicos desde la base`.

### Tarea 2: Superficie "Noche" y esqueleto de la página

**Archivos:**
- Modificar: `src/app/globals.css` (bloque `[data-surface="marketing"]` y variables `--mock-*`; utilidades de animación `.mk-rise` con `@media (prefers-reduced-motion: reduce)` que las anula)
- Crear: `src/app/(marketing)/layout.tsx`, `src/app/(marketing)/_components/site-header.tsx`, `mobile-menu.tsx` (`"use client"`), `site-footer.tsx`, `logo.tsx`, `button-link.tsx`
- Modificar: `src/app/(marketing)/page.tsx` (queda con las secciones vacías ancladas: `#como-funciona`, `#funciones`, `#planes`, `#preguntas`)
- Modificar: `docs/design/sistema-visual.md` (sección "Página principal: Noche", con la tabla de tokens del diseño)

**Interfaces:**
- Produce:
  - `[data-surface="marketing"]` pisa los mismos tokens que usa todo el proyecto: `--background #0B0912`, `--surface #15111F`, `--surface-muted #1D1830` (el "surface-raised" del diseño), `--line #2B2442`, `--foreground #F3F0FA`, `--muted #A8A2BD`, `--accent #7C3AED`, `--accent-foreground #FFFFFF`, más uno nuevo `--accent-soft #C4B5FD` expuesto en `@theme inline` como `--color-accent-soft`. `color-scheme: dark`, siempre (no depende de `prefers-color-scheme`). El `:focus-visible` dentro de la superficie usa `--accent-soft` (el violeta oscuro no contrasta sobre el fondo).
  - `<ButtonLink href variant="primary" | "ghost">`: `min-h-11`, píldora, como `.btn` de la muestra.
  - `<Logo />`: "vidri" en `font-display` + "." en `accent-soft`.
  - `SiteHeader` (Server Component) recibe `loginUrl: string`; en ≥ 900 px muestra los cuatro links de sección + "Ingresar" + "Probar gratis"; en el celular, logo + "Probar gratis" + `MobileMenu`.
  - `MobileMenu({ loginUrl })`: botón de 44 px con `aria-expanded` y `aria-controls`, cierra con Escape y al tocar un link, devuelve el foco al botón.
  - `SiteFooter({ loginUrl })`: logo, links de sección, Ingresar, `/terminos`, `/privacidad`, "© {año} Vidri". El año se calcula en el servidor (está bien que quede fijo en el HTML cacheado hasta el próximo despliegue).
  - Layout de `(marketing)`: `<div data-surface="marketing" className="flex min-h-full flex-1 flex-col bg-background text-foreground">` + resplandor violeta (un `div` `aria-hidden` con `radial-gradient` `rgba(124,58,237,.28)`, como la muestra) detrás del hero. Metadata: `title: { default: "Vidri · Catálogos con pedidos a WhatsApp", template: "%s · Vidri" }`, descripción con la bajada.

- [ ] **Paso 1:** leer la guía de layouts y metadata en `node_modules/next/dist/docs/`.
- [ ] **Paso 2:** implementar todo lo de arriba. `/registro` queda dentro del layout y hereda "Noche" sin tocar su código salvo, si hace falta, el tema de Turnstile (punto de revisión 4).
- [ ] **Paso 3:** `npm run check` → PASA. `npm run dev`, abrir `localhost:3000` y `localhost:3000/registro` a 375 px: fondo `#0B0912`, menú móvil abre y cierra con teclado.
- [ ] **Paso 4:** commit `Página principal: superficie Noche, menú y pie`.

### Tarea 3: Hero, antes y después, y cómo funciona

**Archivos:**
- Crear en `src/app/(marketing)/_components/`: `hero.tsx`, `phone-mockup.tsx`, `whatsapp-bubble.tsx`, `before-after.tsx`, `how-it-works.tsx`
- Crear: `src/core/tenancy/demo.ts`

**Interfaces:**
- Consume: `getStorefront(host)` y `normalizeHost` de `src/core/tenancy`; `platformUrl`, `env.ROOT_DOMAIN`.
- Produce:
  - `getDemoCatalogUrl(): Promise<string | null>` en `demo.ts`: llama a `getStorefront(normalizeHost(\`demo.${env.ROOT_DOMAIN}\`))` (ya cacheada por host); devuelve `platformUrl(env.ROOT_DOMAIN, "demo", "/")` solo si el resultado es un comercio disponible; si no, `null`.
  - `<Hero demoUrl={string | null} />`: copia fija de las restricciones globales; el botón de ejemplo y la sección de ejemplo en vivo solo si `demoUrl`.
  - `<PhoneMockup />`: maqueta de la muestra aprobada: comercio "Burger del Centro", portada naranja, avatar "B", "● Abierto ahora", pestañas Hamburguesas / Papas / Bebidas, tres productos (Doble cheddar $ 9.500, Papas con cheddar $ 5.200, Gaseosa 500 ml $ 2.000, montos con `formatCents`), barra "Ver pedido · 3 — $ 16.700". Ancho máximo 280 px. `role="img"` con `aria-label="Ejemplo de catálogo de una hamburguesería en el celular"` y el contenido interno `aria-hidden`.
  - `<WhatsAppBubble />`: "Nuevo pedido #128" con las tres líneas y "Total: $ 16.700 · Retiro". En el celular se apoya debajo del celular (no se sale de la pantalla); en escritorio flota a la derecha. Entra con `.mk-rise` (opacidad y 12 px hacia arriba, 0,6 s, 0,4 s de demora).
  - `<BeforeAfter />`: columna "Antes" (chat con "¿precio?", "¿tenés en talle M?", "¿hacen envío?", dos fotos sueltas como bloques grises) y columna "Ahora" (el mismo pedido en la burbuja ordenada). Debajo, las tres frases: "Tus productos en un solo lugar", "Un link profesional para compartir", "Los pedidos te llegan escritos". Una columna en el celular, dos en escritorio.
  - `<HowItWorks />`: 01 "Creás tu cuenta" · 02 "Cargás tus productos" (uno por uno o pegándolos desde una planilla) · 03 "Compartís el link y el QR". Vertical en el celular, horizontal con línea en escritorio. Lista ordenada (`<ol>`).

- [ ] **Paso 1:** implementar. La página arma `demoUrl` en el servidor y se lo pasa al hero; la lectura va dentro de `<Suspense>` si Next lo pide al prerenderizar.
- [ ] **Paso 2:** `npm run check` → PASA. En local no existe `demo.localhost`: el botón de ejemplo no aparece.
- [ ] **Paso 3:** commit `Página principal: hero, antes y después, cómo funciona`.

### Tarea 4: Funciones, planes, preguntas, cierre

**Archivos:**
- Crear en `src/app/(marketing)/_components/`: `features.tsx`, `demo-band.tsx`, `pricing.tsx`, `faq.tsx`, `closing-cta.tsx`

**Interfaces:**
- Consume: `getPublicPlans`, `planHighlights`, `recommendedPlanId`, `TRIAL_DAYS` (Tarea 1); `getDemoCatalogUrl` (Tarea 3); `formatCents`.
- Produce:
  - `<Features />`: grilla con jerarquía (dos bloques grandes arriba: catálogo con fotos, categorías y destacados; pedido que llega a WhatsApp ya escrito), luego bloques chicos: panel de pedidos con estados (nuevo, confirmado, en preparación, listo, entregado, cancelado) y aviso de pedidos nuevos; tu marca (logo, portada y color); horarios con "Abierto ahora" y envío o retiro con costo y pedido mínimo; precio anterior tachado y "Sin stock"; carga desde planilla; QR para el mostrador y link para Instagram. Cada bloque con una mini maqueta en CSS/SVG (sin imágenes). Cierra con la frase de comisiones destacada.
  - `<DemoBand url={string} />`: solo se monta si `getDemoCatalogUrl()` no es `null`.
  - `<Pricing plans={PublicPlan[]} />`: una tarjeta por plan; nombre, `formatCents(priceCents)` + "/mes", "{TRIAL_DAYS} días gratis, sin tarjeta", `planHighlights`, la lista común ("Pedidos a WhatsApp sin comisión", "Panel de pedidos", "Tu marca y tus colores", "QR y link para compartir") y "Empezar gratis" → `/registro`. La recomendada lleva borde `accent` y la etiqueta "Recomendado". Lista vacía → el texto del punto de revisión 1. Nota chica abajo: "Precios finales en pesos argentinos. Se paga mes a mes, sin permanencia."
  - `<Faq />`: siete `<details>` con las preguntas del diseño. Respuestas fijas:
    - Tecnología: "No. Si sabés usar WhatsApp, sabés usar Vidri. Cargás productos desde el celular o los pegás desde una planilla."
    - Celular: "Sí. Tus clientes compran desde el celular y vos manejás todo desde el tuyo."
    - Pedidos: "Tu cliente arma el pedido en tu catálogo y se abre WhatsApp con el mensaje ya escrito para vos. Además queda guardado en tu panel."
    - Comisión: "No. Pagás el abono mensual y nada más, vendas lo que vendas."
    - Precios: "Sí, cuando quieras. El cambio se ve en tu catálogo enseguida."
    - Fin de la prueba: "Te avisamos antes. Si elegís un plan y lo pagás, seguís igual; si no, tu catálogo se pausa y tus datos quedan guardados."
    - Baja: "Dejás de pagar y listo: no hay permanencia ni penalidades. Tu catálogo se pausa."
  - `<ClosingCta />`: copia fija + "Crear mi catálogo gratis" + resplandor.

- [ ] **Paso 1:** implementar y montar en `page.tsx` en el orden del diseño. Lo que lee la base (`getPublicPlans`, `getDemoCatalogUrl`) va dentro de `<Suspense>` con un esqueleto de la misma altura, para que la cáscara estática salga sin esperar.
- [ ] **Paso 2:** `npm run check` → PASA. En local, la sección de planes muestra Base ($ 24.900) y Pro ($ 39.900), Pro como recomendado.
- [ ] **Paso 3:** commit `Página principal: funciones, planes, preguntas y cierre`.

### Tarea 5: Legales y metadatos

**Archivos:**
- Crear: `src/app/(marketing)/terminos/page.tsx`, `src/app/(marketing)/privacidad/page.tsx`, `src/app/(marketing)/_components/legal-page.tsx`, `src/app/(marketing)/opengraph-image.tsx`

**Interfaces:**
- Produce:
  - `<LegalPage title updated children>`: ancho de lectura `max-w-[68ch]`, títulos `font-display`, aviso arriba: "Borrador: falta completar los datos del responsable antes de publicar."
  - Cada página: `metadata.robots = { index: false, follow: false }`. Los datos del responsable (nombre o razón social, CUIT, domicilio, correo) aparecen como `[PENDIENTE]` resaltados con `bg-surface-muted`.
  - Contenido de privacidad (redactado a partir de lo que la plataforma hace): datos de comercios (correo, nombre del comercio, WhatsApp, dirección) y de compradores (nombre, teléfono, dirección, notas del pedido); para qué se usan (operar el catálogo y los pedidos); proveedores (Supabase para base y archivos, Vercel para alojar, Resend para correos, Cloudflare Turnstile contra bots); cookies solo de sesión en el panel y datos del carrito guardados en el navegador del comprador; derechos de acceso, rectificación y supresión según la Ley 25.326 y la Agencia de Acceso a la Información Pública como autoridad de control.
  - Contenido de términos: qué es el servicio, prueba de 14 días, abono mensual sin permanencia, pausa por falta de pago, responsabilidad del comercio por sus productos, precios y entregas (Vidri no es parte de la venta), uso aceptable, cambios en los términos, ley argentina.
  - `opengraph-image.tsx` con `ImageResponse` de `next/og`, 1200×630: fondo `#0B0912`, "vidri." y la etiqueta del hero en `#F3F0FA` / `#C4B5FD`, resplandor violeta. Sin fuentes externas si complican el build.

- [ ] **Paso 1:** leer la guía de `opengraph-image` y `ImageResponse` en `node_modules/next/dist/docs/`.
- [ ] **Paso 2:** implementar. `npm run check` y `npm run build` → PASAN; `/terminos`, `/privacidad` y `/opengraph-image` aparecen en la salida del build.
- [ ] **Paso 3:** commit `Página principal: términos, privacidad e imagen para compartir`.

### Tarea 6: E2E, verificación y cierre

**Archivos:**
- Crear: `e2e/pagina-principal.spec.ts`
- Modificar: `CLAUDE.md` (pendientes: legales con `[PENDIENTE]` antes de producción; crear `demo.{dominio}`; precios provisorios), `docs/design/sistema-visual.md` si cambió algo en el camino

- [ ] **Paso 1: escribir el E2E** (usa `ROOT` de `e2e/helpers.ts`):

```ts
test("la página principal vende y lleva al registro", async ({ page }) => {
  await page.goto(`${ROOT}/`);
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Dejá de mandar fotos y precios por WhatsApp");
  await expect(page.getByText("14 días gratis · Sin tarjeta · Sin comisiones por venta").first()).toBeVisible();
  // Sin scroll horizontal en el celular (Pixel 7).
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
  // Planes desde la base.
  const planes = page.locator("#planes");
  await expect(planes.getByText("Base")).toBeVisible();
  await expect(planes.getByText("$ 24.900")).toBeVisible();
  await expect(planes.getByText("Productos ilimitados")).toBeVisible();
  // Ingresar va al host del panel.
  await page.getByRole("button", { name: /menú/i }).click();
  await expect(page.getByRole("link", { name: "Ingresar" }).first()).toHaveAttribute("href", /\/\/app\./);
  await page.keyboard.press("Escape");
  await page.getByRole("link", { name: "Crear mi catálogo gratis" }).first().click();
  await expect(page).toHaveURL(`${ROOT}/registro`);
});

test("los legales están publicados y no se indexan", async ({ page }) => {
  for (const path of ["/terminos", "/privacidad"]) {
    await page.goto(`${ROOT}${path}`);
    await expect(page.getByText("[PENDIENTE]").first()).toBeVisible();
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
  }
});
```

- [ ] **Paso 2:** `npm run build`, `npm run db:reset`, `npm run test:e2e` → los 6 recorridos PASAN (los 4 de antes, incluido el registro sobre fondo oscuro, y los 2 nuevos). `npm run check:build` → PASA.
- [ ] **Paso 3:** con Supabase apagado (`npx supabase stop`) y `npm run dev`, la página carga y planes muestra el texto de "actualizando precios"; volver a levantarlo.
- [ ] **Paso 4:** revisión en el navegador integrado con `next start` (configuración `next-start` de `.claude/launch.json`), a 375 y 1280 px: capturas del hero, funciones, planes, preguntas y `/registro`; contraste de `muted` y del foco; con `prefers-reduced-motion` la burbuja aparece sin animación. Revisar `preview_logs` con nivel error.
- [ ] **Paso 5:** actualizar CLAUDE.md y commit `Página principal de Vidri: landing, planes y legales` (el hook corre `npm run check`).
