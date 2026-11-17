-- =============================================================================
-- Capa 1 · Pruebas sobre el propio esquema (diseño, sección 13)
-- Detectan tablas o funciones nuevas que no siguen las reglas, ANTES de que
-- alguien escriba sus pruebas específicas. Si agregás una tabla, esta prueba
-- falla hasta que la agregues a la lista de cobertura y a 01_rls_core (o al
-- archivo de pruebas de su módulo).
-- =============================================================================
begin;
create extension if not exists pgtap with schema extensions;
select no_plan();

-- Tablas globales (sin tenant_id). Todo lo demás es tabla de comercio.
create temp table global_tables (name text primary key) on commit drop;
insert into global_tables values
  ('business_templates'), ('reserved_slugs'), ('plans'), ('modules'),
  ('tenants'), ('profiles'), ('platform_admins'), ('rate_limits'),
  ('audit_log');  -- tenant_id opcional y sin FK, para sobrevivir a una purga

create temp view tenant_tables as
  select c.oid as relid, c.relname as name
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public'
    and c.relkind in ('r', 'p')
    and c.relname not in (select name from global_tables);

-- -----------------------------------------------------------------------------
-- Cobertura: la lista exacta de tablas. Una tabla nueva rompe esta prueba.
-- -----------------------------------------------------------------------------
select set_eq(
  $$ select c.relname::text from pg_class c join pg_namespace n on n.oid = c.relnamespace
     where n.nspname = 'public' and c.relkind in ('r', 'p') $$,
  array[
    'business_templates', 'reserved_slugs', 'tenants', 'profiles', 'tenant_members',
    'platform_admins', 'domains', 'tenant_invitations', 'plans', 'modules',
    'subscriptions', 'billing_payments', 'tenant_modules', 'tenant_settings',
    'business_hours', 'events', 'audit_log', 'tenant_counters', 'rate_limits',
    'catalog_categories', 'catalog_products', 'catalog_product_images',
    'orders', 'order_items'
  ],
  'La lista de tablas de public es la esperada (agregá las nuevas acá y a sus pruebas de RLS)'
);

-- -----------------------------------------------------------------------------
-- RLS
-- -----------------------------------------------------------------------------
select is_empty(
  $$ select c.relname from pg_class c join pg_namespace n on n.oid = c.relnamespace
     where n.nspname = 'public' and c.relkind in ('r', 'p') and not c.relrowsecurity $$,
  'Todas las tablas de public tienen RLS activado'
);

select is_empty(
  $$ select tablename || '.' || policyname from pg_policies
     where schemaname = 'public' and cmd = 'ALL' $$,
  'Ninguna política usa FOR ALL'
);

select is_empty(
  $$ select tablename || '.' || policyname from pg_policies
     where schemaname = 'public' and 'public' = any (roles) $$,
  'Toda política declara un rol explícito (anon o authenticated)'
);

select is_empty(
  $$ select tablename || '.' || policyname from pg_policies
     where schemaname = 'public' and cmd = 'UPDATE' and (qual is null or with_check is null) $$,
  'Toda política UPDATE tiene USING y WITH CHECK'
);

-- -----------------------------------------------------------------------------
-- Tablas de comercio
-- -----------------------------------------------------------------------------
select is_empty(
  $$ select t.name from tenant_tables t
     where not exists (
       select 1 from pg_attribute a
       where a.attrelid = t.relid and a.attname = 'tenant_id' and a.attnotnull and not a.attisdropped
     ) $$,
  'Toda tabla de comercio tiene tenant_id NOT NULL'
);

select is_empty(
  $$ select t.name from tenant_tables t
     where not exists (
       select 1 from pg_constraint k
       join pg_attribute a on a.attrelid = k.conrelid and a.attname = 'tenant_id'
       where k.conrelid = t.relid and k.contype = 'f'
         and k.confrelid = 'public.tenants'::regclass
         and k.conkey = array[a.attnum]
     ) $$,
  'Toda tabla de comercio tiene FK de tenant_id a tenants'
);

select is_empty(
  $$ select t.name from tenant_tables t
     where not exists (
       select 1 from pg_trigger tg
       where tg.tgrelid = t.relid and not tg.tgisinternal
         and tg.tgfoid in ('private.prevent_tenant_change'::regproc, 'private.prevent_modification'::regproc)
     ) $$,
  'Toda tabla de comercio impide cambiar tenant_id por trigger'
);

select is_empty(
  $$ select t.name from tenant_tables t
     join pg_attribute idc on idc.attrelid = t.relid and idc.attname = 'id' and idc.atttypid = 'uuid'::regtype
     join pg_attribute tid on tid.attrelid = t.relid and tid.attname = 'tenant_id'
     where not exists (
       select 1 from pg_constraint k
       where k.conrelid = t.relid and k.contype in ('u', 'p')
         and k.conkey @> array[tid.attnum, idc.attnum] and cardinality(k.conkey) = 2
     ) $$,
  'Toda tabla de comercio con id uuid tiene UNIQUE (tenant_id, id)'
);

select is_empty(
  $$ select src.relname || ' -> ' || dst.relname || ' (' || k.conname || ')'
     from pg_constraint k
     join pg_class src on src.oid = k.conrelid
     join pg_class dst on dst.oid = k.confrelid
     join pg_attribute tid on tid.attrelid = src.oid and tid.attname = 'tenant_id'
     where k.contype = 'f'
       and src.oid in (select relid from tenant_tables)
       and dst.oid in (select relid from tenant_tables)
       and not (k.conkey @> array[tid.attnum]) $$,
  'Toda FK entre tablas de comercio es compuesta e incluye tenant_id'
);

-- -----------------------------------------------------------------------------
-- Funciones y vistas
-- -----------------------------------------------------------------------------
select is_empty(
  $$ select p.proname from pg_proc p join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public' and p.prosecdef
       and p.proname not in ('storefront_by_host', 'slug_available', 'accept_invitation') $$,
  'En public solo hay funciones SECURITY DEFINER de la lista cerrada'
);

select is_empty(
  $$ select n.nspname || '.' || p.proname from pg_proc p join pg_namespace n on n.oid = p.pronamespace
     where n.nspname in ('public', 'private') and p.prosecdef
       and not exists (select 1 from unnest(coalesce(p.proconfig, '{}')) c where c like 'search_path=%') $$,
  'Toda función SECURITY DEFINER fija search_path'
);

select is_empty(
  $$ select c.relname from pg_class c join pg_namespace n on n.oid = c.relnamespace
     where n.nspname = 'public' and c.relkind = 'v'
       and not coalesce(c.reloptions @> array['security_invoker=true'], false) $$,
  'Toda vista de public usa security_invoker'
);

-- -----------------------------------------------------------------------------
-- Permisos de anon: solo lectura, y solo donde corresponde
-- -----------------------------------------------------------------------------
select is_empty(
  $$ select table_name || ':' || privilege_type from information_schema.role_table_grants
     where grantee = 'anon' and table_schema = 'public' and privilege_type <> 'SELECT'
     union all
     select table_name || '.' || column_name || ':' || privilege_type from information_schema.column_privileges
     where grantee = 'anon' and table_schema = 'public' and privilege_type <> 'SELECT' $$,
  'anon no tiene permisos de escritura en ninguna tabla'
);

select set_eq(
  $$ select distinct table_name::text from information_schema.role_table_grants
     where grantee = 'anon' and table_schema = 'public' $$,
  array['business_templates', 'reserved_slugs', 'plans', 'modules',
        'catalog_categories', 'catalog_products', 'catalog_product_images'],
  'anon solo puede leer los catálogos globales y el catálogo público (filtrado por RLS)'
);

select * from finish();
rollback;
