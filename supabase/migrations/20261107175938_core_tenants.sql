-- =============================================================================
-- Núcleo · Comercios, usuarios y acceso
-- Tablas: business_templates, reserved_slugs, tenants, profiles, tenant_members,
--         platform_admins, domains, tenant_invitations.
-- Diseño, secciones 3, 4, 5 y 6.
--
-- Patrón de permisos en todas las tablas:
--   1. RLS activado.
--   2. Se revocan TODOS los permisos de anon y authenticated (Supabase los otorga
--      por defecto) y se devuelven solo los necesarios; los UPDATE, por columna.
--   3. Una política por operación y por rol, nunca `for all`.
-- service_role conserva sus permisos y no pasa por RLS: solo lo usa el servidor.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- business_templates · plantillas por rubro (catálogo global)
-- -----------------------------------------------------------------------------
create table public.business_templates (
  key                text primary key check (key ~ '^[a-z_]{2,40}$'),
  name               text not null check (char_length(name) between 2 and 60),
  default_theme      jsonb not null default '{}'::jsonb check (jsonb_typeof(default_theme) = 'object'),
  default_categories text[] not null default '{}',
  is_active          boolean not null default true
);

insert into public.business_templates (key, name, default_categories) values
  ('gastronomia',  'Gastronomía',  array['Destacados', 'Principales', 'Bebidas', 'Postres']),
  ('indumentaria', 'Indumentaria', array['Novedades', 'Mujer', 'Hombre', 'Accesorios']),
  ('tecnologia',   'Tecnología',   array['Celulares', 'Accesorios', 'Audio']),
  ('dietetica',    'Dietética',    array['Frutos secos', 'Harinas', 'Sin TACC', 'Suplementos']),
  ('general',      'General',      array['Destacados', 'Productos']);

alter table public.business_templates enable row level security;
revoke all on public.business_templates from anon, authenticated;
grant select on public.business_templates to anon, authenticated;

create policy business_templates_select_all on public.business_templates
  for select to anon, authenticated using (true);

-- -----------------------------------------------------------------------------
-- reserved_slugs · subdominios que nunca pueden ser de un comercio
-- Mantener igual a RESERVED_SLUGS en src/core/tenancy/slug.ts
-- -----------------------------------------------------------------------------
create table public.reserved_slugs (
  slug text primary key check (slug = lower(slug))
);

insert into public.reserved_slugs (slug) values
  ('www'), ('app'), ('admin'), ('api'), ('mail'), ('staging'), ('static'),
  ('cdn'), ('ayuda'), ('soporte'), ('blog'), ('status'), ('docs');

alter table public.reserved_slugs enable row level security;
revoke all on public.reserved_slugs from anon, authenticated;
grant select on public.reserved_slugs to anon, authenticated;

create policy reserved_slugs_select_all on public.reserved_slugs
  for select to anon, authenticated using (true);

-- -----------------------------------------------------------------------------
-- tenants · comercios
-- -----------------------------------------------------------------------------
create table public.tenants (
  id            uuid primary key default gen_random_uuid(),
  slug          text not null unique
                check (slug ~ '^[a-z0-9][a-z0-9-]{1,38}[a-z0-9]$' and slug not like 'xn--%'),
  name          text not null check (char_length(btrim(name)) between 2 and 80),
  business_type text not null references public.business_templates (key),
  status        text not null default 'trial'
                check (status in ('trial', 'active', 'past_due', 'suspended', 'cancelled')),
  trial_ends_at timestamptz,
  published_at  timestamptz,
  status_reason text check (char_length(status_reason) <= 500),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index tenants_status_idx on public.tenants (status);
create index tenants_business_type_idx on public.tenants (business_type);

create trigger tenants_set_updated_at
  before update on public.tenants
  for each row execute function private.set_updated_at();

-- El slug no puede ser un subdominio reservado.
create function private.check_reserved_slug()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if exists (select 1 from public.reserved_slugs r where r.slug = new.slug) then
    raise exception 'El slug "%" está reservado.', new.slug using errcode = '23514';
  end if;
  return new;
end;
$$;
revoke execute on function private.check_reserved_slug() from public, anon, authenticated;

create trigger tenants_check_reserved_slug
  before insert or update of slug on public.tenants
  for each row execute function private.check_reserved_slug();

-- -----------------------------------------------------------------------------
-- profiles · datos visibles de cada usuario (1 a 1 con auth.users)
-- -----------------------------------------------------------------------------
create table public.profiles (
  id         uuid primary key references auth.users (id) on delete cascade,
  full_name  text check (char_length(full_name) <= 120),
  phone      text check (phone ~ '^\+[1-9][0-9]{7,14}$'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function private.set_updated_at();

-- Cada usuario nuevo de Auth recibe su perfil vacío. No se copian metadatos del
-- usuario: los puede editar él mismo y no deben usarse para nada de autorización.
create function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id) values (new.id) on conflict (id) do nothing;
  return new;
end;
$$;
revoke execute on function private.handle_new_user() from public, anon, authenticated;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_user();

-- -----------------------------------------------------------------------------
-- tenant_members · qué usuario pertenece a qué comercio y con qué rol
-- -----------------------------------------------------------------------------
create table public.tenant_members (
  tenant_id  uuid not null references public.tenants (id) on delete cascade,
  user_id    uuid not null references auth.users (id) on delete cascade,
  role       text not null check (role in ('owner', 'staff')),
  invited_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  primary key (tenant_id, user_id)
);

-- Un solo dueño por comercio.
create unique index tenant_members_one_owner_idx on public.tenant_members (tenant_id) where role = 'owner';
-- "Mis comercios": la consulta que hace casi toda política RLS.
create index tenant_members_user_id_idx on public.tenant_members (user_id, role);
create index tenant_members_invited_by_idx on public.tenant_members (invited_by);

create trigger tenant_members_prevent_tenant_change
  before update on public.tenant_members
  for each row execute function private.prevent_tenant_change();

-- -----------------------------------------------------------------------------
-- platform_admins · superadministradores y soporte (se cargan solo por SQL)
-- -----------------------------------------------------------------------------
create table public.platform_admins (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  role       text not null check (role in ('superadmin', 'support')),
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

create index platform_admins_created_by_idx on public.platform_admins (created_by);

-- -----------------------------------------------------------------------------
-- domains · subdominios y dominios propios
-- -----------------------------------------------------------------------------
create table public.domains (
  id           uuid primary key default gen_random_uuid(),
  tenant_id    uuid not null references public.tenants (id) on delete cascade,
  hostname     text not null unique
               check (
                 hostname = lower(hostname)
                 and char_length(hostname) <= 253
                 and hostname ~ '^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$'
               ),
  kind         text not null check (kind in ('subdomain', 'custom')),
  is_primary   boolean not null default false,
  status       text not null default 'pending' check (status in ('pending', 'active', 'failed')),
  verification jsonb not null default '{}'::jsonb check (jsonb_typeof(verification) = 'object'),
  verified_at  timestamptz,
  created_at   timestamptz not null default now(),
  unique (tenant_id, id)
);

create unique index domains_one_primary_idx on public.domains (tenant_id) where is_primary;

create trigger domains_prevent_tenant_change
  before update on public.domains
  for each row execute function private.prevent_tenant_change();

-- -----------------------------------------------------------------------------
-- tenant_invitations · invitaciones a staff (y a dueño, solo desde el panel central)
-- -----------------------------------------------------------------------------
create table public.tenant_invitations (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid not null references public.tenants (id) on delete cascade,
  email       text not null
              check (email = lower(email) and char_length(email) <= 254 and email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  role        text not null check (role in ('owner', 'staff')),
  -- SHA-256 en hexadecimal del token; el token en claro viaja solo en el correo.
  token_hash  text not null unique check (token_hash ~ '^[0-9a-f]{64}$'),
  invited_by  uuid references auth.users (id) on delete set null,
  expires_at  timestamptz not null default (now() + interval '7 days'),
  accepted_at timestamptz,
  revoked_at  timestamptz,
  created_at  timestamptz not null default now(),
  unique (tenant_id, id),
  check (accepted_at is null or revoked_at is null)
);

create unique index tenant_invitations_pending_email_idx
  on public.tenant_invitations (tenant_id, email)
  where accepted_at is null and revoked_at is null;
create index tenant_invitations_tenant_created_idx on public.tenant_invitations (tenant_id, created_at desc);
create index tenant_invitations_invited_by_idx on public.tenant_invitations (invited_by);

create trigger tenant_invitations_prevent_tenant_change
  before update on public.tenant_invitations
  for each row execute function private.prevent_tenant_change();

-- =============================================================================
-- Funciones auxiliares de RLS (security definer, esquema private)
-- Leen tenant_members sin quedar atrapadas por su propia RLS. Se usan dentro de
-- `in (select ...)` para que Postgres las evalúe una vez por consulta.
-- =============================================================================

-- Comercios donde el usuario actual es miembro con alguno de los roles pedidos.
create function private.my_tenant_ids(p_roles text[] default array['owner', 'staff'])
returns setof uuid
language sql
stable
security definer
set search_path = ''
as $$
  select tm.tenant_id
  from public.tenant_members tm
  where tm.user_id = (select auth.uid())
    and tm.role = any (p_roles);
$$;

-- Usuarios que comparten algún comercio con el usuario actual (incluido él).
create function private.my_teammate_ids()
returns setof uuid
language sql
stable
security definer
set search_path = ''
as $$
  select distinct other.user_id
  from public.tenant_members mine
  join public.tenant_members other on other.tenant_id = mine.tenant_id
  where mine.user_id = (select auth.uid());
$$;

-- Comercio visible al público: en un estado que lo permite y publicado.
create function private.tenant_is_public(p_tenant_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.tenants t
    where t.id = p_tenant_id
      and t.status in ('trial', 'active', 'past_due')
      and t.published_at is not null
  );
$$;

revoke execute on function private.my_tenant_ids(text[]) from public;
revoke execute on function private.my_teammate_ids() from public;
revoke execute on function private.tenant_is_public(uuid) from public;
grant execute on function private.my_tenant_ids(text[]) to authenticated;
grant execute on function private.my_teammate_ids() to authenticated;
grant execute on function private.tenant_is_public(uuid) to anon, authenticated;

-- =============================================================================
-- RLS y permisos
-- =============================================================================

-- tenants: los miembros leen su comercio. Altas y cambios: solo el servidor.
alter table public.tenants enable row level security;
revoke all on public.tenants from anon, authenticated;
grant select on public.tenants to authenticated;

create policy tenants_select_member on public.tenants
  for select to authenticated
  using (id in (select private.my_tenant_ids()));

-- profiles: el propio y los de quienes comparten comercio; cada uno edita el suyo.
alter table public.profiles enable row level security;
revoke all on public.profiles from anon, authenticated;
grant select on public.profiles to authenticated;
grant update (full_name, phone) on public.profiles to authenticated;

create policy profiles_select_self_or_teammate on public.profiles
  for select to authenticated
  using (id = (select auth.uid()) or id in (select private.my_teammate_ids()));

create policy profiles_update_self on public.profiles
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- tenant_members: los miembros ven a su equipo; el dueño puede quitar staff (no a sí mismo).
alter table public.tenant_members enable row level security;
revoke all on public.tenant_members from anon, authenticated;
grant select, delete on public.tenant_members to authenticated;

create policy tenant_members_select_member on public.tenant_members
  for select to authenticated
  using (tenant_id in (select private.my_tenant_ids()));

create policy tenant_members_delete_owner on public.tenant_members
  for delete to authenticated
  using (
    tenant_id in (select private.my_tenant_ids(array['owner']))
    and role = 'staff'
    and user_id <> (select auth.uid())
  );

-- platform_admins: cada uno ve solo su propia fila. Altas por SQL.
alter table public.platform_admins enable row level security;
revoke all on public.platform_admins from anon, authenticated;
grant select on public.platform_admins to authenticated;

create policy platform_admins_select_self on public.platform_admins
  for select to authenticated
  using (user_id = (select auth.uid()));

-- domains: los miembros leen; los cambios los hace el panel central.
alter table public.domains enable row level security;
revoke all on public.domains from anon, authenticated;
grant select on public.domains to authenticated;

create policy domains_select_member on public.domains
  for select to authenticated
  using (tenant_id in (select private.my_tenant_ids()));

-- tenant_invitations: solo el dueño ve, crea (rol staff) y revoca.
alter table public.tenant_invitations enable row level security;
revoke all on public.tenant_invitations from anon, authenticated;
grant select on public.tenant_invitations to authenticated;
grant insert (tenant_id, email, role, token_hash, invited_by) on public.tenant_invitations to authenticated;
grant update (revoked_at) on public.tenant_invitations to authenticated;

create policy tenant_invitations_select_owner on public.tenant_invitations
  for select to authenticated
  using (tenant_id in (select private.my_tenant_ids(array['owner'])));

create policy tenant_invitations_insert_owner on public.tenant_invitations
  for insert to authenticated
  with check (
    tenant_id in (select private.my_tenant_ids(array['owner']))
    and role = 'staff'
    and invited_by = (select auth.uid())
  );

create policy tenant_invitations_update_owner on public.tenant_invitations
  for update to authenticated
  using (tenant_id in (select private.my_tenant_ids(array['owner'])) and accepted_at is null)
  with check (tenant_id in (select private.my_tenant_ids(array['owner'])));
