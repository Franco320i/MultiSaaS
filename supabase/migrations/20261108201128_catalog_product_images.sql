-- =============================================================================
-- Módulo catálogo · Fotos de productos
-- Tabla catalog_product_images, bucket público catalog-public y políticas de Storage.
-- Diseño, secciones 3, 4, 5 y 8.
--
-- Rutas en el bucket (las arma el servidor, nunca el navegador):
--   {tenant_id}/products/{product_id}/{image_id}-480.webp
--   {tenant_id}/products/{product_id}/{image_id}-1280.webp
-- En la tabla se guarda la ruta base sin tamaño ni extensión:
--   {tenant_id}/products/{product_id}/{image_id}
-- =============================================================================

-- -----------------------------------------------------------------------------
-- catalog_product_images
-- -----------------------------------------------------------------------------
create table public.catalog_product_images (
  id           uuid not null default gen_random_uuid() primary key,
  tenant_id    uuid not null references public.tenants (id) on delete cascade,
  product_id   uuid not null,
  storage_path text not null unique,
  width        integer not null check (width between 1 and 10000),
  height       integer not null check (height between 1 and 10000),
  position     integer not null default 0,
  alt          text check (char_length(alt) <= 200),
  created_at   timestamptz not null default now(),
  unique (tenant_id, id),
  -- La ruta tiene que estar en la carpeta de su comercio y de su producto.
  check (storage_path = tenant_id::text || '/products/' || product_id::text || '/' || id::text),
  -- FK compuesta: una foto no puede quedar en un producto de otro comercio.
  foreign key (tenant_id, product_id)
    references public.catalog_products (tenant_id, id) on delete cascade
);

create index catalog_product_images_tenant_product_position_idx
  on public.catalog_product_images (tenant_id, product_id, position);

create trigger catalog_product_images_prevent_tenant_change
  before update on public.catalog_product_images
  for each row execute function private.prevent_tenant_change();

-- -----------------------------------------------------------------------------
-- Límite de fotos por producto según el plan (Base 3, Pro 8).
-- AFTER INSERT: corre después de RLS (mismo criterio que productos e invitaciones).
-- -----------------------------------------------------------------------------
create function private.enforce_product_image_limit()
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

  select count(*) into v_count
  from public.catalog_product_images i
  where i.tenant_id = new.tenant_id and i.product_id = new.product_id;

  if v_count > v_plan.max_images_per_product then
    raise exception 'El plan % permite hasta % fotos por producto.', v_plan.name, v_plan.max_images_per_product
      using errcode = 'P0001';
  end if;
  return null;
end;
$$;
revoke execute on function private.enforce_product_image_limit() from public, anon, authenticated;

create trigger catalog_product_images_enforce_limit
  after insert on public.catalog_product_images
  for each row execute function private.enforce_product_image_limit();

-- -----------------------------------------------------------------------------
-- RLS y permisos
-- Anónimo: fotos de productos publicados de comercios públicos.
-- Dueño y staff: todo lo de su comercio. Nadie cambia la ruta ni el producto.
-- -----------------------------------------------------------------------------
alter table public.catalog_product_images enable row level security;
revoke all on public.catalog_product_images from anon, authenticated;
grant select on public.catalog_product_images to anon, authenticated;
grant delete on public.catalog_product_images to authenticated;
grant insert (id, tenant_id, product_id, storage_path, width, height, position, alt)
  on public.catalog_product_images to authenticated;
grant update (position, alt) on public.catalog_product_images to authenticated;

create policy catalog_product_images_select_public on public.catalog_product_images
  for select to anon
  using (
    private.tenant_is_public(tenant_id)
    and exists (
      select 1 from public.catalog_products p
      where p.tenant_id = catalog_product_images.tenant_id
        and p.id = catalog_product_images.product_id
        and p.is_published
    )
  );

create policy catalog_product_images_select_member on public.catalog_product_images
  for select to authenticated
  using (tenant_id in (select private.my_tenant_ids()));

create policy catalog_product_images_insert_member on public.catalog_product_images
  for insert to authenticated
  with check (tenant_id in (select private.my_tenant_ids()));

create policy catalog_product_images_update_member on public.catalog_product_images
  for update to authenticated
  using (tenant_id in (select private.my_tenant_ids()))
  with check (tenant_id in (select private.my_tenant_ids()));

create policy catalog_product_images_delete_member on public.catalog_product_images
  for delete to authenticated
  using (tenant_id in (select private.my_tenant_ids()));

-- =============================================================================
-- Storage · bucket catalog-public
-- Público para leer por URL (las fotos del catálogo son públicas), pero:
--   - solo acepta WebP de hasta 2 MB (el servidor re-procesa todo a WebP);
--   - no hay política de lectura para anon: nadie puede LISTAR el bucket;
--   - los miembros solo escriben y borran dentro de la carpeta de su comercio.
-- =============================================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('catalog-public', 'catalog-public', true, 2097152, array['image/webp'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Primera carpeta = tenant_id de un comercio del usuario; segunda = 'products' o 'branding'.
create function private.can_write_catalog_object(p_name text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select (storage.foldername(p_name))[2] in ('products', 'branding')
     and (storage.foldername(p_name))[1] in (
       select tm.tenant_id::text
       from public.tenant_members tm
       where tm.user_id = (select auth.uid())
     );
$$;
revoke execute on function private.can_write_catalog_object(text) from public;
grant execute on function private.can_write_catalog_object(text) to authenticated;

-- La API de Storage lee el objeto antes de borrarlo: los miembros necesitan SELECT
-- sobre su propia carpeta (anon no tiene ninguno: no se puede listar el bucket).
create policy catalog_public_select_member on storage.objects
  for select to authenticated
  using (bucket_id = 'catalog-public' and private.can_write_catalog_object(name));

create policy catalog_public_insert_member on storage.objects
  for insert to authenticated
  with check (bucket_id = 'catalog-public' and private.can_write_catalog_object(name));

create policy catalog_public_delete_member on storage.objects
  for delete to authenticated
  using (bucket_id = 'catalog-public' and private.can_write_catalog_object(name));

-- Sin política de UPDATE: las fotos no se reemplazan, cada subida tiene un nombre nuevo.
