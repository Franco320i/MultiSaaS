/**
 * Puerta de entrada del módulo catálogo (diseño, sección 2). Las rutas de `src/app`
 * importan desde acá; otros módulos no pueden importar este (regla de ESLint).
 *
 * Las Server Actions se importan desde "@/modules/catalog/actions" (archivo "use server").
 */
export { CategoryForm } from "./components/category-form";
export { DeleteButton } from "./components/delete-button";
export { ProductForm } from "./components/product-form";
export { countProducts, getCategory, getProduct, listCategories, listProducts } from "./queries";
export type { Category, Product } from "./queries";
