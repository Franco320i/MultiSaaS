-- =============================================================================
-- Módulo catálogo · Categorías y productos
-- Tablas: catalog_categories, catalog_products. (Las imágenes llegan en la etapa 5.)
-- Diseño, secciones 3, 4 y 5. Mismo patrón de permisos que el núcleo.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- catalog_categories
-- -----------------------------------------------------------------------------
create table public.catalog_categories (
  id          uuid not null default gen_random_uuid() primary key,
  tenant_id   uuid not null references public.tenants (id) on delete cascade,
  name        text not null check (char_length(btrim(name)) between 1 and 60),
  slug        text not null check (slug ~ '^[a-z0-9]([a-z0-9-]{0,78}[a-z0-9])?$'),
  description text check (char_length(description) <= 300),
  position    integer not null default 0,
  is_visible  boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (tenant_id, id),
  unique (tenant_id, slug)
);

create index catalog_categories_tenant_position_idx on public.catalog_categories (tenant_id, position);

create trigger catalog_categories_set_updated_at
  before update on public.catalog_categories
  for each row execute function private.set_updated_at();
create trigger catalog_categories_prevent_tenant_change
  before update on public.catalog_categories
  for each row execute function private.prevent_tenant_change();

-- -----------------------------------------------------------------------------
-- catalog_products
-- -----------------------------------------------------------------------------
create table public.catalog_products (
  id               uuid not null default gen_random_uuid() primary key,
  tenant_id        uuid not null references public.tenants (id) on delete cascade,
  category_id      uuid,
  name             text not null check (char_length(btrim(name)) between 1 and 120),
  slug             text not null check (slug ~ '^[a-z0-9]([a-z0-9-]{0,118}[a-z0-9])?$'),
  description      text check (char_length(description) <= 2000),
  price            bigint not null check (price >= 0),                     -- centavos
  compare_at_price bigint,                                                  -- centavos, precio "antes"
  is_published     boolean not null default false,
  is_available     boolean not null default true,                           -- false = "sin stock hoy"
  is_featured      boolean not null default false,
  position         integer not null default 0,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  unique (tenant_id, id),
  unique (tenant_id, slug),
  check (compare_at_price is null or compare_at_price > price),
  -- FK compuesta: un producto no puede quedar en la categoría de otro comercio.
  -- Al borrar la categoría solo se anula category_id (nunca tenant_id).
  foreign key (tenant_id, category_id)
    references public.catalog_categories (tenant_id, id) on delete set null (category_id)
);

create index catalog_products_tenant_category_position_idx
  on public.catalog_products (tenant_id, category_id, position);
create index catalog_products_tenant_published_position_idx
  on public.catalog_products (tenant_id, position) where is_published;

create trigger catalog_products_set_updated_at
  before update on public.catalog_products
  for each row execute function private.set_updated_at();
create trigger catalog_products_prevent_tenant_change
  before update on public.catalog_products
  for each row execute function private.prevent_tenant_change();

-- -----------------------------------------------------------------------------
-- Límite de productos por plan (null en el plan = ilimitado).
-- AFTER INSERT para correr después de RLS (mismo criterio que las invitaciones).
-- -----------------------------------------------------------------------------
create function private.enforce_product_limit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_plan public.plans;
  v_count integer;
begin
  v_plan := private.tenant_plan(new.tenant_id);
  if v_plan.id is null then
    raise exception 'El comercio no tiene una suscripción vigente.' using errcode = 'P0001';
  end if;
  if v_plan.max_products is null then
    return null;
  end if;

  select count(*) into v_count from public.catalog_products p where p.tenant_id = new.tenant_id;
  if v_count > v_plan.max_products then
    raise exception 'El plan % permite hasta % productos.', v_plan.name, v_plan.max_products
      using errcode = 'P0001';
  end if;
  return null;
end;
$$;
revoke execute on function private.enforce_product_limit() from public, anon, authenticated;

create trigger catalog_products_enforce_limit
  after insert on public.catalog_products
  for each row execute function private.enforce_product_limit();

-- =============================================================================
-- RLS y permisos
-- Anónimo: solo lo visible/publicado de comercios públicos (lo usará el catálogo
-- público en la etapa 6). Dueño y staff: todo lo de su comercio.
-- =============================================================================

alter table public.catalog_categories enable row level security;
revoke all on public.catalog_categories from anon, authenticated;
grant select on public.catalog_categories to anon, authenticated;
grant delete on public.catalog_categories to authenticated;
grant insert (tenant_id, name, slug, description, position, is_visible)
  on public.catalog_categories to authenticated;
grant update (name, slug, description, position, is_visible)
  on public.catalog_categories to authenticated;

create policy catalog_categories_select_public on public.catalog_categories
  for select to anon
  using (is_visible and private.tenant_is_public(tenant_id));

create policy catalog_categories_select_member on public.catalog_categories
  for select to authenticated
  using (tenant_id in (select private.my_tenant_ids()));

create policy catalog_categories_insert_member on public.catalog_categories
  for insert to authenticated
  with check (tenant_id in (select private.my_tenant_ids()));

create policy catalog_categories_update_member on public.catalog_categories
  for update to authenticated
  using (tenant_id in (select private.my_tenant_ids()))
  with check (tenant_id in (select private.my_tenant_ids()));

create policy catalog_categories_delete_member on public.catalog_categories
  for delete to authenticated
  using (tenant_id in (select private.my_tenant_ids()));

alter table public.catalog_products enable row level security;
revoke all on public.catalog_products from anon, authenticated;
grant select on public.catalog_products to anon, authenticated;
grant delete on public.catalog_products to authenticated;
grant insert (tenant_id, category_id, name, slug, description, price, compare_at_price,
              is_published, is_available, is_featured, position)
  on public.catalog_products to authenticated;
grant update (category_id, name, slug, description, price, compare_at_price,
              is_published, is_available, is_featured, position)
  on public.catalog_products to authenticated;

create policy catalog_products_select_public on public.catalog_products
  for select to anon
  using (is_published and private.tenant_is_public(tenant_id));

create policy catalog_products_select_member on public.catalog_products
  for select to authenticated
  using (tenant_id in (select private.my_tenant_ids()));

create policy catalog_products_insert_member on public.catalog_products
  for insert to authenticated
  with check (tenant_id in (select private.my_tenant_ids()));

create policy catalog_products_update_member on public.catalog_products
  for update to authenticated
  using (tenant_id in (select private.my_tenant_ids()))
  with check (tenant_id in (select private.my_tenant_ids()));

create policy catalog_products_delete_member on public.catalog_products
  for delete to authenticated
  using (tenant_id in (select private.my_tenant_ids()));
