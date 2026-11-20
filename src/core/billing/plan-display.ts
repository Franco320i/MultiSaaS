/**
 * Cómo se muestran los planes en la página principal. Puro: sin base ni Next,
 * para poder probarlo y usarlo desde cualquier componente.
 */
export type PublicPlan = {
  id: string;
  name: string;
  /** Precio por mes en centavos. */
  priceCents: number;
  /** null = ilimitados. */
  maxProducts: number | null;
  maxImagesPerProduct: number;
  sort: number;
};

/** Copia del valor de `provision_tenant` (`interval '14 days'`); si cambia allá, cambiar acá. */
export const TRIAL_DAYS = 14;

const count = (n: number) => n.toLocaleString("es-AR");

/**
 * Solo los límites que la app hace cumplir hoy (productos y fotos por producto).
 * Miembros, dominio propio y quitar la marca no están construidos: no se muestran.
 */
export function planHighlights(plan: PublicPlan): string[] {
  const products = plan.maxProducts === null ? "Productos ilimitados" : `Hasta ${count(plan.maxProducts)} productos`;
  const images =
    plan.maxImagesPerProduct === 1 ? "1 foto por producto" : `Hasta ${count(plan.maxImagesPerProduct)} fotos por producto`;
  return [products, images];
}

/** El plan de mayor `sort` se destaca como recomendado; con menos de dos planes no hay a quién destacar. */
export function recommendedPlanId(plans: PublicPlan[]): string | null {
  if (plans.length < 2) return null;
  return plans.reduce((best, plan) => (plan.sort > best.sort ? plan : best)).id;
}
