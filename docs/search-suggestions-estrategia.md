# Estrategia: search_suggestions (sugerencias de búsqueda)

Base para autocompletado tipo Google. Sin UI pública aún; solo migración, helpers de normalización y estrategia de alimentación.

## Tabla search_suggestions

- **query_text**: texto mostrado al usuario (ej. "Panadería").
- **normalized_query**: forma normalizada para matching (slug, sin tildes). UNIQUE.
- **source_type**: `seed` | `keyword` | `popular_search` | `subcategoria` | `categoria`.
- **subcategoria_id** / **categoria_id**: opcionales, para filtrar por rubro.
- **usage_count**: para ordenar por popularidad en el futuro.
- **activo**, **created_at**, **updated_at**.

## Alimentación

### a) Desde keyword_to_subcategory_map

- Leer filas con `activo = true`.
- Por cada fila: `query_text = keyword` (o normalized para mostrar), `normalized_query = normalized_keyword`, `source_type = 'keyword'`, `subcategoria_id = subcategoria_id`, `categoria_id` desde la subcategoría. `usage_count` puede copiarse o dejarse en 0 y actualizarse después.
- Upsert por `normalized_query` para no duplicar.

### b) Desde subcategorias

- Por cada subcategoría: `query_text = nombre`, `normalized_query = slug` (o toSlugForm(nombre)), `source_type = 'subcategoria'`, `subcategoria_id = id`, `categoria_id = categoria_id`.
- Útil para que al buscar "panadería" se sugiera la subcategoría.

### c) Desde categorias

- Por cada categoría: `query_text = nombre`, `normalized_query = slug`, `source_type = 'categoria'`, `categoria_id = id`.

### d) Búsquedas populares (futuro)

- Cuando se implemente tracking de búsquedas (ej. desde `/api/track-search` o similar), agregar o actualizar filas con `source_type = 'popular_search'` e incrementar `usage_count` para ordenar sugerencias por uso real.

## Helpers

- **normalizeSearchQuery(query)** en `lib/searchSuggestions.ts`: usa `toSlugForm` para consistencia con el resto del sistema.
- La migración está en `20260401000000_clasificacion_reviewed_at_y_search_suggestions.sql`.

## Uso futuro con Algolia + Supabase

- Supabase: fuente de verdad para sugerencias (seed + keyword + subcategoria/categoria).
- Algolia: índice de búsqueda que puede alimentarse desde esta tabla o desde un job que exporte `search_suggestions` a un índice de autocompletado.
- La UI de búsqueda puede consultar primero Supabase (o Algolia) con `normalized_query` LIKE prefix para sugerencias en tiempo real.
