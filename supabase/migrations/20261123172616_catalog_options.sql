-- =============================================================================
-- Módulo catálogo · Opciones del producto (parte 3)
-- docs/superpowers/specs/2026-11-23-opciones-producto-design.md
--
-- catalog_option_groups: grupos por producto ("Talle", "Tamaño", "Extras").
--   required: hay que elegir al menos una. max_choices: 1 = se elige una; 2–20 = varias.
-- catalog_options: opciones de un grupo, con precio adicional (centavos, ≥ 0) y
--   is_available para marcarla agotada sin borrarla.
-- Límites: 5 grupos por producto y 20 opciones por grupo (triggers AFTER INSERT).
-- El precio final lo calcula private.create_order (nunca el navegador).
-- =============================================================================

create table public.catalog_option_groups (
  id          uuid not null default gen_random_uuid() primary key,
  tenant_id   uuid not null references public.tenants (id) on delete cascade,
  product_id  uuid not null,
  name        text not null check (char_length(btrim(name)) between 1 and 40),
  required    boolean not null default false,
  max_choices integer not null default 1 check (max_choices between 1 and 20),
  position    integer not null default 0,
  created_at  timestamptz not null default now(),
  unique (tenant_id, id),
  foreign key (tenant_id, product_id) references public.catalog_products (tenant_id, id) on delete cascade
);

create index catalog_option_groups_tenant_product_position_idx
  on public.catalog_option_groups (tenant_id, product_id, position);

create trigger catalog_option_groups_prevent_tenant_change
  before update on public.catalog_option_groups
  for each row execute function private.prevent_tenant_change();

create table public.catalog_options (
  id           uuid not null default gen_random_uuid() primary key,
  tenant_id    uuid not null references public.tenants (id) on delete cascade,
  group_id     uuid not null,
  name         text not null check (char_length(btrim(name)) between 1 and 40),
  price_delta  bigint not null default 0 check (price_delta between 0 and 100000000000),
  is_available boolean not null default true,
  position     integer not null default 0,
  created_at   timestamptz not null default now(),
  unique (tenant_id, id),
  foreign key (tenant_id, group_id) references public.catalog_option_groups (tenant_id, id) on delete cascade
);

create index catalog_options_tenant_group_position_idx
  on public.catalog_options (tenant_id, group_id, position);

create trigger catalog_options_prevent_tenant_change
  before update on public.catalog_options
  for each row execute function private.prevent_tenant_change();

-- -----------------------------------------------------------------------------
-- Límites. AFTER INSERT: corren después de RLS (mismo criterio que productos y fotos).
-- -----------------------------------------------------------------------------
create function private.enforce_option_group_limit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select count(*) from public.catalog_option_groups g
      where g.tenant_id = new.tenant_id and g.product_id = new.product_id) > 5 then
    raise exception 'Un producto puede tener hasta 5 grupos de opciones.' using errcode = 'P0001';
  end if;
  return null;
end;
$$;
revoke execute on function private.enforce_option_group_limit() from public, anon, authenticated;

create trigger catalog_option_groups_enforce_limit
  after insert on public.catalog_option_groups
  for each row execute function private.enforce_option_group_limit();

create function private.enforce_option_limit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select count(*) from public.catalog_options o
      where o.tenant_id = new.tenant_id and o.group_id = new.group_id) > 20 then
    raise exception 'Un grupo puede tener hasta 20 opciones.' using errcode = 'P0001';
  end if;
  return null;
end;
$$;
revoke execute on function private.enforce_option_limit() from public, anon, authenticated;

create trigger catalog_options_enforce_limit
  after insert on public.catalog_options
  for each row execute function private.enforce_option_limit();

-- -----------------------------------------------------------------------------
-- RLS y permisos. Anónimo: solo opciones de productos publicados de comercios públicos.
-- Miembros (dueño y staff): todo lo de su comercio, como el resto del catálogo.
-- -----------------------------------------------------------------------------
alter table public.catalog_option_groups enable row level security;
alter table public.catalog_options enable row level security;
revoke all on public.catalog_option_groups from anon, authenticated;
revoke all on public.catalog_options from anon, authenticated;

grant select on public.catalog_option_groups to anon, authenticated;
grant delete on public.catalog_option_groups to authenticated;
grant insert (tenant_id, product_id, name, required, max_choices, position) on public.catalog_option_groups to authenticated;
grant update (name, required, max_choices, position) on public.catalog_option_groups to authenticated;

grant select on public.catalog_options to anon, authenticated;
grant delete on public.catalog_options to authenticated;
grant insert (tenant_id, group_id, name, price_delta, is_available, position) on public.catalog_options to authenticated;
grant update (name, price_delta, is_available, position) on public.catalog_options to authenticated;

create policy catalog_option_groups_select_public on public.catalog_option_groups
  for select to anon
  using (
    private.tenant_is_public(tenant_id)
    and exists (
      select 1 from public.catalog_products p
      where p.tenant_id = catalog_option_groups.tenant_id
        and p.id = catalog_option_groups.product_id
        and p.is_published
    )
  );

create policy catalog_option_groups_select_member on public.catalog_option_groups
  for select to authenticated
  using (tenant_id in (select private.my_tenant_ids()));

create policy catalog_option_groups_insert_member on public.catalog_option_groups
  for insert to authenticated
  with check (tenant_id in (select private.my_tenant_ids()));

create policy catalog_option_groups_update_member on public.catalog_option_groups
  for update to authenticated
  using (tenant_id in (select private.my_tenant_ids()))
  with check (tenant_id in (select private.my_tenant_ids()));

create policy catalog_option_groups_delete_member on public.catalog_option_groups
  for delete to authenticated
  using (tenant_id in (select private.my_tenant_ids()));

create policy catalog_options_select_public on public.catalog_options
  for select to anon
  using (
    private.tenant_is_public(tenant_id)
    and exists (
      select 1
      from public.catalog_option_groups g
      join public.catalog_products p on p.tenant_id = g.tenant_id and p.id = g.product_id
      where g.tenant_id = catalog_options.tenant_id
        and g.id = catalog_options.group_id
        and p.is_published
    )
  );

create policy catalog_options_select_member on public.catalog_options
  for select to authenticated
  using (tenant_id in (select private.my_tenant_ids()));

create policy catalog_options_insert_member on public.catalog_options
  for insert to authenticated
  with check (tenant_id in (select private.my_tenant_ids()));

create policy catalog_options_update_member on public.catalog_options
  for update to authenticated
  using (tenant_id in (select private.my_tenant_ids()))
  with check (tenant_id in (select private.my_tenant_ids()));

create policy catalog_options_delete_member on public.catalog_options
  for delete to authenticated
  using (tenant_id in (select private.my_tenant_ids()));
