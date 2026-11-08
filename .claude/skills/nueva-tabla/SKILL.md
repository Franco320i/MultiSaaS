---
name: nueva-tabla
description: Procedimiento completo para agregar o modificar una tabla de Postgres en este SaaS multitenant (migración + restricciones + índices + RLS + permisos + pruebas pgTAP + tipos). Usala SIEMPRE que haya que crear una tabla nueva, agregar columnas, cambiar políticas RLS, agregar un módulo con datos (catalog_*, orders, bookings_*, crm_*, ai_*) o tocar cualquier archivo de supabase/migrations, aunque el pedido no diga "tabla" (por ejemplo "guardar los pedidos", "agregar variantes a productos", "registrar turnos").
---

# Nueva tabla (o cambio de esquema)

En este proyecto todos los comercios comparten tablas. Una tabla sin RLS, sin `tenant_id` o con una política floja expone los datos de **todos** los comercios a la vez. Por eso cada cambio de esquema sigue este procedimiento completo, en el mismo cambio, sin dejar pasos "para después".

Antes de empezar, leé la sección del diseño que corresponde en `docs/diseno-tecnico-v1.md` (secciones 3, 4 y 5) y cargá la skill `supabase-postgres-best-practices`.

## 1. Crear la migración

```bash
npx supabase migration new <modulo>_<cambio>
```

Nunca inventes el nombre del archivo ni edites una migración que ya se aplicó en un entorno compartido: deshacer es escribir otra migración. Tomá como modelo `supabase/migrations/20261108102436_catalog_categories_products.sql`.

## 2. Escribir la tabla

Para una tabla de comercio (casi todas):

- `id uuid primary key default gen_random_uuid()` (solo `events` y `audit_log` usan `bigint identity`).
- `tenant_id uuid not null references public.tenants (id) on delete cascade`, como primera columna de negocio.
- `unique (tenant_id, id)`: permite que otras tablas apunten a esta con FK compuesta.
- Toda FK hacia otra tabla de comercio es **compuesta**: `foreign key (tenant_id, x_id) references public.x (tenant_id, id)`. Si la FK puede anularse al borrar el padre, usá `on delete set null (x_id)` para no anular `tenant_id`.
- Unicidad siempre por comercio: `unique (tenant_id, slug)`, nunca `unique (slug)`.
- Estados con `text` + `check (col in (...))`, no `enum`. Dinero en `bigint` (centavos). Fechas `timestamptz`.
- `CHECK` de largo en todos los textos (`char_length(...) <= N`), igual que el formulario.
- Índices que empiezan por `tenant_id` para cada búsqueda frecuente. Indexá también las FK.
- Triggers: `private.set_updated_at()` si tiene `updated_at` y **siempre** `private.prevent_tenant_change()` (`before update`).
- Límites de plan: trigger `AFTER INSERT` (corre después de RLS, así un usuario sin permiso recibe "permiso denegado" y no datos del plan ajeno). Ver `private.enforce_product_limit()`.

## 3. RLS y permisos (en el mismo archivo)

```sql
alter table public.x enable row level security;
revoke all on public.x from anon, authenticated;            -- Supabase los otorga por defecto
grant select on public.x to authenticated;                  -- solo lo necesario
grant insert (tenant_id, col_a, col_b) on public.x to authenticated;
grant update (col_a, col_b) on public.x to authenticated;   -- por columna, NUNCA tenant_id
```

- Una política por operación y por rol (`for select to authenticated`), nunca `for all`, nunca sin `to`.
- Filtro de comercio: `tenant_id in (select private.my_tenant_ids())` (o `array['owner']` si es solo del dueño). El `select` hace que se evalúe una vez por consulta.
- Toda política `update` lleva `using` **y** `with check`.
- Lectura anónima solo si el diseño la pide (catálogo público), y siempre con `private.tenant_is_public(tenant_id)`.
- Nunca usar `user_metadata`/`raw_user_meta_data` para autorizar.
- Funciones `security definer`: en el esquema `private`, con `set search_path = ''` y `revoke execute ... from public`. En `public` solo las de la lista cerrada (`storefront_by_host`, `slug_available`, `accept_invitation`).
- Escrituras que el navegador no debe hacer (pedidos, pagos, eventos): sin permiso de escritura para `authenticated`; las hace una función privada o el servidor.

## 4. Pruebas pgTAP (en el mismo cambio)

1. Agregá la tabla a la lista de cobertura de `supabase/tests/00_schema.test.sql` (si no, esa prueba falla a propósito). Si `anon` puede leerla, agregala también a la lista de lectura anónima.
2. Escribí su bloque de RLS por rol en el archivo de pruebas del módulo (por ejemplo `supabase/tests/02_rls_catalog.test.sql`), usando los datos de `supabase/seed.sql`:
   - **anónimo**: qué ve y que no puede escribir;
   - **dueño** y **staff** del comercio: lo que pueden y lo que no;
   - **otro comercio**: no ve, no crea, no edita, no borra (`with u as (update ... returning 1) select is(count(*)::int, 0, ...)`);
   - **usuario sin comercio**: nada;
   - **integridad**: `tenant_id` inmutable, FK compuesta rechaza cruces (`23503`), unicidad por comercio (`23505`), checks (`23514`), límites de plan (`P0001`).
3. Si la tabla tiene datos de prueba útiles, agregalos al seed con UUID fijos.

## 5. Verificar

```bash
npm run db:reset && npm run db:test && npm run db:lint && npm run db:advisors && npm run db:types
```

Todo tiene que pasar. Si podés, comprobá que las pruebas sirven rompiendo una política a mano (por ejemplo `using (true)`), corriendo `npm run db:test` y viendo que falla; después `npm run db:reset`.

## 6. Código

- Lecturas y escrituras en el módulo (`src/modules/<modulo>/queries.ts` y `mutations.ts`), siempre filtrando por el `tenantId` que devuelve `requireTenantAccess`.
- Prueba de integración en `tests/integration/` que intente escribir en otro comercio con una sesión real.
- Si el módulo es nuevo, agregalo a `MODULES` en `eslint.config.mjs`.
