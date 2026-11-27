import "server-only";
import { generatePassword } from "@/lib/password";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

/**
 * Lecturas y escrituras del panel central con la clave SECRETA (diseño, sección 9;
 * lista cerrada: este archivo figura en SERVICE_KEY_ALLOWED de eslint.config.mjs).
 *
 * - Quien llama ya pasó por requirePlatformAdmin (superadmin para escribir).
 * - Las lecturas llevan siempre el tenant_id explícito.
 * - Las escrituras van por private.admin_* (cambio + audit_log en la misma transacción)
 *   y reciben el actor verificado, que la base vuelve a comprobar.
 */

export type AdminTenantRow = {
  id: string;
  slug: string;
  name: string;
  status: string;
  businessType: string;
  createdAt: string;
  published: boolean;
  planId: string | null;
  subscriptionStatus: string | null;
  periodEnd: string | null;
  whatsappPhone: string | null;
  publishedProducts: number;
  orders30d: number;
  lastOrderAt: string | null;
};

export const TENANT_FILTERS = ["all", "trial_ending", "past_due", "suspended", "no_orders_14d", "no_products"] as const;
export type TenantFilter = (typeof TENANT_FILTERS)[number];

export async function listTenants(input: { search: string; filter: TenantFilter; page: number; pageSize: number }) {
  const supabase = createSupabaseServiceClient();
  const { data, error } = await supabase.rpc("admin_tenants", {
    p_search: input.search,
    p_filter: input.filter,
    p_limit: input.pageSize,
    p_offset: (input.page - 1) * input.pageSize,
  });
  if (error) throw new Error(`No se pudieron leer los comercios: ${error.message}`);
  const rows: AdminTenantRow[] = (data ?? []).map((r) => ({
    id: r.id,
    slug: r.slug,
    name: r.name,
    status: r.status,
    businessType: r.business_type,
    createdAt: r.created_at,
    published: r.published,
    planId: r.plan_id,
    subscriptionStatus: r.subscription_status,
    periodEnd: r.period_end,
    whatsappPhone: r.whatsapp_phone,
    publishedProducts: Number(r.published_products),
    orders30d: Number(r.orders_30d),
    lastOrderAt: r.last_order_at,
  }));
  return { rows, total: data?.[0] ? Number(data[0].total) : 0 };
}

export type Overview = {
  byStatus: Record<string, number>;
  trialsEnding7d: number;
  pastDueAmount: number;
  renewals7d: number;
  orders7d: number;
  ordersPrev7d: number;
  signupsByWeek: { week: string; count: number }[];
};

export async function getOverview(): Promise<Overview> {
  const supabase = createSupabaseServiceClient();
  const { data, error } = await supabase.rpc("admin_overview");
  if (error) throw new Error(`No se pudo leer el resumen: ${error.message}`);
  const o = data as Record<string, unknown>;
  return {
    byStatus: (o.by_status as Record<string, number>) ?? {},
    trialsEnding7d: Number(o.trials_ending_7d ?? 0),
    pastDueAmount: Number(o.past_due_amount ?? 0),
    renewals7d: Number(o.renewals_7d ?? 0),
    orders7d: Number(o.orders_7d ?? 0),
    ordersPrev7d: Number(o.orders_prev_7d ?? 0),
    signupsByWeek: ((o.signups_by_week as { week: string; count: number }[]) ?? []).map((w) => ({ week: w.week, count: Number(w.count) })),
  };
}

/** Ficha de un comercio: datos, miembros, dominios, suscripción, pagos, auditoría y eventos. */
export async function getTenantDetail(tenantId: string) {
  const supabase = createSupabaseServiceClient();
  const [tenant, settings, members, domains, subscription, payments, audit, events] = await Promise.all([
    supabase.from("tenants").select("id, slug, name, status, status_reason, business_type, trial_ends_at, published_at, created_at").eq("id", tenantId).maybeSingle(),
    supabase.from("tenant_settings").select("display_name, whatsapp_phone, instagram, city, logo_path").eq("tenant_id", tenantId).maybeSingle(),
    supabase.from("tenant_members").select("user_id, role, created_at").eq("tenant_id", tenantId),
    supabase.from("domains").select("hostname, kind, status, is_primary").eq("tenant_id", tenantId),
    supabase
      .from("subscriptions")
      .select("id, plan_id, status, current_period_start, current_period_end, plans(name, price_ars)")
      .eq("tenant_id", tenantId)
      .neq("status", "cancelled")
      .maybeSingle(),
    supabase
      .from("billing_payments")
      .select("id, amount, paid_at, method, reference, notes, recorded_by")
      .eq("tenant_id", tenantId)
      .order("paid_at", { ascending: false })
      .limit(20),
    supabase
      .from("audit_log")
      .select("id, action, actor_kind, actor_user_id, reason, changes, created_at")
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: false })
      .limit(30),
    supabase.from("events").select("id, type, occurred_at").eq("tenant_id", tenantId).order("occurred_at", { ascending: false }).limit(15),
  ]);
  if (tenant.error) throw new Error(`No se pudo leer el comercio: ${tenant.error.message}`);
  if (!tenant.data) return null;

  // Emails de los miembros (Auth): son pocos por comercio.
  const memberEmails = await Promise.all(
    (members.data ?? []).map(async (m) => {
      const { data } = await supabase.auth.admin.getUserById(m.user_id);
      return { ...m, email: data.user?.email ?? null };
    }),
  );
  // Números del comercio: misma consulta que la lista, buscando por su slug.
  const { data: counts } = await supabase.rpc("admin_tenants", { p_search: tenant.data.slug, p_filter: "all", p_limit: 10, p_offset: 0 });
  const numbers = (counts ?? []).find((r) => r.id === tenantId);

  return {
    tenant: tenant.data,
    settings: settings.data,
    members: memberEmails,
    domains: domains.data ?? [],
    subscription: subscription.data,
    payments: payments.data ?? [],
    audit: audit.data ?? [],
    events: events.data ?? [],
    publishedProducts: Number(numbers?.published_products ?? 0),
    orders30d: Number(numbers?.orders_30d ?? 0),
    lastOrderAt: numbers?.last_order_at ?? null,
  };
}

export type AuditRow = {
  id: number;
  tenantId: string | null;
  tenantName: string | null;
  action: string;
  actorKind: string;
  actorUserId: string | null;
  reason: string | null;
  createdAt: string;
};

/** Auditoría global, filtrable por comercio y por tipo de actor. */
export async function listAudit(input: { tenantId?: string; actorKind?: string; page: number; pageSize: number }) {
  const supabase = createSupabaseServiceClient();
  let query = supabase
    .from("audit_log")
    .select("id, tenant_id, action, actor_kind, actor_user_id, reason, created_at", { count: "exact" })
    .order("created_at", { ascending: false })
    .range((input.page - 1) * input.pageSize, input.page * input.pageSize - 1);
  if (input.tenantId) query = query.eq("tenant_id", input.tenantId);
  if (input.actorKind) query = query.eq("actor_kind", input.actorKind);
  const { data, error, count } = await query;
  if (error) throw new Error(`No se pudo leer la auditoría: ${error.message}`);

  const ids = [...new Set((data ?? []).map((r) => r.tenant_id).filter((id): id is string => Boolean(id)))];
  const { data: tenants } = ids.length ? await supabase.from("tenants").select("id, name").in("id", ids) : { data: [] };
  const names = new Map((tenants ?? []).map((t) => [t.id, t.name]));
  const rows: AuditRow[] = (data ?? []).map((r) => ({
    id: r.id,
    tenantId: r.tenant_id,
    tenantName: r.tenant_id ? (names.get(r.tenant_id) ?? null) : null,
    action: r.action,
    actorKind: r.actor_kind,
    actorUserId: r.actor_user_id,
    reason: r.reason,
    createdAt: r.created_at,
  }));
  return { rows, total: count ?? 0 };
}

/** Hosts activos de un comercio (para invalidar su catálogo después de cambiar el estado). */
export async function tenantHosts(tenantId: string): Promise<string[]> {
  const supabase = createSupabaseServiceClient();
  const { data } = await supabase.from("domains").select("hostname").eq("tenant_id", tenantId).eq("status", "active");
  return (data ?? []).map((d) => d.hostname);
}

// -----------------------------------------------------------------------------
// Escrituras (private.admin_*). Devuelven el código de error de la base para traducirlo.
// -----------------------------------------------------------------------------

export type AdminWriteResult = { ok: true } | { ok: false; code: string };

async function call(fn: string, args: Record<string, unknown>): Promise<AdminWriteResult> {
  const supabase = createSupabaseServiceClient();
  const { error } = await supabase.rpc(fn as never, args as never);
  if (!error) return { ok: true };
  if (error.code === "P0001") return { ok: false, code: error.message };
  console.error(`${fn} falló`, { code: error.code, message: error.message });
  return { ok: false, code: "unknown" };
}

export const setTenantStatus = (actor: string, tenantId: string, status: "active" | "suspended" | "cancelled", reason: string) =>
  call("admin_set_tenant_status", { p_actor: actor, p_tenant_id: tenantId, p_status: status, p_reason: reason });

export const recordPayment = (
  actor: string,
  tenantId: string,
  payment: { amount: number; method: string; reference: string | null; notes: string | null; months: number },
) =>
  call("admin_record_payment", {
    p_actor: actor,
    p_tenant_id: tenantId,
    p_amount: payment.amount,
    p_method: payment.method,
    p_reference: payment.reference,
    p_notes: payment.notes,
    p_months: payment.months,
  });

export const changePlan = (actor: string, tenantId: string, planId: string, reason: string) =>
  call("admin_change_plan", { p_actor: actor, p_tenant_id: tenantId, p_plan_id: planId, p_reason: reason });

export const extendPeriod = (actor: string, tenantId: string, days: number, reason: string) =>
  call("admin_extend_period", { p_actor: actor, p_tenant_id: tenantId, p_days: days, p_reason: reason });

export const logSupportView = (actor: string, tenantId: string) =>
  call("admin_log_support_view", { p_actor: actor, p_tenant_id: tenantId });

export async function runDailyMaintenance() {
  const supabase = createSupabaseServiceClient();
  const { data, error } = await supabase.rpc("daily_maintenance");
  if (error) throw new Error(`La tarea diaria falló: ${error.message}`);
  // Solo marca lo vencido como pago pendiente; nunca suspende (migración 20261121174420).
  return data as { past_due: string[]; rate_limits_cleaned: number };
}

// -----------------------------------------------------------------------------
// Alta asistida (diseño, sección 10; rediseño 11e): sin correos. Si el dueño no tiene
// cuenta, se crea con el correo ya confirmado y una contraseña generada, que vuelve una
// sola vez para mostrarla en el panel central y mandarla por WhatsApp. Nunca se guarda ni
// se registra. Si ya tiene cuenta, el comercio nuevo aparece en su panel y su contraseña
// no se toca.
// -----------------------------------------------------------------------------

export type AssistedResult =
  | { ok: true; tenantId: string; slug: string; password?: string }
  | { ok: false; code: string };

export async function provisionAssisted(
  actor: string,
  input: { ownerEmail: string; name: string; slug: string; businessType: string; whatsappPhone: string },
  rootDomain: string,
): Promise<AssistedResult> {
  const supabase = createSupabaseServiceClient();

  const { data: existing, error: lookupError } = await supabase.rpc("admin_user_id_by_email", { p_email: input.ownerEmail });
  if (lookupError) return { ok: false, code: "unknown" };

  let ownerId = existing as string | null;
  let password: string | undefined;
  let created = false;
  if (!ownerId) {
    password = generatePassword();
    const { data, error } = await supabase.auth.admin.createUser({ email: input.ownerEmail, password, email_confirm: true });
    if (error || !data.user) {
      console.error("createUser falló", { code: error?.code, status: error?.status });
      return { ok: false, code: "create_user_failed" };
    }
    ownerId = data.user.id;
    created = true;
  } else if (await isUnclaimedAccount(ownerId)) {
    // Una cuenta que nadie usó (sin confirmar, o que nunca entró y no tiene comercios) no
    // se respeta: pudo crearla un tercero con el correo del dueño, eligiendo él la
    // contraseña, mientras el registro estuvo abierto. Se confirma y recibe una nueva.
    password = generatePassword();
    const { error } = await supabase.auth.admin.updateUserById(ownerId, { password, email_confirm: true });
    if (error) {
      console.error("updateUserById falló en el alta", { code: error.code, status: error.status });
      return { ok: false, code: "create_user_failed" };
    }
  }

  const { data, error } = await supabase.rpc("admin_provision_tenant", {
    p_actor: actor,
    p_owner_id: ownerId,
    p_input: { name: input.name, slug: input.slug, business_type: input.businessType, whatsapp_phone: input.whatsappPhone },
    p_root_domain: rootDomain,
  });
  if (error) {
    // Si la cuenta se creó recién, se borra. Si el borrado falla, el reintento la toma
    // igual como cuenta sin usar (isUnclaimedAccount) y le da otra contraseña.
    if (created) {
      const { error: deleteError } = await supabase.auth.admin.deleteUser(ownerId);
      if (deleteError) console.error("deleteUser falló tras un alta fallida", { code: deleteError.code, status: deleteError.status });
    }
    return { ok: false, code: error.code === "P0001" ? error.message : "unknown" };
  }
  const result = data as { tenant_id: string; slug: string };
  return { ok: true, tenantId: result.tenant_id, slug: result.slug, password };
}

/** Cuenta que nadie usó: sin confirmar, o que nunca inició sesión y no es miembro de ningún comercio. */
async function isUnclaimedAccount(userId: string): Promise<boolean> {
  const supabase = createSupabaseServiceClient();
  const { data, error } = await supabase.auth.admin.getUserById(userId);
  if (error || !data.user) return false;
  if (!data.user.email_confirmed_at) return true;
  if (data.user.last_sign_in_at) return false;
  const { count } = await supabase.from("tenant_members").select("tenant_id", { count: "exact", head: true }).eq("user_id", userId);
  return count === 0;
}

/**
 * "Nueva contraseña" para el dueño de un comercio (solo superadmin, con motivo). Primero la
 * base verifica al actor, busca al dueño (nunca un administrador) y lo deja en la
 * auditoría, sin la contraseña: como la entrada del modo soporte, no puede haber un cambio
 * sin su registro. Después Auth cambia la contraseña y confirma el correo (una cuenta sin
 * confirmar no podría entrar). La nueva vuelve una sola vez.
 */
export async function resetOwnerPassword(
  actor: string,
  tenantId: string,
  reason: string,
): Promise<{ ok: true; email: string; password: string } | { ok: false; code: string }> {
  const supabase = createSupabaseServiceClient();
  const { data: ownerId, error } = await supabase.rpc("admin_log_owner_password_reset", {
    p_actor: actor,
    p_tenant_id: tenantId,
    p_reason: reason,
  });
  if (error) return { ok: false, code: error.code === "P0001" ? error.message : "unknown" };

  const password = generatePassword();
  const { data, error: authError } = await supabase.auth.admin.updateUserById(ownerId, { password, email_confirm: true });
  if (authError || !data.user?.email) {
    console.error("updateUserById falló", { code: authError?.code, status: authError?.status });
    return { ok: false, code: "unknown" };
  }
  return { ok: true, email: data.user.email, password };
}

// -----------------------------------------------------------------------------
// Barrido de fotos huérfanas (tarea diaria): archivos del bucket catalog-public que
// ya no tienen fila en la base (un borrado que falló a mitad de camino, o una subida
// directa a Storage salteando el servidor). Solo se borran archivos de más de un día,
// para no pisar una subida en curso, y con un tope por corrida.
// -----------------------------------------------------------------------------

const BUCKET = "catalog-public";
const MAX_SWEEP_DELETES = 500;
const ONE_DAY_MS = 86_400_000;

export async function sweepOrphanImages(now = new Date()): Promise<{ checked: number; deleted: number }> {
  const supabase = createSupabaseServiceClient();
  const storage = supabase.storage.from(BUCKET);
  const [{ data: images }, { data: settings }] = await Promise.all([
    supabase.from("catalog_product_images").select("storage_path").limit(100_000),
    supabase.from("tenant_settings").select("logo_path, cover_path"),
  ]);
  const known = new Set<string>([
    ...(images ?? []).map((i) => i.storage_path),
    ...(settings ?? []).flatMap((s) => [s.logo_path, s.cover_path]).filter((p): p is string => Boolean(p)),
  ]);

  const toDelete: string[] = [];
  let checked = 0;
  const isOld = (createdAt: string | null | undefined) => !createdAt || now.getTime() - new Date(createdAt).getTime() > ONE_DAY_MS;
  const consider = (folder: string, file: { name: string; created_at?: string | null }) => {
    const base = `${folder}/${file.name.replace(/-(480|1280)\.webp$/, "")}`;
    checked++;
    if (!known.has(base) && isOld(file.created_at)) toDelete.push(`${folder}/${file.name}`);
  };

  const { data: tenants } = await storage.list("", { limit: 1000 });
  for (const tenant of tenants ?? []) {
    if (toDelete.length >= MAX_SWEEP_DELETES) break;
    const { data: products } = await storage.list(`${tenant.name}/products`, { limit: 1000 });
    for (const product of products ?? []) {
      const folder = `${tenant.name}/products/${product.name}`;
      const { data: files } = await storage.list(folder, { limit: 1000 });
      for (const file of files ?? []) consider(folder, file);
    }
    const { data: branding } = await storage.list(`${tenant.name}/branding`, { limit: 1000 });
    for (const file of branding ?? []) consider(`${tenant.name}/branding`, file);
  }

  const batch = toDelete.slice(0, MAX_SWEEP_DELETES);
  if (batch.length > 0) await storage.remove(batch);
  return { checked, deleted: batch.length };
}

// -----------------------------------------------------------------------------
// Modo soporte (solo lectura): lo que ve el comercio en su panel. La entrada queda
// auditada antes de mostrar nada (logSupportView en la acción que lleva acá).
// -----------------------------------------------------------------------------

export async function getSupportSnapshot(tenantId: string) {
  const supabase = createSupabaseServiceClient();
  const [tenant, settings, categories, products, orders, hours] = await Promise.all([
    supabase.from("tenants").select("id, slug, name, status, published_at").eq("id", tenantId).maybeSingle(),
    supabase
      .from("tenant_settings")
      .select("display_name, tagline, whatsapp_phone, accepts_pickup, accepts_delivery, delivery_fee, min_order_amount, open_mode")
      .eq("tenant_id", tenantId)
      .maybeSingle(),
    supabase.from("catalog_categories").select("id, name, is_visible").eq("tenant_id", tenantId).order("position"),
    supabase
      .from("catalog_products")
      .select("id, category_id, name, price, is_published, is_available, is_featured")
      .eq("tenant_id", tenantId)
      .order("position")
      .limit(500),
    supabase
      .from("orders")
      .select("id, number, status, fulfillment, customer_name, total, created_at")
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: false })
      .limit(20),
    supabase.from("business_hours").select("weekday, opens_at, closes_at").eq("tenant_id", tenantId).order("weekday"),
  ]);
  if (!tenant.data) return null;
  return {
    tenant: tenant.data,
    settings: settings.data,
    categories: categories.data ?? [],
    products: products.data ?? [],
    orders: orders.data ?? [],
    hours: hours.data ?? [],
  };
}
