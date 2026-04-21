# `public.emprendedores` — esquema real (referencia)

Inventario **confirmado en producción** (orden no garantizado). Sirve para alinear
`vw_emprendedores_publico` y evitar asumir columnas que solo existen en migraciones viejas o en otros entornos.

## Columnas que **sí** existen (lista unificada)

- `id`
- `slug`
- `nombre_emprendimiento` — **único** nombre comercial de la ficha (no existe `nombre`).
- `frase_negocio`
- `nombre_responsable`
- `mostrar_responsable_publico`
- `email`
- `whatsapp_principal`
- `whatsapp_secundario`
- `instagram`
- `sitio_web`
- `descripcion_libre`
- `palabras_clave`
- `foto_principal_url`
- `categoria_id`
- `clasificacion_estado`
- `comuna_id` — comuna base del negocio (**no** existe `comuna_base_id` en tabla).
- `cobertura_tipo`
- `estado_publicacion`
- `destacado`
- `vistas_count`
- `clicks_whatsapp`
- `clicks_instagram`
- `clicks_web`
- `search_vector`
- `created_at`
- `updated_at`
- `clasificacion_confianza`
- `clasificacion_fuente`
- `tipo_actividad`
- `sector_slug`
- `tags_slugs`
- `comunas_cobertura`
- `regiones_cobertura`
- `estado`
- `plan_activo`
- `plan_expira_at`
- `trial_expira_at`
- `impresiones_busqueda`
- `plan`
- `categoria_slug_final`
- `subcategoria_slug_final`
- `keywords_finales`
- `direccion_local`
- `comunas_cobertura_ids`

## Columnas que **no** existen en este esquema (no usar en vistas sobre `e`)

| Asumido en código antiguo | Usar en su lugar |
|---------------------------|------------------|
| `e.nombre` | `e.nombre_emprendimiento` |
| `e.comuna_base_id` | `e.comuna_id` (y en vista: alias `comuna_base_id` = `comuna_id` si hace falta contrato) |
| `e.descripcion_corta` | `e.frase_negocio` (exponer como columna de vista `descripcion_corta` si el API espera el nombre) |
| `e.descripcion_larga` | `e.descripcion_libre` (idem como `descripcion_larga` en vista) |
| `e.whatsapp` (legacy) | `e.whatsapp_principal` |
| `e.web` (legacy) | `e.sitio_web` |
| `e.subcategorias_slugs` (array) | Construir desde `e.subcategoria_slug_final` o solo pivotes / taxonomía |
| `e.nivel_cobertura` | `e.cobertura_tipo` (o duplicar en vista como alias) |

## `public.emprendedor_locales`

La migración `20260415000000_locales_fisicos_y_whatsapp.sql` define entre otras: `nombre_local`, `direccion`, `comuna_id`, `es_principal`. El código del panel inserta también `referencia`. Si la tabla se creó a mano o sin aplicar migraciones, puede **faltar** `nombre_local` (error `42703` al crear la vista). La migración `20260430230000_vw_emprendedores_publico_whatsapp_secundario.sql` ejecuta `ADD COLUMN IF NOT EXISTS nombre_local` y `referencia` antes de `CREATE OR REPLACE VIEW`.

## Reglas para `vw_emprendedores_publico`

1. **Solo** referenciar columnas de la lista anterior (o derivadas en el `SELECT` de la vista).
2. Comuna base en JOIN: `LEFT JOIN comunas cb ON cb.id = e.comuna_id`.
3. Mantener nombres de salida esperados por el front (`descripcion_corta`, `descripcion_larga`, `subcategorias_slugs`, etc.) **como alias** si la tabla no tiene esa columna.
4. No agregar columnas nuevas a `emprendedores` desde esta documentación: solo contrato de lectura.

## Otras vistas

`public.vw_emprendedores_algolia_final` (migraciones antiguas) puede seguir referenciando nombres legacy (`e.nombre`, `e.descripcion_corta`, etc.). Si esa vista se usa en el mismo proyecto, conviene alinearla con este documento en una migración aparte.

Última actualización: alineado a capturas / diagnóstico abril 2026.
