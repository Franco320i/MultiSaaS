-- =============================================================================
-- Núcleo · Eventos, auditoría y control
-- Tablas: events, audit_log, tenant_counters, rate_limits.
-- Diseño, secciones 3, 5 y 9.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- events · hechos del negocio (order.created, tenant.published...).
-- Es el enchufe de automatizaciones, turnos, CRM e IA: los módulos futuros lo leen.
-- Solo inserción. payload lleva IDs, no datos personales.
-- -----------------------------------------------------------------------------
create table public.events (
  id          bigint generated always as identity primary key,
  tenant_id   uuid not null references public.tenants (id) on delete cascade,
  type        text not null check (type ~ '^[a-z_]+\.[a-z_]+$'),
  entity_type text check (entity_type ~ '^[a-z_]{2,40}$'),
  entity_id   uuid,
  payload     jsonb not null default '{}'::jsonb check (jsonb_typeof(payload) = 'object'),
  actor_kind  text not null check (actor_kind in ('owner', 'staff', 'platform_admin', 'customer', 'system')),
  actor_id    uuid,
  occurred_at timestamptz not null default now()
);

create index events_tenant_occurred_at_idx on public.events (tenant_id, occurred_at desc);
create index events_type_occurred_at_idx on public.events (type, occurred_at);

-- Se bloquea UPDATE. DELETE no se bloquea por trigger para que la purga de un
-- comercio (cascade) funcione; nadie fuera de service_role tiene permiso de borrar.
create trigger events_prevent_update
  before update on public.events
  for each row execute function private.prevent_modification();

alter table public.events enable row level security;
revoke all on public.events from anon, authenticated;
-- Sin políticas: en v1 nadie lo lee desde el navegador.

-- -----------------------------------------------------------------------------
-- audit_log · quién cambió qué, sobre todo las acciones del panel central.
-- Sin FK a tenants para que sobreviva a una purga. Solo inserción, sin excepciones.
-- -----------------------------------------------------------------------------
create table public.audit_log (
  id            bigint generated always as identity primary key,
  tenant_id     uuid,
  actor_user_id uuid,
  actor_kind    text not null check (actor_kind in ('platform_admin', 'owner', 'staff', 'system')),
  action        text not null check (action ~ '^[a-z_]+\.[a-z_]+$'),
  target_type   text check (char_length(target_type) <= 60),
  target_id     text check (char_length(target_id) <= 120),
  changes       jsonb not null default '{}'::jsonb check (jsonb_typeof(changes) = 'object'),
  reason        text check (char_length(reason) <= 500),
  ip            inet,
  user_agent    text check (char_length(user_agent) <= 500),
  created_at    timestamptz not null default now()
);

create index audit_log_tenant_created_at_idx on public.audit_log (tenant_id, created_at desc);
create index audit_log_actor_created_at_idx on public.audit_log (actor_user_id, created_at desc);

create trigger audit_log_prevent_modification
  before update or delete on public.audit_log
  for each row execute function private.prevent_modification();

-- TRUNCATE no dispara triggers de fila: se le quita a todos los roles de la API.
revoke truncate on public.audit_log from anon, authenticated, service_role;

alter table public.audit_log enable row level security;
revoke all on public.audit_log from anon, authenticated;
grant select on public.audit_log to authenticated;

-- El dueño ve lo que pasó en su comercio (incluido cuándo entró soporte).
create policy audit_log_select_owner on public.audit_log
  for select to authenticated
  using (tenant_id in (select private.my_tenant_ids(array['owner'])));

-- -----------------------------------------------------------------------------
-- tenant_counters · numeración por comercio (pedido #1, #2...). Solo funciones internas.
-- -----------------------------------------------------------------------------
create table public.tenant_counters (
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  name      text not null check (name ~ '^[a-z_]{2,40}$'),
  value     bigint not null default 0 check (value >= 0),
  primary key (tenant_id, name)
);

create trigger tenant_counters_prevent_tenant_change
  before update on public.tenant_counters
  for each row execute function private.prevent_tenant_change();

alter table public.tenant_counters enable row level security;
revoke all on public.tenant_counters from anon, authenticated;

-- -----------------------------------------------------------------------------
-- rate_limits · contadores por ventana de tiempo. UNLOGGED: perderlos en un
-- reinicio es aceptable y a cambio las escrituras son más baratas.
-- -----------------------------------------------------------------------------
create unlogged table public.rate_limits (
  key          text not null check (char_length(key) <= 200),
  window_start timestamptz not null,
  hits         integer not null default 0 check (hits >= 0),
  primary key (key, window_start)
);

alter table public.rate_limits enable row level security;
revoke all on public.rate_limits from anon, authenticated;
