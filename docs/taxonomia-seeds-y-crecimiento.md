# Taxonomía: seeds, migraciones y estrategia de crecimiento

Este documento describe el orden de migraciones, los seeds de categorías/subcategorías/keywords, las restricciones e índices, y cómo hacer crecer el diccionario sin duplicados.

## Orden de migraciones

Ejecutar en este orden (por fecha/nombre):

1. **20260326000000_motor_clasificacion_ia_completo.sql**  
   Crea tablas: `subcategorias`, `emprendedor_subcategorias`, `keyword_to_subcategory_map`, `clasificacion_pendiente`, `clasificacion_feedback_log` y columnas en `emprendedores`. La tabla `keyword_to_subcategory_map` queda con `UNIQUE(normalized_keyword)`.

2. **20260328000000_taxonomia_categorias_subcategorias.sql**  
   Crea `categorias` si no existe, inserta las 16 categorías principales e inserta subcategorías y keywords de ejemplo. Usa `ON CONFLICT (normalized_keyword)` en los INSERT de keywords.

3. **20260329000001_keyword_map_unique_normalized.sql**  
   - Elimina duplicados por `normalized_keyword` (conserva una fila por valor).
   - Añade `UNIQUE(normalized_keyword)` si no existe (idempotente con la migración del motor).

4. **20260329000002_taxonomia_subcategorias_completo.sql**  
   Inserta subcategorías oficiales (~170) con un solo `INSERT ... SELECT` desde `VALUES` + `JOIN categorias` por slug. `ON CONFLICT (slug) DO NOTHING`.

5. **20260329000003_taxonomia_keywords_seed.sql**  
   Inserta el seed inicial de keywords (~230) en `keyword_to_subcategory_map`. Resuelve `subcategoria_id` por slug de subcategoría. `ON CONFLICT (normalized_keyword) DO UPDATE`.

6. **20260330000000_taxonomia_v1_oficial.sql**  
   Ajustes taxonomía v1: solo `UNIQUE(normalized_keyword)` en keyword_to_subcategory_map; categoría "Otros" marcada como fallback interno (`es_fallback_interno`); subcategorías con campo `esencial_apertura` para las que cuentan para abrir comunas. Idempotente.

7. **20260331000000_motor_clasificacion_aprendizaje.sql**  
   Motor de aprendizaje: en `keyword_to_subcategory_map` agrega `usage_count` y `source_type` (seed, manual, ai_feedback, user_keyword); en `clasificacion_pendiente` agrega `texto_fuente`, `keywords_detectadas_json`, `sugerencias_json`, `motivo`, `reviewed_by`; en `clasificacion_feedback_log` agrega `clasificacion_ia_json`, `clasificacion_final_json`, `cambio_realizado`. Incluye función `increment_keyword_usage_count(normalized_keywords text[])` para incrementar uso desde el backend. Idempotente.

8. **20260401000000_clasificacion_reviewed_at_y_search_suggestions.sql**  
   `clasificacion_pendiente`: agrega `reviewed_at`. Nueva tabla `search_suggestions` (query_text, normalized_query, source_type, subcategoria_id, categoria_id, usage_count, activo) como base para sugerencias de búsqueda tipo Google. Idempotente.

9. **20260415000000_locales_fisicos_y_whatsapp.sql**  
   Locales físicos (0–3) y WhatsApp: tabla `emprendedor_locales` (id, emprendedor_id, nombre_local, direccion, comuna_id, es_principal); columnas `whatsapp_principal` y `whatsapp_secundario` en `emprendedores`; vista `vw_whatsapp_mas_de_tres_fichas` para moderación. Ver `docs/locales-fisicos-y-whatsapp.md`.

## Aplicación de la taxonomía v1 en el sistema

- **Catálogo público:** Las rutas que exponen categorías/subcategorías al usuario filtran "Otros" para no mostrarla como opción pública:
  - `GET /api/catalogo/categorias-con-subcategorias`: excluye categorías con `es_fallback_interno = true`.
  - `GET /api/home/categories`: excluye categoría con `slug = 'otros'` o `es_fallback_interno = true`.
- **Clasificación:** `lib/classifyBusiness.ts` usa `keyword_to_subcategory_map` (por `normalized_keyword`) y `subcategorias`; la lógica de apertura de comunas en vistas puede usar `subcategorias.esencial_apertura` en el futuro (p. ej. para filtrar rubros que cuentan para la meta).
- **Subcategorías amplias:** "clases" y "mecanico" se mantienen en v1; están documentadas como candidatas a desagregación en una futura v2.
- **Motor de aprendizaje:**
  - Prioridad de `source_type` en keyword_to_subcategory_map: manual > ai_feedback > seed > user_keyword. Las keywords con source_type `manual` no se sobrescriben por ai_feedback, seed ni user_keyword. Ver `lib/keywordValidation.ts` (`canOverwriteKeywordSource`).
  - Validación de keywords antes de insertar: `lib/keywordValidation.ts` (`normalizeAndFilterKeyword`): longitud 2–40, lista de ruido (somos, empresa, servicio, calidad, experiencia, lider, mejor, solucion, profesional, etc.).
  - Cada clasificación exitosa (no pendiente de revisión) incrementa `usage_count` en las keywords que hicieron match vía `increment_keyword_usage_count` (RPC).
  - Cuando no hay match, el caso se guarda en `clasificacion_pendiente` con `texto_fuente`, `keywords_detectadas_json`, `sugerencias_json`, `motivo`.
  - Al corregir manualmente desde el panel (asignar subcategorías a un emprendedor), se invoca `learnFromManualClassification`: guarda keywords del emprendedor en `keyword_to_subcategory_map` respetando prioridad de source_type, marca el caso como resuelto (`reviewed_at`, `reviewed_by` si hay auth) y registra en `clasificacion_feedback_log`. Ver `lib/learnFromManualClassification.ts` y PUT `/api/panel/negocio`. El panel obtiene `reviewedBy` desde auth vía `lib/getPanelReviewerId.ts` (cabecera Authorization: Bearer &lt;jwt&gt;).
  - Sugerencias de búsqueda: tabla `search_suggestions` y estrategia en `docs/search-suggestions-estrategia.md`; helpers en `lib/searchSuggestions.ts`.
  - **Sugerencias de keywords en el formulario de publicación:** cuando el usuario escribe la descripción del negocio, el sistema sugiere automáticamente palabras clave desde el diccionario (`keyword_to_subcategory_map`): extracción con `lib/extractKeywordsFromText.ts` (normalizar, stopwords, `normalizeAndFilterKeyword`), búsqueda en BD y priorización por `usage_count`. API: `POST /api/publicar/sugerir-keywords-desde-descripcion`; lógica en `lib/generateKeywordSuggestions.ts`. Las sugerencias se muestran como chips editables (mín 1, máx 10); no se guardan hasta que el usuario publique. La clasificación sigue usando descripcion_negocio, keywords_usuario_json y nombre_emprendimiento.

## Pruebas de clasificación (casos reales chilenos)

- **`lib/classificacion-casos-reales.test.ts`:** Batería de pruebas que valida `mapKeywordsToSubcategories` con casos típicos (panadería, gasfiter, vulcanización, mecánico, fletes, veterinaria, ferretería, clases, peluquería, pizzas, comida casera, etc.).
- **Batería 1 – casos reales:** `lib/clasificacion-bateria-casos-reales.ts` define 38+ casos de emprendimientos chilenos (nombre, descripción, keywords opcionales, subcategoría esperada).
- **Batería 2 – casos sucios/ambiguos:** `lib/clasificacion-bateria-casos-sucios.ts` define 20+ casos con lenguaje informal, textos cortos, coloquialismos, sinónimos no exactos, varios servicios mezclados y descripciones por productos. Sirve para estresar el motor.
- **Test de baterías:** `lib/clasificacion-bateria-reales.test.ts` ejecuta ambas baterías y genera en consola el mismo reporte: **bien_clasificado**, **ambiguo**, **falta_diccionario**. Umbral batería 1: ≥80% bien; batería 2: ≥50% bien.
- **Clasificación desde texto libre:** `lib/clasificacion-texto-real.test.ts` prueba el flujo completo como al publicar: solo **nombre_emprendimiento** y **descripcion_negocio** (sin keywords_usuario). Simula extracción de keywords desde el texto (dividir palabras, normalizar, stopwords, `normalizeAndFilterKeyword`), pasa a `mapKeywordsToSubcategories` y genera el mismo reporte más **pendiente_revision** (conf &lt; 0.7). Ejecutar: `npm run test -- lib/clasificacion-texto-real.test.ts`.
- **Fixture:** `lib/classificacion-taxonomia-fixture.ts` define subcategorías y keyword_to_subcategory_map de prueba para ejecutar los tests sin base de datos.
- Ejecutar: `npm run test -- lib/classificacion-casos-reales.test.ts` o `npm run test -- lib/clasificacion-bateria-reales.test.ts`.

## Seeds (archivos reutilizables)

- **supabase/seeds/subcategorias_oficiales.sql**  
  Mismo contenido que el INSERT de subcategorías de la migración 20260329000002. Útil para ejecutar a mano o en otro entorno.

- **supabase/seeds/keywords_iniciales.sql**  
  Mismo contenido que el INSERT de keywords de la migración 20260329000003. Formato: `(keyword, normalized_keyword, sub_slug, confidence_default)`. Útil para re-ejecutar o ampliar.

- **supabase/seeds/keywords_v1/**  
  Diccionario grande por bloques (v1 = ~2.000 keywords, meta 8.500). Archivos SQL separados: `01_hogar_construccion.sql`, `02_automotriz.sql`, `03_comida.sql`, `04_belleza.sql`, `05_mascotas.sql`, `06_comercio_barrio.sql`, `07_tecnologia.sql`, `08_salud.sql`, `09_educacion.sql`, `10_eventos.sql`. Cada uno usa `ON CONFLICT (normalized_keyword) DO UPDATE`. Ver `keywords_v1/README.md` e instrucciones de carga.

Para aplicar solo los seeds (con tablas ya creadas):

```bash
psql $DATABASE_URL -f supabase/seeds/subcategorias_oficiales.sql
psql $DATABASE_URL -f supabase/seeds/keywords_iniciales.sql
```

## Restricciones e índices recomendados

### keyword_to_subcategory_map

- **UNIQUE(normalized_keyword)** (oficial en v1)  
  Evita duplicados por término normalizado; permite usar `ON CONFLICT (normalized_keyword) DO UPDATE` al insertar desde clasificacion_pendiente o feedback. No se usa `UNIQUE(keyword)`.
- **Índices:**  
  - `idx_keyword_to_subcategory_map_normalized` en `(normalized_keyword)`  
  - `idx_keyword_to_subcategory_map_subcategoria` en `(subcategoria_id)`  
  - Índice parcial `WHERE activo = true` para consultas del motor de clasificación.

### subcategorias

- **UNIQUE(slug)**  
  Ya definido en la migración del motor. Necesario para que los seeds resuelvan `categoria_id` por slug de categoría y para que el INSERT de keywords resuelva `subcategoria_id` por slug.
- **esencial_apertura** (boolean)  
  True en las subcategorías que cuentan para la lógica de apertura de comunas (cobertura mínima). Definido en 20260330000000.

### categorias

- **UNIQUE(slug)**  
  Para que el seed de subcategorías pueda hacer `JOIN categorias c ON c.slug = v.cat_slug`.
- **es_fallback_interno** (boolean)  
  True solo para la categoría "Otros": no se expone como categoría pública; es fallback interno de clasificación. Listados/APIs públicas deben filtrar `WHERE es_fallback_interno = false` (o `COALESCE(es_fallback_interno, false) = false`).

## Estrategia para crecer el diccionario

Objetivo: llegar a 800–1000 keywords (y más) sin duplicados y con trazabilidad.

### 1. Agregar sinónimos manualmente

- Insertar en `keyword_to_subcategory_map` con:
  - `keyword`: forma legible (ej. "Plomero").
  - `normalized_keyword`: forma slug (ej. "plomero"), **única** en la tabla.
  - `subcategoria_id`: id de la subcategoría (resolver por slug desde `subcategorias`).
  - `confidence_default`: ej. 0.85–0.95.
  - `activo`: true.

Usar siempre:

```sql
INSERT INTO public.keyword_to_subcategory_map (keyword, normalized_keyword, subcategoria_id, confidence_default, activo)
SELECT 'nuevo_sinonimo', 'nuevo-sinonimo', s.id, 0.9, true
FROM public.subcategorias s WHERE s.slug = 'slug_subcategoria' LIMIT 1
ON CONFLICT (normalized_keyword) DO UPDATE SET
  subcategoria_id = EXCLUDED.subcategoria_id,
  keyword = EXCLUDED.keyword,
  updated_at = now();
```

Así no se generan duplicados por `normalized_keyword`.

### 2. Alimentar desde clasificacion_pendiente

Cuando un moderador asigna una subcategoría a un emprendimiento que estaba en `clasificacion_pendiente`:

- Tomar términos relevantes (por ejemplo keywords que el usuario ingresó o que la IA detectó).
- Normalizar cada término a slug (misma función que en `classifyBusiness`: minúsculas, sin acentos, espacios/guiones).
- Insertar/actualizar en `keyword_to_subcategory_map` con `ON CONFLICT (normalized_keyword) DO UPDATE` y la `subcategoria_id` asignada por el moderador.

Así el diccionario aprende de los casos resueltos y evita duplicados por `normalized_keyword`.

### 3. Alimentar desde feedback manual

Cuando se usa `clasificacion_feedback_log` (correcciones de categoría/subcategoría):

- Para cada corrección: término que llevaba a una subcategoría errónea y subcategoría correcta.
- Insertar o actualizar en `keyword_to_subcategory_map` el mapeo `normalized_keyword` → subcategoría correcta con `ON CONFLICT (normalized_keyword) DO UPDATE`.

Se puede implementar un job o un endpoint de admin que lea feedback reciente y haga estos upserts.

### 4. Evitar duplicados

- **Clave de unicidad:** `normalized_keyword`. Una sola fila por término normalizado.
- Todas las inserciones (manual, desde clasificacion_pendiente o desde feedback) deben usar la misma normalización que el código (slug: minúsculas, sin acentos, `[^a-z0-9]+` → `-`).
- Usar siempre `ON CONFLICT (normalized_keyword) DO UPDATE` en inserts batch para que re-ejecutar un seed o un script no cree filas duplicadas.

### 5. Llegar a 800–1000 keywords

- **Base actual:** ~230 keywords en el seed inicial.
- **Crecimiento:**  
  - Añadir bloques de `INSERT ... SELECT` con más `(keyword, normalized_keyword, sub_slug, confidence_default)` en nuevos archivos de seed o migraciones.  
  - Priorizar subcategorías con poco cubrimiento.  
  - Incorporar términos que aparezcan en `clasificacion_pendiente` y en feedback una vez asignada la subcategoría correcta.
- Los seeds/migraciones deben seguir usando `JOIN subcategorias s ON s.slug = v.sub_slug` y `ON CONFLICT (normalized_keyword) DO UPDATE`.

## Uso interno

La taxonomía es solo para uso interno: clasificación IA, cobertura, búsqueda y apertura de comunas. El usuario **no** elige categoría ni subcategoría en un selector; el sistema asigna a partir de descripción, keywords y diccionario.
