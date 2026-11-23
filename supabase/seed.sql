-- =============================================================================
-- Datos de prueba SOLO para desarrollo local y staging. Nunca en producción.
-- Diseño, sección 13. UUID fijos para que las pruebas sean reproducibles.
--
-- Comercios:
--   Alfa  · gastronomía · activo · publicado · plan Pro  (dueño + staff)
--   Beta  · indumentaria · prueba · publicado · plan Base (dueño)
--   Gamma · general · suspendido · publicado · plan Base (dueño)
--
-- Usuarios (contraseña local para todos: Prueba-Local-2026):
--   dueno.alfa@example.com   11111111-1111-4111-8111-111111111111  owner Alfa
--   staff.alfa@example.com   11111111-1111-4111-8111-111111111112  staff Alfa
--   dueno.beta@example.com   22222222-2222-4222-8222-222222222221  owner Beta
--   dueno.gamma@example.com  33333333-3333-4333-8333-333333333331  owner Gamma
--   sin.comercio@example.com 44444444-4444-4444-8444-444444444444  sin comercio
--   admin@example.com        55555555-5555-4555-8555-555555555555  superadmin
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Usuarios de Auth (el trigger on_auth_user_created crea sus perfiles)
-- -----------------------------------------------------------------------------
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change, email_change_token_new
)
select
  '00000000-0000-0000-0000-000000000000', u.id, 'authenticated', 'authenticated', u.email,
  extensions.crypt('Prueba-Local-2026', extensions.gen_salt('bf')), now(),
  '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now(),
  '', '', '', ''
from (values
  ('11111111-1111-4111-8111-111111111111'::uuid, 'dueno.alfa@example.com'),
  ('11111111-1111-4111-8111-111111111112'::uuid, 'staff.alfa@example.com'),
  ('22222222-2222-4222-8222-222222222221'::uuid, 'dueno.beta@example.com'),
  ('33333333-3333-4333-8333-333333333331'::uuid, 'dueno.gamma@example.com'),
  ('44444444-4444-4444-8444-444444444444'::uuid, 'sin.comercio@example.com'),
  ('55555555-5555-4555-8555-555555555555'::uuid, 'admin@example.com')
) as u (id, email);

insert into auth.identities (id, provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
select gen_random_uuid(), u.id::text, u.id,
       jsonb_build_object('sub', u.id::text, 'email', u.email, 'email_verified', true),
       'email', now(), now(), now()
from auth.users u
where u.email like '%@example.com';

update public.profiles p set full_name = v.full_name
from (values
  ('11111111-1111-4111-8111-111111111111'::uuid, 'Dueño Alfa'),
  ('11111111-1111-4111-8111-111111111112'::uuid, 'Staff Alfa'),
  ('22222222-2222-4222-8222-222222222221'::uuid, 'Dueña Beta'),
  ('33333333-3333-4333-8333-333333333331'::uuid, 'Dueño Gamma'),
  ('44444444-4444-4444-8444-444444444444'::uuid, 'Sin Comercio'),
  ('55555555-5555-4555-8555-555555555555'::uuid, 'Superadmin')
) as v (id, full_name)
where p.id = v.id;

insert into public.platform_admins (user_id, role) values
  ('55555555-5555-4555-8555-555555555555', 'superadmin');

-- -----------------------------------------------------------------------------
-- Comercios
-- -----------------------------------------------------------------------------
insert into public.tenants (id, slug, name, business_type, status, trial_ends_at, published_at, status_reason) values
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'alfa',  'Burger Alfa', 'gastronomia',  'active',    null,                     now() - interval '30 days', null),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'beta',  'Ropa Beta',   'indumentaria', 'trial',     now() + interval '10 days', now() - interval '2 days',  null),
  ('cccccccc-cccc-4ccc-8ccc-cccccccccccc', 'gamma', 'Tienda Gamma','general',      'suspended', null,                     now() - interval '90 days', 'Falta de pago');

insert into public.tenant_members (tenant_id, user_id, role) values
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', '11111111-1111-4111-8111-111111111111', 'owner'),
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', '11111111-1111-4111-8111-111111111112', 'staff'),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', '22222222-2222-4222-8222-222222222221', 'owner'),
  ('cccccccc-cccc-4ccc-8ccc-cccccccccccc', '33333333-3333-4333-8333-333333333331', 'owner');

insert into public.domains (tenant_id, hostname, kind, is_primary, status, verified_at) values
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'alfa.localhost',  'subdomain', true, 'active', now()),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'beta.localhost',  'subdomain', true, 'active', now()),
  ('cccccccc-cccc-4ccc-8ccc-cccccccccccc', 'gamma.localhost', 'subdomain', true, 'active', now());

insert into public.subscriptions (id, tenant_id, plan_id, status, current_period_start, current_period_end) values
  ('a5a5a5a5-0000-4000-8000-00000000000a', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'pro',  'active',   now() - interval '10 days', now() + interval '20 days'),
  ('b5b5b5b5-0000-4000-8000-00000000000b', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'base', 'trialing', now() - interval '4 days',  now() + interval '10 days'),
  ('c5c5c5c5-0000-4000-8000-00000000000c', 'cccccccc-cccc-4ccc-8ccc-cccccccccccc', 'base', 'past_due', now() - interval '40 days', now() - interval '10 days');

insert into public.billing_payments (tenant_id, subscription_id, amount, paid_at, method, reference, recorded_by) values
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'a5a5a5a5-0000-4000-8000-00000000000a', 3990000, now() - interval '10 days', 'mp_link', 'MP-PRUEBA-1', '55555555-5555-4555-8555-555555555555');

insert into public.tenant_modules (tenant_id, module_key)
select t.id, m.key
from public.tenants t cross join public.modules m;

insert into public.tenant_settings (tenant_id, display_name, tagline, template_key, whatsapp_phone, instagram, city, accepts_pickup, accepts_delivery, delivery_fee, min_order_amount) values
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'Burger Alfa',  'Hamburguesas a la parrilla', 'gastronomia',  '+5492954000001', 'burger.alfa', 'Santa Rosa', true, true, 150000, 500000),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'Ropa Beta',    'Ropa urbana',                'indumentaria', '+5492954000002', 'ropa.beta',   'Santa Rosa', true, false, 0, 0),
  ('cccccccc-cccc-4ccc-8ccc-cccccccccccc', 'Tienda Gamma', null,                         'general',      '+5492954000003', null,          'Toay',       true, false, 0, 0);

-- Alfa abre de martes a domingo de 19 a 0:30 (cruza la medianoche).
insert into public.business_hours (tenant_id, weekday, opens_at, closes_at)
select 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', d, '19:00', '00:30'
from generate_series(0, 6) as d
where d <> 1;

insert into public.business_hours (tenant_id, weekday, opens_at, closes_at)
select 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', d, '10:00', '19:00'
from generate_series(1, 6) as d;

insert into public.events (tenant_id, type, entity_type, entity_id, actor_kind) values
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'tenant.created', 'tenant', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'system'),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'tenant.created', 'tenant', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'system');

insert into public.audit_log (tenant_id, actor_user_id, actor_kind, action, target_type, target_id, reason) values
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', '55555555-5555-4555-8555-555555555555', 'platform_admin', 'subscription.paid',  'subscription', 'a5a5a5a5-0000-4000-8000-00000000000a', 'Pago por link de MP'),
  ('cccccccc-cccc-4ccc-8ccc-cccccccccccc', '55555555-5555-4555-8555-555555555555', 'platform_admin', 'tenant.suspended',   'tenant',       'cccccccc-cccc-4ccc-8ccc-cccccccccccc', 'Falta de pago');

-- -----------------------------------------------------------------------------
-- Catálogo (etapa 4)
-- Alfa: 3 categorías (una oculta), productos publicados, un borrador y uno sin stock.
-- Beta: 2 categorías y productos. Gamma (suspendido): 1 producto publicado.
-- -----------------------------------------------------------------------------
insert into public.catalog_categories (id, tenant_id, name, slug, position, is_visible) values
  ('a1000000-0000-4000-8000-000000000001', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'Hamburguesas', 'hamburguesas', 1, true),
  ('a1000000-0000-4000-8000-000000000002', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'Bebidas',      'bebidas',      2, true),
  ('a1000000-0000-4000-8000-000000000003', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'Promos',       'promos',       3, false),
  ('b1000000-0000-4000-8000-000000000001', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'Remeras',      'remeras',      1, true),
  ('b1000000-0000-4000-8000-000000000002', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'Promos',       'promos',       2, true),
  ('c1000000-0000-4000-8000-000000000001', 'cccccccc-cccc-4ccc-8ccc-cccccccccccc', 'General',      'general',      1, true);

insert into public.catalog_products
  (id, tenant_id, category_id, name, slug, description, price, compare_at_price, is_published, is_available, is_featured, position)
values
  ('a2000000-0000-4000-8000-000000000001', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'a1000000-0000-4000-8000-000000000001',
   'Hamburguesa doble', 'hamburguesa-doble', 'Doble carne, cheddar y panceta.', 900000, null, true, true, true, 1),
  ('a2000000-0000-4000-8000-000000000002', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'a1000000-0000-4000-8000-000000000001',
   'Hamburguesa simple', 'hamburguesa-simple', null, 650000, 700000, true, true, false, 2),
  ('a2000000-0000-4000-8000-000000000003', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'a1000000-0000-4000-8000-000000000002',
   'Gaseosa 500 ml', 'gaseosa-500', null, 200000, null, true, false, false, 1),
  ('a2000000-0000-4000-8000-000000000004', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'a1000000-0000-4000-8000-000000000001',
   'Hamburguesa vegana (borrador)', 'hamburguesa-vegana', null, 800000, null, false, true, false, 3),
  ('a2000000-0000-4000-8000-000000000005', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'a1000000-0000-4000-8000-000000000001',
   'Hamburguesa a elección', 'hamburguesa-a-eleccion', 'Elegí el tamaño y sumale extras.', 800000, null, true, true, false, 4),
  ('b2000000-0000-4000-8000-000000000001', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'b1000000-0000-4000-8000-000000000001',
   'Remera negra', 'remera-negra', 'Algodón peinado.', 1500000, null, true, true, false, 1),
  ('b2000000-0000-4000-8000-000000000002', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', null,
   'Gorra', 'gorra', null, 900000, null, true, true, false, 2),
  ('c2000000-0000-4000-8000-000000000001', 'cccccccc-cccc-4ccc-8ccc-cccccccccccc', 'c1000000-0000-4000-8000-000000000001',
   'Producto Gamma', 'producto-gamma', null, 100000, null, true, true, false, 1);

-- -----------------------------------------------------------------------------
-- Fotos (etapa 5). Solo filas: los archivos se suben desde el panel.
-- La ruta = {tenant_id}/products/{product_id}/{image_id}
-- -----------------------------------------------------------------------------
insert into public.catalog_product_images (id, tenant_id, product_id, storage_path, width, height, position) values
  ('a3000000-0000-4000-8000-000000000001', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'a2000000-0000-4000-8000-000000000001',
   'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/products/a2000000-0000-4000-8000-000000000001/a3000000-0000-4000-8000-000000000001', 1280, 960, 1),
  ('a3000000-0000-4000-8000-000000000002', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'a2000000-0000-4000-8000-000000000004',
   'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/products/a2000000-0000-4000-8000-000000000004/a3000000-0000-4000-8000-000000000002', 1280, 960, 1),
  ('b3000000-0000-4000-8000-000000000001', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'b2000000-0000-4000-8000-000000000001',
   'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb/products/b2000000-0000-4000-8000-000000000001/b3000000-0000-4000-8000-000000000001', 1280, 1280, 1),
  ('c3000000-0000-4000-8000-000000000001', 'cccccccc-cccc-4ccc-8ccc-cccccccccccc', 'c2000000-0000-4000-8000-000000000001',
   'cccccccc-cccc-4ccc-8ccc-cccccccccccc/products/c2000000-0000-4000-8000-000000000001/c3000000-0000-4000-8000-000000000001', 800, 800, 1);

-- -----------------------------------------------------------------------------
-- Opciones del producto (parte 3). "Hamburguesa a elección" de Alfa:
--   Tamaño (obligatorio, una): Simple +$0, Doble +$1.500
--   Extras (opcional, hasta 2): Panceta +$800, Huevo +$500 (agotado)
-- -----------------------------------------------------------------------------
insert into public.catalog_option_groups (id, tenant_id, product_id, name, required, max_choices, position) values
  ('a4000000-0000-4000-8000-000000000001', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'a2000000-0000-4000-8000-000000000005', 'Tamaño', true, 1, 1),
  ('a4000000-0000-4000-8000-000000000002', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'a2000000-0000-4000-8000-000000000005', 'Extras', false, 2, 2);

insert into public.catalog_options (id, tenant_id, group_id, name, price_delta, is_available, position) values
  ('a5000000-0000-4000-8000-000000000001', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'a4000000-0000-4000-8000-000000000001', 'Simple', 0, true, 1),
  ('a5000000-0000-4000-8000-000000000002', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'a4000000-0000-4000-8000-000000000001', 'Doble', 150000, true, 2),
  ('a5000000-0000-4000-8000-000000000003', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'a4000000-0000-4000-8000-000000000002', 'Panceta', 80000, true, 1),
  ('a5000000-0000-4000-8000-000000000004', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'a4000000-0000-4000-8000-000000000002', 'Huevo', 50000, false, 2);

-- -----------------------------------------------------------------------------
-- Pedidos (etapa 7). Se crean con private.create_order, igual que desde el catálogo.
--   Alfa #1: envío, 2 dobles + 1 simple (nuevo) · Alfa #2: retiro, 1 doble (confirmado)
--   Beta #1: retiro, 1 remera (nuevo)
-- -----------------------------------------------------------------------------
select private.create_order('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', jsonb_build_object(
  'idempotency_key', 'a7000000-0000-4000-8000-000000000001',
  'customer_name', 'Lucía Pérez', 'customer_phone', '+54 9 2954 111111',
  'fulfillment', 'delivery', 'delivery_address', 'Av. San Martín 123', 'notes', 'Sin cebolla',
  'items', jsonb_build_array(
    jsonb_build_object('product_id', 'a2000000-0000-4000-8000-000000000001', 'quantity', 2),
    jsonb_build_object('product_id', 'a2000000-0000-4000-8000-000000000002', 'quantity', 1))));

select private.create_order('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', jsonb_build_object(
  'idempotency_key', 'a7000000-0000-4000-8000-000000000002',
  'customer_name', 'Martín Gómez', 'customer_phone', '2954 222222', 'fulfillment', 'pickup',
  'items', jsonb_build_array(
    jsonb_build_object('product_id', 'a2000000-0000-4000-8000-000000000001', 'quantity', 1))));
update public.orders set status = 'confirmed'
where tenant_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' and number = 2;

select private.create_order('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', jsonb_build_object(
  'idempotency_key', 'b7000000-0000-4000-8000-000000000001',
  'customer_name', 'Sofía Díaz', 'customer_phone', '+54 9 2954 333333', 'fulfillment', 'pickup',
  'items', jsonb_build_array(
    jsonb_build_object('product_id', 'b2000000-0000-4000-8000-000000000001', 'quantity', 1))));
