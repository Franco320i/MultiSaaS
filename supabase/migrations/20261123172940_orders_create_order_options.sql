-- =============================================================================
-- Pedidos con opciones (parte 3, docs/superpowers/specs/2026-11-23-opciones-producto-design.md)
--
-- Nueva versión de private.create_order (misma firma y permisos) y de private.order_summary.
-- Cada línea puede traer option_ids. La base:
--   - agrupa por producto + opciones elegidas (ordenadas): la misma combinación se suma;
--   - exige que cada opción sea de ese producto y de ese comercio, esté disponible, que
--     se elija alguna en los grupos obligatorios y no se pase el máximo de cada grupo;
--   - calcula el precio unitario = precio del producto + adicionales (nunca del navegador);
--   - guarda en order_items.options la copia de lo elegido: [{group, name, price_delta}].
-- Error nuevo: options_invalid (detail = id del producto). Sin option_ids, igual que antes.
-- =============================================================================

create or replace function private.order_summary(p_tenant_id uuid, p_order_id uuid)
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
               'line_total',   i.line_total,
               'options',      i.options) order by i.position), '[]'::jsonb)
      from public.order_items i
      where i.tenant_id = o.tenant_id and i.order_id = o.id
    )
  )
  from public.orders o
  where o.tenant_id = p_tenant_id and o.id = p_order_id;
$$;

create or replace function private.create_order(p_tenant_id uuid, p_order jsonb)
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
  v_bad         boolean;
  v_dup         boolean;
  v_products    integer;
  v_found       integer;
  v_missing     jsonb;
  v_bad_product uuid;
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

  -- Líneas: de 1 a 50, cantidades de 1 a 99, hasta 50 opciones por línea. La misma
  -- combinación (producto + opciones, en cualquier orden) se suma en una sola línea.
  if v_items is null or jsonb_typeof(v_items) <> 'array'
     or jsonb_array_length(v_items) not between 1 and 50 then
    raise exception 'invalid_items' using errcode = 'P0001';
  end if;

  begin
    select
      jsonb_agg(jsonb_build_object('product_id', g.product_id, 'option_ids', to_jsonb(g.option_ids),
                                   'quantity', g.quantity, 'position', g.position) order by g.position),
      bool_or(g.quantity > 99 or g.bad),
      bool_or(g.dup)
    into v_lines, v_bad, v_dup
    from (
      select r.product_id, r.option_ids, sum(r.quantity)::integer as quantity, min(r.ord) as position,
             bool_or(r.quantity is null or r.quantity not between 1 and 99 or r.product_id is null or r.bad_options) as bad,
             bool_or(r.dup) as dup
      from (
        select
          (e ->> 'product_id')::uuid as product_id,
          (e ->> 'quantity')::integer as quantity,
          x.ord,
          coalesce((select array_agg(v::uuid order by v::uuid) from jsonb_array_elements_text(o.ids) as t (v)), '{}') as option_ids,
          (o.ids is null or jsonb_array_length(o.ids) > 50) as bad_options,
          (select count(*) <> count(distinct v) from jsonb_array_elements_text(o.ids) as t (v)) as dup
        from jsonb_array_elements(v_items) with ordinality as x (e, ord)
        cross join lateral (
          select case
                   when jsonb_typeof(e) <> 'object' then null
                   when e -> 'option_ids' is null or e -> 'option_ids' = 'null'::jsonb then '[]'::jsonb
                   when jsonb_typeof(e -> 'option_ids') = 'array' then e -> 'option_ids'
                 end as ids
        ) o
      ) r
      group by r.product_id, r.option_ids
    ) g;
  exception when invalid_text_representation or numeric_value_out_of_range then
    raise exception 'invalid_items' using errcode = 'P0001';
  end;
  if v_bad then
    raise exception 'invalid_items' using errcode = 'P0001';
  end if;
  if jsonb_array_length(v_lines) > 50 then
    raise exception 'invalid_items' using errcode = 'P0001';
  end if;

  -- Productos: solo lo que se puede pedir hoy.
  select count(distinct l.product_id) into v_products
  from jsonb_to_recordset(v_lines) as l (product_id uuid);

  select count(distinct p.id) into v_found
  from jsonb_to_recordset(v_lines) as l (product_id uuid)
  join public.catalog_products p on p.tenant_id = p_tenant_id and p.id = l.product_id
  left join public.catalog_categories c on c.tenant_id = p.tenant_id and c.id = p.category_id
  where p.is_published and p.is_available and (p.category_id is null or c.is_visible);

  if v_found <> v_products then
    select jsonb_agg(distinct l.product_id) into v_missing
    from jsonb_to_recordset(v_lines) as l (product_id uuid)
    where not exists (
      select 1
      from public.catalog_products p
      left join public.catalog_categories c on c.tenant_id = p.tenant_id and c.id = p.category_id
      where p.tenant_id = p_tenant_id and p.id = l.product_id
        and p.is_published and p.is_available and (p.category_id is null or c.is_visible)
    );
    raise exception 'products_unavailable' using errcode = 'P0001', detail = v_missing::text;
  end if;

  -- Opciones: repetidas, ajenas, agotadas, faltante obligatoria o más del máximo.
  if v_dup then
    select (v_items -> 0 ->> 'product_id')::uuid into v_bad_product;
    raise exception 'options_invalid' using errcode = 'P0001', detail = coalesce(v_bad_product::text, '');
  end if;

  select l.product_id into v_bad_product
  from jsonb_to_recordset(v_lines) as l (product_id uuid, option_ids uuid[])
  where cardinality(l.option_ids) <> (
          select count(*)
          from public.catalog_options o
          join public.catalog_option_groups g on g.tenant_id = o.tenant_id and g.id = o.group_id
          where o.tenant_id = p_tenant_id and g.product_id = l.product_id
            and o.id = any (l.option_ids) and o.is_available
        )
     or exists (
          select 1
          from public.catalog_option_groups g
          cross join lateral (
            select count(*) as chosen
            from public.catalog_options o
            where o.tenant_id = g.tenant_id and o.group_id = g.id and o.id = any (l.option_ids)
          ) c
          where g.tenant_id = p_tenant_id and g.product_id = l.product_id
            and (c.chosen > g.max_choices
                 -- Un grupo obligatorio todavía sin opciones cargadas no se exige (el catálogo no lo muestra).
                 or (g.required and c.chosen = 0
                     and exists (select 1 from public.catalog_options o2 where o2.tenant_id = g.tenant_id and o2.group_id = g.id)))
        )
  limit 1;
  if found then
    raise exception 'options_invalid' using errcode = 'P0001', detail = v_bad_product::text;
  end if;

  -- Precios: solo de la base. Unitario = producto + adicionales elegidos.
  select sum(lp.unit_price * l.quantity) into v_subtotal
  from jsonb_to_recordset(v_lines) as l (product_id uuid, option_ids uuid[], quantity integer)
  cross join lateral (
    select p.price + coalesce((
             select sum(o.price_delta) from public.catalog_options o
             where o.tenant_id = p_tenant_id and o.id = any (l.option_ids)), 0) as unit_price
    from public.catalog_products p
    where p.tenant_id = p_tenant_id and p.id = l.product_id
  ) lp;

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

  insert into public.order_items (tenant_id, order_id, product_id, product_name, unit_price, quantity, line_total, options, position)
  select p_tenant_id, v_order_id, p.id, p.name, p.price + ch.delta, l.quantity, (p.price + ch.delta) * l.quantity, ch.options,
         row_number() over (order by l.position)
  from jsonb_to_recordset(v_lines) as l (product_id uuid, option_ids uuid[], quantity integer, position integer)
  join public.catalog_products p on p.tenant_id = p_tenant_id and p.id = l.product_id
  cross join lateral (
    select coalesce(sum(o.price_delta), 0) as delta,
           coalesce(jsonb_agg(jsonb_build_object('group', g.name, 'name', o.name, 'price_delta', o.price_delta)
                              order by g.position, g.created_at, o.position, o.created_at), '[]'::jsonb) as options
    from public.catalog_options o
    join public.catalog_option_groups g on g.tenant_id = o.tenant_id and g.id = o.group_id
    where o.tenant_id = p_tenant_id and o.id = any (l.option_ids)
  ) ch;

  -- Para los módulos futuros (IA, CRM, automatizaciones). Sin datos personales.
  insert into public.events (tenant_id, type, entity_type, entity_id, payload, actor_kind)
  values (p_tenant_id, 'order.created', 'order', v_order_id,
          jsonb_build_object('number', v_number, 'total', v_subtotal + v_fee, 'fulfillment', v_fulfillment),
          'customer');

  return private.order_summary(p_tenant_id, v_order_id) || jsonb_build_object('created', true);
end;
$$;
