/** Pedido del comercio ficticio de las maquetas ("Burger del Centro"). Montos en centavos. */
export const SAMPLE_ITEMS = [
  { name: "Doble cheddar", cents: 950000, swatch: "linear-gradient(135deg,#F59E0B,#B45309)" },
  { name: "Papas con cheddar", cents: 520000, swatch: "linear-gradient(135deg,#FDE68A,#D97706)" },
  { name: "Gaseosa 500 ml", cents: 200000, swatch: "linear-gradient(135deg,#FCA5A5,#B91C1C)" },
] as const;

export const SAMPLE_TOTAL = SAMPLE_ITEMS.reduce((sum, item) => sum + item.cents, 0);
