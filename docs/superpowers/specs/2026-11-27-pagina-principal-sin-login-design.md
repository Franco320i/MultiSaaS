# Página principal sin login y botón "Ver ejemplo"

Fecha: 2026-11-27. Tamaño: cambio chico. Aprobado por el usuario el 2026-11-27.

## Por qué

La página principal (`vidri.ar`) es para gente que todavía no es cliente. Los comercios entran a su panel con el link `app.vidri.ar` que el administrador les manda por WhatsApp junto con la contraseña (alta asistida, rediseño 11e), y lo fijan en el celular o en el navegador. Mostrar "Ingresar" en la página principal confunde a los posibles clientes y no le sirve a nadie.

Además, al lado de "Pedí tu demo" tiene que haber un botón que deje ver un catálogo de prueba, para que el posible cliente vea el resultado antes de escribir.

## Objetivos

- Sacar "Ingresar" de la cabecera, del menú del celular y del pie de la página principal.
- Que el código de la página principal no tenga ninguna referencia al login (ni la URL `loginUrl` ni props que la pasen).
- Botón "Ver ejemplo" a la derecha de "Pedí tu demo" en el hero, que abre el catálogo de ejemplo en una pestaña nueva.

## Fuera de alcance

- El login de `app.vidri.ar/auth/login` sigue igual: es la puerta de los comercios.
- La sección "Probalo como lo vería tu cliente" (`DemoBand`) queda como está.
- Crear el comercio de ejemplo y cargar `DEMO_CATALOG_SLUG` / `DEMO_TENANT_ID` en Vercel: es el paso 28 de `docs/runbooks/produccion.md`.

## Enfoques considerados

1. **Reusar el botón existente (`DemoButton`) y cambiarle el texto** (elegido). Ya está en el lugar correcto del hero, se muestra solo si el comercio de ejemplo existe y está publicado (`getDemoCatalogUrl`), y no suma mecanismos nuevos.
2. Un botón fijo a una URL cargada a mano: se descartó porque podría anunciar un catálogo que no existe o que otro registró con el mismo slug.
3. Un panel simulado ("Ver demo"): el usuario lo cambió por un catálogo de prueba, que es lo que el cliente final ve.

## Diseño

- `src/app/(marketing)/layout.tsx`: deja de armar `loginUrl` y de pasarlo a `SiteHeader` y `SiteFooter`.
- `site-header.tsx`, `mobile-menu.tsx`, `site-footer.tsx`: sin el link "Ingresar" ni la prop `loginUrl`. En el pie, la columna "Cuenta y legales" pasa a llamarse "Legales".
- `hero.tsx`: `DemoButton` dice "Ver ejemplo" y abre en pestaña nueva (`target="_blank"`, `rel="noopener noreferrer"`).
- `e2e/pagina-principal.spec.ts`: en vez de comprobar que existe "Ingresar", comprueba que no aparece en la página principal.

Decisiones del constructor: abrir en pestaña nueva (para no perder la página principal) y el nuevo nombre de la columna del pie.
