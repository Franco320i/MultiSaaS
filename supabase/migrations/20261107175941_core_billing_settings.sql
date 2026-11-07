-- =============================================================================
-- Núcleo · Planes, cobro, módulos y configuración del comercio
-- Tablas: plans, modules, subscriptions, billing_payments, tenant_modules,
--         tenant_settings, business_hours.
-- Diseño, secciones 3, 4 y 5. Mismo patrón de permisos que core_tenants.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- plans · límites como columnas tipadas para que triggers y RLS los lean directo
-- -----------------------------------------------------------------------------
create table public.plans (
  id                     text primary key check (id ~ '^[a-z_]{2,30}$'),
  name                   text not null check (char_length(name) between 2 and 40),
  price_ars              bigint not null check (price_ars >= 0),          -- centavos
  max_products           integer check (max_products > 0),                -- null = ilimitado
  max_members            integer not null check (max_members > 0),
  max_images_per_product integer not null check (max_images_per_product > 0),
  custom_domain          boolean not null default false,
  remove_branding        boolean not null default false,
  is_public              boolean not null default true,
  sort                   integer not null default 0
);

-- Precios provisorios (se ajustan por migración cada trimestre).
insert into public.plans
  (id, name, price_ars, max_products, max_members, max_images_per_product, custom_domain, remove_branding, sort)
values
  ('base', 'Base', 2490000, 150,  1, 3, false, false, 1),
  ('pro',  'Pro',  3990000, null, 3, 8, true,  true,  2);

alter table public.plans enable row level security;
revoke all on public.plans from anon, authenticated;
grant select on public.plans to anon, authenticated;

create policy plans_select_all on public.plans
  for select to anon, authenticated using (true);

-- -----------------------------------------------------------------------------
-- modules · catálogo de módulos de la plataforma
-- -----------------------------------------------------------------------------
create table public.modules (
  key          text primary key check (key ~ '^[a-z_]{2,30}$'),
  name         text not null check (char_length(name) between 2 and 60),
  description  text check (char_length(description) <= 300),
  is_available boolean not null default true,
  sort         integer not null default 0
);

insert into public.modules (key, name, description, sort) values
  ('catalog', 'Catálogo', 'Productos, categorías e imágenes.', 1),
  ('orders',  'Pedidos',  'Carrito y pedidos por WhatsApp.',   2);

alter table public.modules enable row level security;
revoke all on public.modules from anon, authenticated;
grant select on public.modules to anon, authenticated;

create policy modules_select_all on public.modules
  for select to anon, authenticated using (true);

-- -----------------------------------------------------------------------------
-- subscriptions · una vigente por comercio
-- -----------------------------------------------------------------------------
create table public.subscriptions (
  id                   uuid primary key default gen_random_uuid(),
  tenant_id            uuid not null references public.tenants (id) on delete cascade,
  plan_id              text not null references public.plans (id),
  status               text not null check (status in ('trialing', 'active', 'past_due', 'cancelled')),
  provider             text not null default 'manual' check (provider in ('manual', 'mercadopago')),
  provider_ref         text check (char_length(provider_ref) <= 200),
  current_period_start timestamptz not null default now(),
  current_period_end   timestamptz not null,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  unique (tenant_id, id),
  check (current_period_end > current_period_start)
);

create unique index subscriptions_one_current_idx on public.subscriptions (tenant_id) where status <> 'cancelled';
create index subscriptions_status_period_end_idx on public.subscriptions (status, current_period_end);
create index subscriptions_plan_id_idx on public.subscriptions (plan_id);

create trigger subscriptions_set_updated_at
  before update on public.subscriptions
  for each row execute function private.set_updated_at();
create trigger subscriptions_prevent_tenant_change
  before update on public.subscriptions
  for each row execute function private.prevent_tenant_change();

-- -----------------------------------------------------------------------------
-- billing_payments · pagos registrados (en v1, a mano desde el panel central)
-- -----------------------------------------------------------------------------
create table public.billing_payments (
  id              uuid primary key default gen_random_uuid(),
  tenant_id       uuid not null references public.tenants (id) on delete cascade,
  subscription_id uuid not null,
  amount          bigint not null check (amount > 0),                     -- centavos
  paid_at         timestamptz not null,
  method          text not null check (method in ('mp_link', 'transfer', 'cash', 'other')),
  reference       text check (char_length(reference) <= 200),
  notes           text check (char_length(notes) <= 1000),
  recorded_by     uuid references auth.users (id) on delete set null,
  created_at      timestamptz not null default now(),
  unique (tenant_id, id),
  -- FK compuesta: un pago no puede apuntar a la suscripción de otro comercio.
  foreign key (tenant_id, subscription_id)
    references public.subscriptions (tenant_id, id) on delete cascade
);

create index billing_payments_tenant_paid_at_idx on public.billing_payments (tenant_id, paid_at desc);
create index billing_payments_subscription_idx on public.billing_payments (tenant_id, subscription_id);
create index billing_payments_recorded_by_idx on public.billing_payments (recorded_by);

create trigger billing_payments_prevent_tenant_change
  before update on public.billing_payments
  for each row execute function private.prevent_tenant_change();

-- -----------------------------------------------------------------------------
-- tenant_modules · módulos activos por comercio
-- -----------------------------------------------------------------------------
create table public.tenant_modules (
  tenant_id  uuid not null references public.tenants (id) on delete cascade,
  module_key text not null references public.modules (key),
  enabled    boolean not null default true,
  config     jsonb not null default '{}'::jsonb check (jsonb_typeof(config) = 'object'),
  enabled_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (tenant_id, module_key)
);

create index tenant_modules_module_key_idx on public.tenant_modules (module_key);

create trigger tenant_modules_set_updated_at
  before update on public.tenant_modules
  for each row execute function private.set_updated_at();
create trigger tenant_modules_prevent_tenant_change
  before update on public.tenant_modules
  for each row execute function private.prevent_tenant_change();

-- -----------------------------------------------------------------------------
-- tenant_settings · configuración del comercio
-- REGLA: esta tabla solo guarda datos que pueden ser públicos.
-- -----------------------------------------------------------------------------
create table public.tenant_settings (
  tenant_id        uuid primary key references public.tenants (id) on delete cascade,
  display_name     text not null check (char_length(btrim(display_name)) between 2 and 80),
  tagline          text check (char_length(tagline) <= 120),
  description      text check (char_length(description) <= 500),
  logo_path        text check (logo_path like tenant_id::text || '/%'),
  cover_path       text check (cover_path like tenant_id::text || '/%'),
  theme            jsonb not null default '{}'::jsonb check (jsonb_typeof(theme) = 'object'),
  template_key     text not null references public.business_templates (key),
  whatsapp_phone   text check (whatsapp_phone ~ '^\+[1-9][0-9]{7,14}$'),
  instagram        text check (instagram ~ '^[A-Za-z0-9._]{1,30}$'),
  address          text check (char_length(address) <= 200),
  city             text check (char_length(city) <= 80),
  currency         text not null default 'ARS' check (currency ~ '^[A-Z]{3}$'),
  timezone         text not null default 'America/Argentina/Buenos_Aires' check (char_length(timezone) <= 64),
  accepts_pickup   boolean not null default true,
  accepts_delivery boolean not null default false,
  delivery_fee     bigint not null default 0 check (delivery_fee >= 0),       -- centavos
  min_order_amount bigint not null default 0 check (min_order_amount >= 0),   -- centavos
  open_mode        text not null default 'auto' check (open_mode in ('auto', 'open', 'closed')),
  closed_message   text check (char_length(closed_message) <= 200),
  updated_at       timestamptz not null default now()
);

create index tenant_settings_template_key_idx on public.tenant_settings (template_key);

create trigger tenant_settings_set_updated_at
  before update on public.tenant_settings
  for each row execute function private.set_updated_at();
create trigger tenant_settings_prevent_tenant_change
  before update on public.tenant_settings
  for each row execute function private.prevent_tenant_change();

-- -----------------------------------------------------------------------------
-- business_hours · horarios por día (si closes_at < opens_at, cruza la medianoche)
-- -----------------------------------------------------------------------------
create table public.business_hours (
  id        uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  weekday   smallint not null check (weekday between 0 and 6),   -- 0 = domingo
  opens_at  time not null,
  closes_at time not null,
  unique (tenant_id, id),
  check (opens_at <> closes_at)
);

create index business_hours_tenant_weekday_idx on public.business_hours (tenant_id, weekday);

create trigger business_hours_prevent_tenant_change
  before update on public.business_hours
  for each row execute function private.prevent_tenant_change();

-- =============================================================================
-- Límites de plan
-- =============================================================================

-- Plan de la suscripción vigente del comercio.
create function private.tenant_plan(p_tenant_id uuid)
returns public.plans
language sql
stable
security definer
set search_path = ''
as $$
  select p.*
  from public.subscriptions s
  join public.plans p on p.id = s.plan_id
  where s.tenant_id = p_tenant_id
    and s.status <> 'cancelled'
  limit 1;
$$;
revoke execute on function private.tenant_plan(uuid) from public, anon, authenticated;

-- Invitaciones: miembros + invitaciones pendientes no pueden superar max_members.
-- Es un trigger AFTER a propósito: corre después de las políticas RLS, así un
-- usuario sin permiso recibe "permiso denegado" y no datos del plan de otro comercio.
-- La fila nueva ya está contada en v_used.
create function private.enforce_member_limit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_plan public.plans;
  v_used integer;
begin
  v_plan := private.tenant_plan(new.tenant_id);
  if v_plan.id is null then
    raise exception 'El comercio no tiene una suscripción vigente.' using errcode = 'P0001';
  end if;

  select
    (select count(*) from public.tenant_members m where m.tenant_id = new.tenant_id)
    + (select count(*) from public.tenant_invitations i
       where i.tenant_id = new.tenant_id
         and i.accepted_at is null and i.revoked_at is null and i.expires_at > now())
  into v_used;

  if v_used > v_plan.max_members then
    raise exception 'El plan % permite hasta % usuarios.', v_plan.name, v_plan.max_members
      using errcode = 'P0001';
  end if;
  return null;
end;
$$;
revoke execute on function private.enforce_member_limit() from public, anon, authenticated;

create trigger tenant_invitations_enforce_member_limit
  after insert on public.tenant_invitations
  for each row execute function private.enforce_member_limit();

-- =============================================================================
-- RLS y permisos
-- =============================================================================

-- subscriptions y billing_payments: solo el dueño lee. Cambios: panel central y cron.
alter table public.subscriptions enable row level security;
revoke all on public.subscriptions from anon, authenticated;
grant select on public.subscriptions to authenticated;

create policy subscriptions_select_owner on public.subscriptions
  for select to authenticated
  using (tenant_id in (select private.my_tenant_ids(array['owner'])));

alter table public.billing_payments enable row level security;
revoke all on public.billing_payments from anon, authenticated;
grant select on public.billing_payments to authenticated;

create policy billing_payments_select_owner on public.billing_payments
  for select to authenticated
  using (tenant_id in (select private.my_tenant_ids(array['owner'])));

-- tenant_modules: los miembros leen. Cambios: panel central y alta.
alter table public.tenant_modules enable row level security;
revoke all on public.tenant_modules from anon, authenticated;
grant select on public.tenant_modules to authenticated;

create policy tenant_modules_select_member on public.tenant_modules
  for select to authenticated
  using (tenant_id in (select private.my_tenant_ids()));

-- tenant_settings: los miembros leen; el dueño edita (nunca tenant_id).
-- El catálogo público la leerá a través de storefront_by_host (etapa 6).
alter table public.tenant_settings enable row level security;
revoke all on public.tenant_settings from anon, authenticated;
grant select on public.tenant_settings to authenticated;
grant update (
  display_name, tagline, description, logo_path, cover_path, theme, template_key,
  whatsapp_phone, instagram, address, city, currency, timezone, accepts_pickup,
  accepts_delivery, delivery_fee, min_order_amount, open_mode, closed_message
) on public.tenant_settings to authenticated;

create policy tenant_settings_select_member on public.tenant_settings
  for select to authenticated
  using (tenant_id in (select private.my_tenant_ids()));

create policy tenant_settings_update_owner on public.tenant_settings
  for update to authenticated
  using (tenant_id in (select private.my_tenant_ids(array['owner'])))
  with check (tenant_id in (select private.my_tenant_ids(array['owner'])));

-- business_hours: los miembros leen; el dueño crea, edita y borra.
alter table public.business_hours enable row level security;
revoke all on public.business_hours from anon, authenticated;
grant select, delete on public.business_hours to authenticated;
grant insert (tenant_id, weekday, opens_at, closes_at) on public.business_hours to authenticated;
grant update (weekday, opens_at, closes_at) on public.business_hours to authenticated;

create policy business_hours_select_member on public.business_hours
  for select to authenticated
  using (tenant_id in (select private.my_tenant_ids()));

create policy business_hours_insert_owner on public.business_hours
  for insert to authenticated
  with check (tenant_id in (select private.my_tenant_ids(array['owner'])));

create policy business_hours_update_owner on public.business_hours
  for update to authenticated
  using (tenant_id in (select private.my_tenant_ids(array['owner'])))
  with check (tenant_id in (select private.my_tenant_ids(array['owner'])));

create policy business_hours_delete_owner on public.business_hours
  for delete to authenticated
  using (tenant_id in (select private.my_tenant_ids(array['owner'])));
