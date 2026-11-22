-- =============================================================================
-- Etiquetas según el rubro (2026-11-22). La plantilla del catálogo es la misma para todos,
-- pero cada rubro ofrece sus etiquetas en el panel (src/lib/catalog-options.ts,
-- TAGS_BY_TEMPLATE). La base acepta la lista completa: si un comercio cambia de rubro,
-- sus etiquetas viejas siguen siendo válidas y se siguen viendo.
-- Se suman: liquidacion (Liquidación) e importado (Importado).
-- =============================================================================

alter table public.catalog_products drop constraint catalog_products_tags_check;

alter table public.catalog_products add constraint catalog_products_tags_check
  check (tags <@ array['nuevo', 'ultimas_unidades', 'liquidacion', 'importado',
                       'vegetariano', 'vegano', 'sin_tacc', 'picante']
         and cardinality(tags) <= 3
         and private.distinct_texts(tags));
