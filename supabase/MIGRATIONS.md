# Esquema SQL: set mínimo ordenado

Este proyecto **no** usa tabla de control tipo `supabase_migrations.schema_migrations`. La carpeta `migrations/` es la **fuente de verdad declarativa** para un orden lógico de aplicación; el historial de redefiniciones intermedias vive en `migrations_archive/`.

## Cómo aplicar

1. Ejecutar los `.sql` de `migrations/` **en orden por nombre de archivo** (prefijo `YYYYMMDD…`). En PowerShell: `Get-ChildItem supabase/migrations/*.sql | Sort-Object Name | ForEach-Object { $_.Name }` — en este repo ese orden coincide con las dependencias revisadas (p. ej. `20260318` → `20260325`, `20260420000000` → `20260420000001`, `20260403103000` → `20260429140000`).
2. **No** ejecutar archivos de `migrations_archive/` salvo auditoría o comparación con una BD legada.
3. Antes de aplicar en una BD existente, contrastar con introspección real (tablas, vistas, funciones). Ver sección *Drift* al final.

## `emprendedores.estado_publicacion` (canónico)

Valores alineados con `lib/estadoPublicacion.ts`: **`borrador`**, **`en_revision`**, **`publicado`**, **`suspendido`**, **`rechazado`**. Solo **`publicado`** es visible en sitio público y búsqueda. Tras alta o edición de ficha (panel / espejo borrador) el código fuerza **`en_revision`**.

## Cadenas de redefinición y archivo ganador

### `public.buscar_emprendedores_por_comuna`

| Orden | Archivo | Rol |
|------|---------|-----|
| 1 | `migrations_archive/20260324210000_buscar_emprendedores_por_comuna.sql` | Firma `(text)` |
| 2 | `migrations_archive/20260324220000_buscar_emprendedores_por_comuna_campos.sql` | `(text, text)` |
| 3 | `migrations_archive/20260324230000_buscar_emprendedores_por_comuna_final.sql` | `(text, text)` ajustada |
| **Ganador** | **`migrations/20260406120000_estado_publicacion_pendiente_moderacion.sql`** | Define de nuevo la RPC `(text, text)`, filtra `estado_publicacion = 'publicado'`, y aplica `updated_at` + CHECK de publicación en `emprendedores`. |

### `public.vw_emprendedores_algolia_final`

| Orden | Archivo | Rol |
|------|---------|-----|
| 1 | `migrations_archive/20260403140000_vw_emprendedores_algolia_categoria_id.sql` | Primera versión de la vista |
| 2 | `migrations_archive/20260403170000_vw_algolia_listing_ficha_fields.sql` | Amplía columnas de listing |
| **Ganador** | **`migrations/20260420000001_vw_emprendedores_algolia_final.sql`** | Vista final usada por reindex / listing. |

**Dependencia:** conviene haber aplicado antes `20260420000000_emprendedores_campos_finales.sql` (columnas que la vista puede referenciar).

### `public.vw_conteo_comuna_rubro` (y vistas de apertura)

| Orden | Archivo | Rol |
|------|---------|-----|
| 1 | `migrations_archive/20260317_vistas_apertura_comunas.sql` | Primera versión de `vw_conteo_comuna_rubro`, `vw_conteo_comuna_rubro_contado`, `vw_comunas_por_abrir` |
| 2 | **`migrations/20260318_vistas_cobertura_ordenadas.sql`** | **Reemplaza** esas vistas y añade `vw_apertura_rubros_comuna`, `vw_resumen_regiones_apertura`, `vw_resumen_pais_apertura` |
| **Ganador (definición de la vista base)** | **`migrations/20260325_conteo_rubros_por_subcategoria_principal.sql`** | Vuelve a definir **`vw_conteo_comuna_rubro`** contando solo por `emprendedores.subcategoria_principal_id` + `comuna_base_id` (grilla /cobertura). Las demás vistas del bloque 18 siguen apiladas encima de esta definición. |

**Orden obligatorio:** `20260318` → `20260325`.

### Modalidades (`emprendedor_modalidades` / valores permitidos)

| Orden | Archivo | Rol |
|------|---------|-----|
| 1 | **`migrations/20260403103000_modalidades_delivery_domicilio.sql`** | Ajusta CHECK y migración conceptual `presencial_terreno` → `domicilio` / delivery |
| **Ganador (CHECK actual)** | **`migrations/20260429140000_emprendedor_modalidades_valores_enum.sql`** | Última migración que redefine el CHECK de `modalidad` en `emprendedor_modalidades` |

No hay archivos de modalidades en `migrations_archive/`; las dos migraciones vigentes son complementarias y deben ejecutarse en ese orden.

---

## Inventario: `migrations/` (vigentes)

Orden sugerido = orden alfabético del nombre (coincide con la línea de tiempo del repo).

| Archivo | Clasificación | Notas |
|---------|----------------|-------|
| `20260313_classificacion_v1.sql` | vigente | Tablas `sectores`, `tags`, etc. (legado; cruzar con uso en app) |
| `20260313_motivo_verificacion.sql` | vigente | Columna `motivo_verificacion` |
| `20260314_planes_perfil_completo.sql` | vigente | Plan / trial en `emprendedores` |
| `20260315_analytics_metrics.sql` | vigente | Analytics |
| `20260316_publicar_borradores.sql` | vigente | Columnas borrador + vista `emprendedores_borrador` |
| `20260319_seed_regiones_comunas_chile.sql` | **solo datos** | Seed regiones/comunas |
| `20260320_comunas_region_text.sql` | vigente | Sync región en comunas |
| `20260321_commune_activity.sql` | vigente | Actividad por comuna |
| `20260322_comunas_activacion_automatica.sql` | vigente | Triggers conteo comunas |
| `20260322100000_emprendedor_relaciones_cobertura_modalidades_galeria.sql` | vigente | Pivotes cobertura / modalidades / galería |
| `20260322120000_direccion_referencia.sql` | vigente | Dirección / referencia |
| `20260318_vistas_cobertura_ordenadas.sql` | vigente | Vistas apertura/cobertura (ver cadena arriba) |
| `20260323_apertura_vs_oferta_comuna.sql` | vigente | `get_oferta_comuna_count` |
| `20260324_clasificacion_automatica_arquitectura.sql` | vigente (+ datos incrustados) | `keyword_to_subcategory_map` + columnas IA; incluye inserts iniciales |
| `20260325_conteo_rubros_por_subcategoria_principal.sql` | vigente | Redefine `vw_conteo_comuna_rubro` |
| `20260326000000_motor_clasificacion_ia_completo.sql` | vigente | Motor IA; refina `keyword_to_subcategory_map` si ya existía por 24 |
| `20260326193000_buscar_emprendedores_por_cobertura_v2.sql` | vigente | RPC distinta a `buscar_emprendedores_por_comuna` |
| `20260326200000_postulaciones_clasificacion_manual.sql` | vigente | Postulaciones |
| `20260327000000_estados_clasificacion_publicacion_definitivo.sql` | vigente | CHECK clasificación + publicación |
| `20260328000000_taxonomia_categorias_subcategorias.sql` | vigente | Tabla `categorias` |
| `20260329000001_keyword_map_unique_normalized.sql` | vigente | Índice/unicidad en mapa keywords |
| `20260329000002_taxonomia_subcategorias_completo.sql` | **solo datos** | Seed subcategorías |
| `20260329000003_taxonomia_keywords_seed.sql` | **solo datos** | Seed keywords map |
| `20260330000000_taxonomia_v1_oficial.sql` | vigente | Alter taxonomía |
| `20260330010100_postulaciones_keywords_usuario.sql` | vigente | Postulaciones |
| `20260331000000_motor_clasificacion_aprendizaje.sql` | vigente | Aprendizaje / increment usage |
| `20260331210000_comunas_forzar_abierta.sql` | vigente | Flag comunas |
| `20260401000000_clasificacion_reviewed_at_y_search_suggestions.sql` | vigente | `search_suggestions` |
| `20260402180000_emprendedores_widen_legacy_varchar100.sql` | vigente | Ampliar VARCHAR |
| `20260403103000_modalidades_delivery_domicilio.sql` | vigente | Modalidades (ver cadena) |
| `20260404120000_fn_emprendedores_abrir_comuna_activacion.sql` | vigente | RPC abrir comuna |
| `20260404123000_comuna_interes_nullable.sql` | vigente | `comuna_interes` |
| `20260404220000_pagos_emprendedores.sql` | vigente | Tabla pagos |
| `20260405120000_pagos_estado_procesando.sql` | vigente | Estado procesando |
| `20260405183000_postulaciones_whatsapp_secundario.sql` | vigente | WhatsApp secundario postulaciones |
| `20260406120000_estado_publicacion_pendiente_moderacion.sql` | vigente | **RPC comuna ganadora** + moderación `estado_publicacion` |
| `20260415000000_locales_fisicos_y_whatsapp.sql` | vigente | `emprendedor_locales` + vista WhatsApp |
| `20260416000000_frase_negocio.sql` | vigente | `frase_negocio` |
| `20260417000000_keywords_pendientes.sql` | vigente | Tabla keywords pendientes |
| `20260418000000_keywords_detectadas.sql` | vigente | Keywords detectadas + funciones |
| `20260419000000_comuna_expansion_interes.sql` | vigente | Expansión interés |
| `20260420000000_emprendedores_campos_finales.sql` | vigente | Campos finales emprendedores |
| `20260420000001_vw_emprendedores_algolia_final.sql` | vigente | **Vista Algolia ganadora** |
| `20260429120000_migrate_legacy_emprendedor_cobertura_pivots.sql` | **condicional** | Copia pivotes solo si existen tablas legacy |
| `20260429140000_emprendedor_modalidades_valores_enum.sql` | vigente | **CHECK modalidades ganador** |
| `20260429150000_postulaciones_emprendedores_finales_moderacion.sql` | vigente | Moderación postulaciones |


### Obsoleto (respecto del producto)

Ningún archivo vigente fue marcado como **obsoleto** solo por contenido SQL: la tabla `sectores`/`tags` (en `20260313_classificacion_v1.sql`) puede ser legado de producto; eso se valida contra el código, no se archivó aquí.

---

## Inventario: `migrations_archive/` (supersedido)

| Archivo | Clasificación | Reemplazado por |
|---------|----------------|-----------------|
| `20260317_vistas_apertura_comunas.sql` | **supersedido** | `20260318_vistas_cobertura_ordenadas.sql` |
| `20260324210000_buscar_emprendedores_por_comuna.sql` | **supersedido** | `20260406120000_estado_publicacion_pendiente_moderacion.sql` |
| `20260324220000_buscar_emprendedores_por_comuna_campos.sql` | **supersedido** | ↑ |
| `20260324230000_buscar_emprendedores_por_comuna_final.sql` | **supersedido** | ↑ |
| `20260403140000_vw_emprendedores_algolia_categoria_id.sql` | **supersedido** | `20260420000001_vw_emprendedores_algolia_final.sql` |
| `20260403170000_vw_algolia_listing_ficha_fields.sql` | **supersedido** | ↑ |

---

## Drift BD ↔ repo

Sin baseline ni tabla de migraciones, el repo **no prueba** que tu Postgres coincida. Antes de confiar en el set mínimo:

- Comparar `information_schema` / `pg_proc` / `pg_views` con los objetos creados en los archivos vigentes.
- Si una BD se armó con archivos ya movidos al archivo, esas versiones siguen siendo la “historia” para entender diferencias.

## Baseline único

No forma parte de esta etapa. Cuando se defina, puede generarse un único `.sql` desde `pg_dump --schema-only` y los archivos de `migrations_archive/` seguirán como referencia histórica.
