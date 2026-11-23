import "server-only";
import type { PostgrestError, SupabaseClient } from "@supabase/supabase-js";
import type { ProductOptionGroup } from "@/lib/product-options";
import type { Database } from "@/types/database";
import type { OptionForm, OptionGroupForm } from "./schemas";

/**
 * Opciones del producto en el panel (parte 3): lecturas y escrituras con la sesión del
 * usuario (RLS deja solo su comercio). Siempre filtran por el tenantId verificado.
 */

type Client = SupabaseClient<Database>;
export type OptionResult = { ok: true } | { ok: false; error: string };

export type PanelOptionGroup = ProductOptionGroup & { position: number };

function toUserError(error: PostgrestError): string {
  if (error.code === "P0001") return error.message; // límites (5 grupos, 20 opciones), escritos por nosotros
  if (error.code === "23514") return "Algún dato no es válido: revisá el nombre (hasta 40 letras) y el precio.";
  if (error.code === "42501") return "No tenés permiso para hacer esto.";
  return "No pudimos guardar los cambios. Probá de nuevo.";
}

export async function listOptionGroups(supabase: Client, tenantId: string, productId: string): Promise<PanelOptionGroup[]> {
  const { data: groups, error } = await supabase
    .from("catalog_option_groups")
    .select("id, name, required, max_choices, position")
    .eq("tenant_id", tenantId)
    .eq("product_id", productId)
    .order("position")
    .order("created_at");
  if (error) throw new Error(`No se pudieron leer las opciones: ${error.message}`);
  if (groups.length === 0) return [];

  const { data: options, error: optionsError } = await supabase
    .from("catalog_options")
    .select("id, group_id, name, price_delta, is_available")
    .eq("tenant_id", tenantId)
    .in("group_id", groups.map((g) => g.id))
    .order("position")
    .order("created_at");
  if (optionsError) throw new Error(`No se pudieron leer las opciones: ${optionsError.message}`);

  return groups.map((g) => ({
    id: g.id,
    name: g.name,
    required: g.required,
    maxChoices: g.max_choices,
    position: g.position,
    options: options
      .filter((o) => o.group_id === g.id)
      .map((o) => ({ id: o.id, name: o.name, priceDelta: o.price_delta, isAvailable: o.is_available })),
  }));
}

/** Posición siguiente: al final de los grupos del producto o de las opciones del grupo. */
async function nextPosition(supabase: Client, kind: "group" | "option", tenantId: string, parentId: string) {
  const { data } =
    kind === "group"
      ? await supabase.from("catalog_option_groups").select("position").eq("tenant_id", tenantId).eq("product_id", parentId).order("position", { ascending: false }).limit(1)
      : await supabase.from("catalog_options").select("position").eq("tenant_id", tenantId).eq("group_id", parentId).order("position", { ascending: false }).limit(1);
  return (data?.[0]?.position ?? 0) + 1;
}

export async function createGroup(supabase: Client, tenantId: string, productId: string, form: OptionGroupForm): Promise<OptionResult> {
  const position = await nextPosition(supabase, "group", tenantId, productId);
  const { error } = await supabase.from("catalog_option_groups").insert({
    tenant_id: tenantId,
    product_id: productId,
    name: form.name,
    required: form.required,
    max_choices: form.max_choices,
    position,
  });
  return error ? { ok: false, error: toUserError(error) } : { ok: true };
}

export async function updateGroup(supabase: Client, tenantId: string, groupId: string, form: OptionGroupForm): Promise<OptionResult> {
  const { data, error } = await supabase
    .from("catalog_option_groups")
    .update({ name: form.name, required: form.required, max_choices: form.max_choices })
    .eq("tenant_id", tenantId)
    .eq("id", groupId)
    .select("id");
  if (error) return { ok: false, error: toUserError(error) };
  return data.length === 1 ? { ok: true } : { ok: false, error: "Ese grupo ya no existe." };
}

export async function deleteGroup(supabase: Client, tenantId: string, groupId: string): Promise<OptionResult> {
  const { error } = await supabase.from("catalog_option_groups").delete().eq("tenant_id", tenantId).eq("id", groupId);
  return error ? { ok: false, error: toUserError(error) } : { ok: true };
}

export async function createOption(supabase: Client, tenantId: string, groupId: string, form: OptionForm): Promise<OptionResult> {
  const position = await nextPosition(supabase, "option", tenantId, groupId);
  const { error } = await supabase.from("catalog_options").insert({
    tenant_id: tenantId,
    group_id: groupId,
    name: form.name,
    price_delta: form.price_delta,
    position,
  });
  return error ? { ok: false, error: toUserError(error) } : { ok: true };
}

export async function updateOption(supabase: Client, tenantId: string, optionId: string, form: OptionForm): Promise<OptionResult> {
  const { data, error } = await supabase
    .from("catalog_options")
    .update({ name: form.name, price_delta: form.price_delta })
    .eq("tenant_id", tenantId)
    .eq("id", optionId)
    .select("id");
  if (error) return { ok: false, error: toUserError(error) };
  return data.length === 1 ? { ok: true } : { ok: false, error: "Esa opción ya no existe." };
}

export async function setOptionAvailable(supabase: Client, tenantId: string, optionId: string, available: boolean): Promise<OptionResult> {
  const { error } = await supabase.from("catalog_options").update({ is_available: available }).eq("tenant_id", tenantId).eq("id", optionId);
  return error ? { ok: false, error: toUserError(error) } : { ok: true };
}

export async function deleteOption(supabase: Client, tenantId: string, optionId: string): Promise<OptionResult> {
  const { error } = await supabase.from("catalog_options").delete().eq("tenant_id", tenantId).eq("id", optionId);
  return error ? { ok: false, error: toUserError(error) } : { ok: true };
}

/** Sube o baja un grupo (entre los del producto) o una opción (entre las del grupo). */
export async function moveOptionItem(
  supabase: Client,
  table: "catalog_option_groups" | "catalog_options",
  tenantId: string,
  id: string,
  direction: "up" | "down",
): Promise<OptionResult> {
  // Hermanos: los grupos del mismo producto o las opciones del mismo grupo.
  let rows: { id: string; position: number }[];
  if (table === "catalog_option_groups") {
    const { data: row } = await supabase.from("catalog_option_groups").select("product_id").eq("tenant_id", tenantId).eq("id", id).maybeSingle();
    if (!row) return { ok: false, error: "No existe." };
    const { data, error } = await supabase.from("catalog_option_groups").select("id, position").eq("tenant_id", tenantId).eq("product_id", row.product_id).order("position").order("created_at");
    if (error) return { ok: false, error: toUserError(error) };
    rows = data;
  } else {
    const { data: row } = await supabase.from("catalog_options").select("group_id").eq("tenant_id", tenantId).eq("id", id).maybeSingle();
    if (!row) return { ok: false, error: "No existe." };
    const { data, error } = await supabase.from("catalog_options").select("id, position").eq("tenant_id", tenantId).eq("group_id", row.group_id).order("position").order("created_at");
    if (error) return { ok: false, error: toUserError(error) };
    rows = data;
  }

  const order = rows.map((r) => r.id);
  const index = order.indexOf(id);
  const target = direction === "up" ? index - 1 : index + 1;
  if (index === -1 || target < 0 || target >= order.length) return { ok: true };
  [order[index], order[target]] = [order[target], order[index]];

  for (const [i, rowId] of order.entries()) {
    if (rows.find((r) => r.id === rowId)?.position === i + 1) continue;
    const { error: updateError } = await supabase.from(table).update({ position: i + 1 }).eq("tenant_id", tenantId).eq("id", rowId);
    if (updateError) return { ok: false, error: toUserError(updateError) };
  }
  return { ok: true };
}
