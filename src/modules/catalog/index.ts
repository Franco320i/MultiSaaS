/**
 * Puerta de entrada del módulo catálogo (diseño, sección 2). Las rutas de `src/app`
 * importan desde acá; otros módulos no pueden importar este (regla de ESLint).
 *
 * Las Server Actions se importan desde "@/modules/catalog/actions" (archivo "use server").
 */
export { CategoryForm } from "./components/category-form";
export { DeleteButton } from "./components/delete-button";
export { ImportForm } from "./components/import-form";
export { ProductForm } from "./components/product-form";
export { ProductImages, type ImageItem } from "./components/product-images";
export { OptionsEditor } from "./components/options-editor";
export { listOptionGroups } from "./options";
export { firstImageByProduct, listProductImages, type ProductImage } from "./images";
export { StorefrontNotFound, StorefrontSkeleton, StorefrontUnavailable } from "./components/storefront/states";
export { StorefrontView } from "./components/storefront/storefront-view";
export { getPublicCatalog, type PublicCatalog, type PublicProduct } from "./public-queries";
export { countProducts, getCategory, getProduct, getTemplateKey, listCategories, listProducts } from "./queries";
export type { Category, Product } from "./queries";
