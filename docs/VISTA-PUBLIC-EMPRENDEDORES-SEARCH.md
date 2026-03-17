# Vista `public_emprendedores_search`

Vista de Supabase que consolida **solo datos públicos** del emprendedor para búsquedas, listados y reindexación a Algolia.

---

## Qué consolida

| Bloque | Contenido |
|--------|-----------|
| **Datos públicos del emprendedor** | `id`, `slug`, `nombre`, `descripcion_corta`, `descripcion_larga` |
| **Categoría principal** | `categoria_id`, `categoria_nombre`, `categoria_slug` (una por emprendedor) |
| **Subcategorías** | `subcategorias_nombres_arr`, `subcategorias_slugs_arr` (arrays desde tabla puente) |
| **Comuna base** | `comuna_base_id`, `comuna_base_nombre`, `comuna_base_slug` |
| **Región** | `region_id`, `region_nombre`, `region_slug` (de la comuna base) |
| **Cobertura** | `nivel_cobertura`, `comunas_cobertura_*_arr`, `regiones_cobertura_*_arr` |
| **Foto principal** | `foto_principal_url` |
| **Links públicos** | `whatsapp`, `instagram`, `web` (sitio_web) |
| **Búsqueda** | `search_text` (texto consolidado para Algolia) |
| **Visibilidad** | `estado_publicacion`, `activo` (para filtrar en la app) |

No incluye: email interno, responsable cuando está oculto, datos administrativos ni métricas.

---

## Cómo se arma el SQL

1. **Tabla base:** `emprendedores e`
2. **Categoría:** `LEFT JOIN categorias cat ON e.categoria_id = cat.id`
3. **Comuna base:** `LEFT JOIN comunas cb ON e.comuna_base_id = cb.id`
4. **Región:** `LEFT JOIN regiones reg ON cb.region_id = reg.id`
5. **Subcategorías:** dos subconsultas con `emprendedor_subcategorias` + `subcategorias` y `array_agg( nombre )` / `array_agg( slug )` por emprendedor.
6. **Comunas de cobertura:** subconsulta sobre `emprendedor_comunas_cobertura` + `comunas`, con `array_agg` de nombres y slugs.
7. **Regiones de cobertura:** subconsulta sobre `emprendedor_regiones_cobertura` + `regiones`, con `array_agg` de nombres y slugs.
8. **search_text:** `concat_ws` de nombre, descripción corta/larga, categoría, subcategorías (vía `string_agg`), comuna base y keywords.

---

## Cómo crear la vista en Supabase

1. En el dashboard: **SQL Editor**.
2. Pega el contenido de `vista-public-emprendedores-search.sql`.
3. Ajusta nombres de columnas si tu esquema difiere (p. ej. `sitio_web` vs `web`, `keywords` como `text[]` o `jsonb`).
4. Ejecuta el script.

---

## Filtrar solo visibles

Para búsqueda pública o reindex a Algolia, usa solo filas publicadas y activas:

```sql
SELECT * FROM public_emprendedores_search
WHERE estado_publicacion = 'publicado'
  AND (activo IS NOT DISTINCT FROM true);
```

---

## Uso en el proyecto

- **Reindex Algolia:** leer desde esta vista (en lugar de `vw_emprendedores_algolia_final` o `vw_emprendedores_busqueda_v2`) y mapear campos al índice.
- **API de búsqueda:** opcionalmente consultar esta vista desde el backend antes de o además de Algolia.
- **Fichas públicas:** no es obligatorio; la ficha puede seguir leyendo de `vw_emprendedor_ficha` si ya tienes esa vista.

Si tu esquema usa otros nombres de tabla o columna (p. ej. `estado` en lugar de `estado_publicacion`), adapta el SQL en `vista-public-emprendedores-search.sql` a tu base real.
