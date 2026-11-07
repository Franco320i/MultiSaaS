/**
 * Roles dentro de un comercio y permisos del panel (diseño, sección 6).
 * Este mapa es la única fuente de permisos en el código y se refleja en RLS:
 * si cambia acá, revisar las políticas de la tabla afectada (y viceversa).
 *
 * Los roles del panel central (superadmin, soporte) se agregan en la etapa 9.
 */
export const TENANT_ROLES = ["owner", "staff"] as const;
export type TenantRole = (typeof TENANT_ROLES)[number];

const PERMISSIONS = {
  /** Ver el panel, el catálogo y los pedidos. */
  "panel.view": ["owner", "staff"],
  /** Crear y editar productos, categorías e imágenes. */
  "catalog.write": ["owner", "staff"],
  /** Cambiar el estado de los pedidos. */
  "orders.manage": ["owner", "staff"],
  /** Editar marca, horarios, WhatsApp y entrega. */
  "settings.write": ["owner"],
  /** Publicar o despublicar el catálogo. */
  "catalog.publish": ["owner"],
  /** Invitar y quitar staff. */
  "members.manage": ["owner"],
  /** Ver plan y pagos. */
  "billing.view": ["owner"],
} as const satisfies Record<string, readonly TenantRole[]>;

export type Permission = keyof typeof PERMISSIONS;

export function isTenantRole(value: unknown): value is TenantRole {
  return typeof value === "string" && (TENANT_ROLES as readonly string[]).includes(value);
}

export function can(role: TenantRole, permission: Permission): boolean {
  return (PERMISSIONS[permission] as readonly TenantRole[]).includes(role);
}
