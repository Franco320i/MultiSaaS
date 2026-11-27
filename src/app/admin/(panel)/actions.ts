"use server";

import { refresh, updateTag } from "next/cache";
import { z } from "zod";
import { requirePlatformAdmin } from "@/core/admin/access";
import * as admin from "@/core/admin/service";
import { cacheTags } from "@/lib/cache/tags";
import { env } from "@/lib/env";
import { parseAmountToCents } from "@/lib/money";
import { platformUrl } from "@/lib/urls";
import { provisionSchema } from "@/modules/settings";

/**
 * Server Actions del panel central (diseño, sección 9). Endpoints públicos:
 * requirePlatformAdmin(…, "superadmin") dentro de cada una, Zod para todo lo que entra
 * y motivo obligatorio. La base vuelve a comprobar el actor y escribe la auditoría.
 * Al cambiar el estado o la vigencia, se invalida el catálogo del comercio.
 */

export type AdminFormState = { error?: string; saved?: string };

const MESSAGES: Record<string, string> = {
  not_superadmin: "Solo un superadmin puede hacer esto.",
  tenant_not_found: "El comercio no existe.",
  reason_required: "Escribí el motivo (es obligatorio y queda en la auditoría).",
  invalid_status: "Ese cambio de estado no se puede hacer. Un comercio cancelado no se reactiva desde acá.",
  invalid_payment: "Revisá el monto, el medio de pago y los meses.",
  invalid_plan: "Ese plan no existe.",
  over_plan_limit: "El comercio tiene más productos de los que permite ese plan.",
  invalid_days: "Elegí entre 1 y 90 días.",
  no_subscription: "El comercio no tiene una suscripción vigente.",
};

const idSchema = z.uuid();
const reasonSchema = z.string().trim().min(3, MESSAGES.reason_required).max(500);

async function superadmin(tenantId: string) {
  const access = await requirePlatformAdmin(`/comercios/${tenantId}`, "superadmin");
  return access;
}

async function revalidateTenant(tenantId: string) {
  updateTag(cacheTags.tenantSettings(tenantId));
  for (const host of await admin.tenantHosts(tenantId)) updateTag(cacheTags.host(host));
}

function result(r: admin.AdminWriteResult, saved: string): AdminFormState {
  if (!r.ok) return { error: MESSAGES[r.code] ?? "No pudimos guardar el cambio. Probá de nuevo." };
  refresh();
  return { saved };
}

export async function setStatusAction(tenantId: string, _prev: AdminFormState, formData: FormData): Promise<AdminFormState> {
  const access = await superadmin(tenantId);
  const parsed = z
    .object({ tenantId: idSchema, status: z.enum(["active", "suspended", "cancelled"]), reason: reasonSchema })
    .safeParse({ tenantId, status: formData.get("status"), reason: formData.get("reason") });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };

  const r = await admin.setTenantStatus(access.userId, parsed.data.tenantId, parsed.data.status, parsed.data.reason);
  if (r.ok) await revalidateTenant(parsed.data.tenantId);
  const label = { active: "Comercio reactivado.", suspended: "Comercio suspendido.", cancelled: "Comercio cancelado." }[parsed.data.status];
  return result(r, label);
}

export async function recordPaymentAction(tenantId: string, _prev: AdminFormState, formData: FormData): Promise<AdminFormState> {
  const access = await superadmin(tenantId);
  const parsed = z
    .object({
      tenantId: idSchema,
      amount: z
        .string()
        .transform((v) => parseAmountToCents(v))
        .refine((v): v is number => v !== null && v > 0, "El monto no es válido: escribí, por ejemplo, 24.900."),
      method: z.enum(["mp_link", "transfer", "cash", "other"]),
      months: z.coerce.number().int().min(1).max(12),
      reference: z.string().trim().max(200).optional().transform((v) => v || null),
      notes: z.string().trim().max(1000).optional().transform((v) => v || null),
    })
    .safeParse({
      tenantId,
      amount: formData.get("amount") ?? "",
      method: formData.get("method"),
      months: formData.get("months"),
      reference: formData.get("reference") ?? undefined,
      notes: formData.get("notes") ?? undefined,
    });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };

  const { tenantId: id, amount, ...payment } = parsed.data;
  const r = await admin.recordPayment(access.userId, id, { amount: amount as number, ...payment });
  if (r.ok) await revalidateTenant(id);
  return result(r, "Pago registrado. El comercio quedó activo.");
}

export async function changePlanAction(tenantId: string, _prev: AdminFormState, formData: FormData): Promise<AdminFormState> {
  const access = await superadmin(tenantId);
  const parsed = z
    .object({ tenantId: idSchema, plan: z.enum(["base", "pro"]), reason: reasonSchema })
    .safeParse({ tenantId, plan: formData.get("plan"), reason: formData.get("reason") });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };
  return result(await admin.changePlan(access.userId, parsed.data.tenantId, parsed.data.plan, parsed.data.reason), "Plan cambiado.");
}

export async function extendPeriodAction(tenantId: string, _prev: AdminFormState, formData: FormData): Promise<AdminFormState> {
  const access = await superadmin(tenantId);
  const parsed = z
    .object({ tenantId: idSchema, days: z.coerce.number().int().min(1).max(90), reason: reasonSchema })
    .safeParse({ tenantId, days: formData.get("days"), reason: formData.get("reason") });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };
  const r = await admin.extendPeriod(access.userId, parsed.data.tenantId, parsed.data.days, parsed.data.reason);
  if (r.ok) await revalidateTenant(parsed.data.tenantId);
  return result(r, `Vencimiento extendido ${parsed.data.days} días.`);
}

// -----------------------------------------------------------------------------
// Alta asistida
// -----------------------------------------------------------------------------

/** Datos para pasarle al dueño por WhatsApp. La contraseña se muestra una sola vez. */
export type OwnerCredentials = { panelUrl: string; email: string; password?: string };

export type AssistedState = AdminFormState & { tenantId?: string; fields?: Record<string, string>; credentials?: OwnerCredentials };

const ASSISTED_MESSAGES: Record<string, string> = {
  ...MESSAGES,
  invalid_slug: "Esa dirección no se puede usar. Probá con otra.",
  slug_taken: "Esa dirección ya la usa otro comercio.",
  invalid_whatsapp: "El WhatsApp va con código de país, por ejemplo +54 9 2954 123456.",
  invalid_business_type: "Elegí un rubro.",
  invalid_name: "Escribí el nombre del comercio.",
  owner_not_found: "No encontramos al dueño. Probá de nuevo.",
  create_user_failed: "No pudimos crear la cuenta del dueño. Revisá el email y probá de nuevo.",
};

export async function provisionAssistedAction(_prev: AssistedState, formData: FormData): Promise<AssistedState> {
  const access = await requirePlatformAdmin("/alta", "superadmin");
  const fields = Object.fromEntries(
    ["ownerEmail", "name", "slug", "businessType", "whatsappPhone"].map((k) => [k, String(formData.get(k) ?? "").slice(0, 200)]),
  );
  const parsed = provisionSchema
    .extend({ ownerEmail: z.email("Escribí el email del dueño.").max(254).transform((v) => v.trim().toLowerCase()) })
    .safeParse(fields);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message, fields };

  const result = await admin.provisionAssisted(access.userId, parsed.data, env.ROOT_DOMAIN);
  if (!result.ok) return { error: ASSISTED_MESSAGES[result.code] ?? "No pudimos crear el comercio. Probá de nuevo.", fields };
  return {
    tenantId: result.tenantId,
    credentials: { panelUrl: platformUrl(env.ROOT_DOMAIN, "app"), email: parsed.data.ownerEmail, password: result.password },
    saved: result.password
      ? `Listo: creamos ${parsed.data.name} y la cuenta del dueño.`
      : `Listo: creamos ${parsed.data.name}. ${parsed.data.ownerEmail} ya tenía cuenta: lo va a ver al entrar a su panel con su contraseña de siempre.`,
  };
}

export type ResetPasswordState = AdminFormState & { credentials?: OwnerCredentials };

const RESET_MESSAGES: Record<string, string> = {
  ...MESSAGES,
  tenant_cancelled: "El comercio está cancelado.",
  owner_not_found: "El comercio no tiene dueño.",
  owner_is_admin: "El dueño es un administrador de la plataforma: su contraseña se cambia desde Supabase.",
};

/**
 * "Nueva contraseña" para el dueño (solo superadmin, con motivo). Queda en la auditoría,
 * sin la contraseña, y cierra las sesiones abiertas del dueño.
 */
export async function resetOwnerPasswordAction(tenantId: string, _prev: ResetPasswordState, formData: FormData): Promise<ResetPasswordState> {
  const access = await superadmin(tenantId);
  const parsed = z.object({ tenantId: idSchema, reason: reasonSchema }).safeParse({ tenantId, reason: formData.get("reason") });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };

  const result = await admin.resetOwnerPassword(access.userId, parsed.data.tenantId, parsed.data.reason);
  if (!result.ok) return { error: RESET_MESSAGES[result.code] ?? "No pudimos cambiar la contraseña. Probá de nuevo." };
  refresh();
  return {
    saved: "Listo: la contraseña anterior ya no sirve y se cerraron las sesiones abiertas del dueño.",
    credentials: { panelUrl: platformUrl(env.ROOT_DOMAIN, "app"), email: result.email, password: result.password },
  };
}
