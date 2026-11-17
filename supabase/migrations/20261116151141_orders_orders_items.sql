-- =============================================================================
-- Módulo pedidos · orders, order_items y private.create_order
-- Diseño, secciones 3 y 4 (módulo pedidos), 5 (políticas) y 11 (flujo de un pedido).
--
-- Nadie crea pedidos desde el navegador: no hay permiso de INSERT para anon ni
-- authenticated. Los crea private.create_order, que recalcula precios y totales
-- en la base con lo que está publicado y disponible. El servidor la llama con la
-- clave secreta a través de public.create_order (ver el final del archivo).
-- Dueño y staff leen los pedidos de su comercio y solo pueden cambiar el estado.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- orders
-- -----------------------------------------------------------------------------
create table public.orders (
  id                uuid primary key default gen_random_uuid(),
  tenant_id         uuid not null references public.tenants (id) on delete cascade,
  number            bigint not null check (number > 0),
  status            text not null default 'new'
                    check (status in ('new', 'confirmed', 'preparing', 'ready', 'completed', 'cancelled')),
  fulfillment       text not null check (fulfillment in ('pickup', 'delivery')),
  customer_name     text not null check (char_length(btrim(customer_name)) between 2 and 80),
  customer_phone    text not null check (customer_phone ~ '^\+?[0-9 ()-]{6,30}$'),
  delivery_address  text check (char_length(btrim(delivery_address)) between 3 and 200),
  notes             text check (char_length(notes) <= 500),
  subtotal          bigint not null check (subtotal >= 0),         -- centavos
  delivery_fee      bigint not null default 0 check (delivery_fee >= 0),
  total             bigint not null,
  channel           text not null default 'whatsapp' check (channel in ('whatsapp')),
  idempotency_key   uuid not null,
  client_ip_hash    text check (char_length(client_ip_hash) <= 128),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  status_changed_at timestamptz not null default now(),
  unique (tenant_id, id),
  unique (tenant_id, number),
  unique (tenant_id, idempotency_key),
  check (total = subtotal + delivery_fee),
  check (fulfillment = 'pickup' or delivery_address is not null)
);

create index orders_tenant_created_at_idx on public.orders (tenant_id, created_at desc);
create index orders_tenant_status_created_at_idx on public.orders (tenant_id, status, created_at desc);

-- -----------------------------------------------------------------------------
-- order_items · copia de nombre y precio al momento de la compra
-- -----------------------------------------------------------------------------
create table public.order_items (
  id           uuid primary key default gen_random_uuid(),
  tenant_id    uuid not null references public.tenants (id) on delete cascade,
  order_id     uuid not null,
  product_id   uuid,
  product_name text not null check (char_length(product_name) between 1 and 120),
  unit_price   bigint not null check (unit_price >= 0),
  quantity     integer not null check (quantity between 1 and 99),
  options      jsonb not null default '[]'::jsonb check (jsonb_typeof(options) = 'array'),
  line_total   bigint not null,
  position     integer not null check (position > 0),
  unique (tenant_id, id),
  check (line_total = unit_price * quantity),
  foreign key (tenant_id, order_id) references public.orders (tenant_id, id) on delete cascade,
  -- Si se borra el producto, el pedido conserva la copia: solo se anula product_id.
  foreign key (tenant_id, product_id) references public.catalog_products (tenant_id, id)
    on delete set null (product_id)
);

create index order_items_tenant_order_idx on public.order_items (tenant_id, order_id, position);
create index order_items_tenant_product_idx on public.order_items (tenant_id, product_id);

-- -----------------------------------------------------------------------------
-- Triggers
-- -----------------------------------------------------------------------------
create trigger orders_prevent_tenant_change
  before update on public.orders
  for each row execute function private.prevent_tenant_change();
create trigger orders_set_updated_at
  before update on public.orders
  for each row execute function private.set_updated_at();
create trigger order_items_prevent_tenant_change
  before update on public.order_items
  for each row execute function private.prevent_tenant_change();

-- Estados: new → confirmed → preparing → ready → completed (se puede saltear pasos
-- hacia adelante) y cancelled desde cualquiera anterior a completed. No se vuelve atrás.
create function private.check_order_status_change()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_flow constant text[] := array['new', 'confirmed', 'preparing', 'ready', 'completed'];
begin
  if new.status is distinct from old.status then
    if old.status in ('completed', 'cancelled') then
      raise exception 'order_closed' using errcode = 'P0001';
    end if;
    if new.status <> 'cancelled'
       and array_position(v_flow, new.status) <= array_position(v_flow, old.status) then
      raise exception 'invalid_status_transition' using errcode = 'P0001';
    end if;
    new.status_changed_at := now();
  end if;
  return new;
end;
$$;

create trigger orders_check_status_change
  before update of status on public.orders
  for each row execute function private.check_order_status_change();

-- Emite order.status_changed. SECURITY DEFINER porque authenticated no puede
-- escribir en events; solo inserta datos de la fila que ya pasó RLS.
create function private.emit_order_status_changed()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.events (tenant_id, type, entity_type, entity_id, payload, actor_kind, actor_id)
  values (
    new.tenant_id, 'order.status_changed', 'order', new.id,
    jsonb_build_object('number', new.number, 'from', old.status, 'to', new.status),
    coalesce(
      (select m.role from public.tenant_members m where m.tenant_id = new.tenant_id and m.user_id = auth.uid()),
      'system'),
    auth.uid()
  );
  return null;
end;
$$;

create trigger orders_emit_status_changed
  after update of status on public.orders
  for each row
  when (old.status is distinct from new.status)
  execute function private.emit_order_status_changed();

revoke execute on function private.check_order_status_change() from public, anon, authenticated;
revoke execute on function private.emit_order_status_changed() from public, anon, authenticated;

-- -----------------------------------------------------------------------------
-- RLS y permisos
-- -----------------------------------------------------------------------------
alter table public.orders enable row level security;
revoke all on public.orders from anon, authenticated;
grant select on public.orders to authenticated;
grant update (status) on public.orders to authenticated;

create policy orders_select_member on public.orders
  for select to authenticated
  using (tenant_id in (select private.my_tenant_ids()));

create policy orders_update_member on public.orders
  for update to authenticated
  using (tenant_id in (select private.my_tenant_ids()))
  with check (tenant_id in (select private.my_tenant_ids()));

alter table public.order_items enable row level security;
revoke all on public.order_items from anon, authenticated;
grant select on public.order_items to authenticated;

create policy order_items_select_member on public.order_items
  for select to authenticated
  using (tenant_id in (select private.my_tenant_ids()));

-- =============================================================================
-- Creación de pedidos
-- =============================================================================

-- Resumen de un pedido para armar la respuesta y el mensaje de WhatsApp.
create function private.order_summary(p_tenant_id uuid, p_order_id uuid)
returns jsonb
language sql
stable
set search_path = ''
as $$
  select jsonb_build_object(
    'order_id',         o.id,
    'number',           o.number,
    'fulfillment',      o.fulfillment,
    'customer_name',    o.customer_name,
    'delivery_address', o.delivery_address,
    'notes',            o.notes,
    'subtotal',         o.subtotal,
    'delivery_fee',     o.delivery_fee,
    'total',            o.total,
    'items', (
      select coalesce(jsonb_agg(jsonb_build_object(
               'product_name', i.product_name,
               'quantity',     i.quantity,
               'unit_price',   i.unit_price,
               'line_total',   i.line_total) order by i.position), '[]'::jsonb)
      from public.order_items i
      where i.tenant_id = o.tenant_id and i.order_id = o.id
    )
  )
  from public.orders o
  where o.tenant_id = p_tenant_id and o.id = p_order_id;
$$;

/*
 * private.create_order(tenant_id, pedido)
 *
 * p_tenant_id lo resuelve el servidor a partir del host (nunca viene del navegador).
 * p_order: { items: [{product_id, quantity}], customer_name, customer_phone,
 *            fulfillment, delivery_address, notes, idempotency_key, client_ip_hash }
 *
 * En una transacción: valida, toma solo productos publicados y disponibles del
 * comercio (de categorías visibles o sin categoría), calcula subtotal, envío y
 * total, verifica el pedido mínimo, numera, inserta y emite order.created.
 * Si la clave de idempotencia ya existe, devuelve ese pedido sin crear otro.
 *
 * Errores (errcode P0001, el mensaje es un código que el servidor traduce):
 *   invalid_order, invalid_items, invalid_customer, tenant_unavailable,
 *   orders_disabled, fulfillment_not_available, products_unavailable (detail:
 *   ids que faltan, en JSON), below_minimum.
 */
create function private.create_order(p_tenant_id uuid, p_order jsonb)
returns jsonb
language plpgsql
set search_path = ''
as $$
declare
  v_key         uuid;
  v_existing_id uuid;
  v_settings    public.tenant_settings;
  v_fulfillment text := p_order ->> 'fulfillment';
  v_name        text := btrim(p_order ->> 'customer_name');
  v_phone       text := btrim(p_order ->> 'customer_phone');
  v_address     text := nullif(btrim(p_order ->> 'delivery_address'), '');
  v_notes       text := nullif(btrim(p_order ->> 'notes'), '');
  v_ip_hash     text := nullif(p_order ->> 'client_ip_hash', '');
  v_items       jsonb := p_order -> 'items';
  v_lines       jsonb;
  v_requested   integer;
  v_bad_qty     boolean;
  v_found       integer;
  v_missing     jsonb;
  v_subtotal    bigint;
  v_fee         bigint;
  v_number      bigint;
  v_order_id    uuid := gen_random_uuid();
begin
  if p_tenant_id is null or p_order is null or jsonb_typeof(p_order) <> 'object' then
    raise exception 'invalid_order' using errcode = 'P0001';
  end if;

  begin
    v_key := (p_order ->> 'idempotency_key')::uuid;
  exception when invalid_text_representation then
    raise exception 'invalid_order' using errcode = 'P0001';
  end;
  if v_key is null then
    raise exception 'invalid_order' using errcode = 'P0001';
  end if;

  -- Doble clic o reintento: el mismo pedido, sin crear otro.
  select o.id into v_existing_id
  from public.orders o
  where o.tenant_id = p_tenant_id and o.idempotency_key = v_key;
  if found then
    return private.order_summary(p_tenant_id, v_existing_id) || jsonb_build_object('created', false);
  end if;

  -- Comercio: público y con el módulo de pedidos activo.
  if not private.tenant_is_public(p_tenant_id) then
    raise exception 'tenant_unavailable' using errcode = 'P0001';
  end if;
  if not exists (
    select 1 from public.tenant_modules m
    where m.tenant_id = p_tenant_id and m.module_key = 'orders' and m.enabled
  ) then
    raise exception 'orders_disabled' using errcode = 'P0001';
  end if;

  select * into v_settings from public.tenant_settings s where s.tenant_id = p_tenant_id;
  if not found then
    raise exception 'tenant_unavailable' using errcode = 'P0001';
  end if;

  -- Cliente y entrega.
  if v_name is null or char_length(v_name) not between 2 and 80
     or v_phone is null or v_phone !~ '^\+?[0-9 ()-]{6,30}$'
     or char_length(coalesce(v_notes, '')) > 500
     or char_length(coalesce(v_ip_hash, '')) > 128 then
    raise exception 'invalid_customer' using errcode = 'P0001';
  end if;
  if v_fulfillment = 'pickup' then
    if not v_settings.accepts_pickup then
      raise exception 'fulfillment_not_available' using errcode = 'P0001';
    end if;
    v_address := null;
  elsif v_fulfillment = 'delivery' then
    if not v_settings.accepts_delivery then
      raise exception 'fulfillment_not_available' using errcode = 'P0001';
    end if;
    if v_address is null or char_length(v_address) not between 3 and 200 then
      raise exception 'invalid_customer' using errcode = 'P0001';
    end if;
  else
    raise exception 'invalid_order' using errcode = 'P0001';
  end if;

  -- Líneas: de 1 a 50, cantidades de 1 a 99; un producto repetido se suma.
  if v_items is null or jsonb_typeof(v_items) <> 'array'
     or jsonb_array_length(v_items) not between 1 and 50 then
    raise exception 'invalid_items' using errcode = 'P0001';
  end if;

  begin
    select
      jsonb_agg(jsonb_build_object('product_id', g.product_id, 'quantity', g.quantity, 'position', g.position)
                order by g.position),
      count(*),
      bool_or(g.quantity > 99 or g.bad)
    into v_lines, v_requested, v_bad_qty
    from (
      select r.product_id, sum(r.quantity)::integer as quantity, min(r.ord) as position,
             bool_or(r.quantity is null or r.quantity not between 1 and 99 or r.product_id is null) as bad
      from (
        select (e ->> 'product_id')::uuid as product_id, (e ->> 'quantity')::integer as quantity, x.ord
        from jsonb_array_elements(v_items) with ordinality as x (e, ord)
      ) r
      group by r.product_id
    ) g;
  exception when invalid_text_representation or numeric_value_out_of_range then
    raise exception 'invalid_items' using errcode = 'P0001';
  end;
  if v_bad_qty then
    raise exception 'invalid_items' using errcode = 'P0001';
  end if;

  -- Precios: solo de la base, solo lo que se puede pedir hoy.
  select count(*), sum(p.price * l.quantity)
  into v_found, v_subtotal
  from jsonb_to_recordset(v_lines) as l (product_id uuid, quantity integer, position integer)
  join public.catalog_products p on p.tenant_id = p_tenant_id and p.id = l.product_id
  left join public.catalog_categories c on c.tenant_id = p.tenant_id and c.id = p.category_id
  where p.is_published and p.is_available and (p.category_id is null or c.is_visible);

  if v_found <> v_requested then
    select jsonb_agg(l.product_id) into v_missing
    from jsonb_to_recordset(v_lines) as l (product_id uuid, quantity integer, position integer)
    where not exists (
      select 1
      from public.catalog_products p
      left join public.catalog_categories c on c.tenant_id = p.tenant_id and c.id = p.category_id
      where p.tenant_id = p_tenant_id and p.id = l.product_id
        and p.is_published and p.is_available and (p.category_id is null or c.is_visible)
    );
    raise exception 'products_unavailable' using errcode = 'P0001', detail = v_missing::text;
  end if;

  if v_subtotal < v_settings.min_order_amount then
    raise exception 'below_minimum' using errcode = 'P0001';
  end if;

  v_fee := case when v_fulfillment = 'delivery' then v_settings.delivery_fee else 0 end;

  begin
    -- Número siguiente del comercio. La fila del contador queda bloqueada hasta el
    -- final de la transacción: dos pedidos simultáneos no reciben el mismo número.
    insert into public.tenant_counters (tenant_id, name, value)
    values (p_tenant_id, 'orders', 1)
    on conflict (tenant_id, name) do update set value = public.tenant_counters.value + 1
    returning value into v_number;

    insert into public.orders (
      id, tenant_id, number, fulfillment, customer_name, customer_phone, delivery_address,
      notes, subtotal, delivery_fee, total, idempotency_key, client_ip_hash
    ) values (
      v_order_id, p_tenant_id, v_number, v_fulfillment, v_name, v_phone, v_address,
      v_notes, v_subtotal, v_fee, v_subtotal + v_fee, v_key, v_ip_hash
    );
  exception when unique_violation then
    -- Otra petición con la misma clave ganó la carrera: se devuelve ese pedido.
    select o.id into v_existing_id
    from public.orders o
    where o.tenant_id = p_tenant_id and o.idempotency_key = v_key;
    if v_existing_id is null then
      raise;
    end if;
    return private.order_summary(p_tenant_id, v_existing_id) || jsonb_build_object('created', false);
  end;

  insert into public.order_items (tenant_id, order_id, product_id, product_name, unit_price, quantity, line_total, position)
  select p_tenant_id, v_order_id, p.id, p.name, p.price, l.quantity, p.price * l.quantity,
         row_number() over (order by l.position)
  from jsonb_to_recordset(v_lines) as l (product_id uuid, quantity integer, position integer)
  join public.catalog_products p on p.tenant_id = p_tenant_id and p.id = l.product_id;

  -- Para los módulos futuros (IA, CRM, automatizaciones). Sin datos personales.
  insert into public.events (tenant_id, type, entity_type, entity_id, payload, actor_kind)
  values (p_tenant_id, 'order.created', 'order', v_order_id,
          jsonb_build_object('number', v_number, 'total', v_subtotal + v_fee, 'fulfillment', v_fulfillment),
          'customer');

  return private.order_summary(p_tenant_id, v_order_id) || jsonb_build_object('created', true);
end;
$$;

-- create_order corre como service_role (SECURITY INVOKER) y consulta si el comercio es público.
grant execute on function private.tenant_is_public(uuid) to service_role;

revoke execute on function private.order_summary(uuid, uuid) from public, anon, authenticated;
revoke execute on function private.create_order(uuid, jsonb) from public, anon, authenticated;
grant execute on function private.order_summary(uuid, uuid) to service_role;
grant execute on function private.create_order(uuid, jsonb) to service_role;

-- -----------------------------------------------------------------------------
-- Puerta para el servidor. La API de Supabase solo expone el esquema public, así
-- que el servidor no puede llamar a private.create_order directamente. Este
-- envoltorio es SECURITY INVOKER (corre con los permisos de quien llama) y solo
-- service_role puede ejecutarlo: con la clave publicable responde "permiso denegado".
-- -----------------------------------------------------------------------------
create function public.create_order(p_tenant_id uuid, p_order jsonb)
returns jsonb
language sql
volatile
set search_path = ''
as $$
  select private.create_order(p_tenant_id, p_order);
$$;

comment on function public.create_order(uuid, jsonb) is
  'Solo service_role (servidor, POST /api/orders). Delegada en private.create_order.';

revoke execute on function public.create_order(uuid, jsonb) from public, anon, authenticated;
grant execute on function public.create_order(uuid, jsonb) to service_role;
