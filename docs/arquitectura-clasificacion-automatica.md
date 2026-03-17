# Arquitectura de clasificación automática de emprendimientos

Objetivo: **texto libre + IA para el ingreso**, **subcategorías estructuradas** para reglas de negocio (cobertura, apertura de comunas, filtros, SEO).

La IA no reemplaza la estructura; la alimenta.

---

## 1. Principio de diseño

- **Texto libre + IA**: el usuario escribe su actividad en lenguaje natural.
- **Subcategorías estructuradas**: el sistema guarda siempre en `subcategorias` + `emprendedor_subcategorias`.
- Toda la lógica de cobertura, apertura y filtros sigue usando solo la estructura (vistas `vw_conteo_comuna_rubro`, `vw_apertura_rubros_comuna`, etc.).

---

## 2. Tablas

| Tabla | Uso |
|-------|-----|
| **emprendedores** | `subcategoria_principal_id`, `ai_keywords_json`, `ai_raw_classification_json`, `categoria_id` |
| **subcategorias** | Fuente oficial de verdad (id, slug, nombre, categoria_id). |
| **emprendedor_subcategorias** | Pivote obligatoria: `emprendedor_id`, `subcategoria_id`, `source_type` (manual \| ai \| fallback), `confidence_score`, `is_primary`, `created_at`. |
| **keyword_to_subcategory_map** | Equivalencias/sinónimos: keyword → subcategoria_id, confidence_default, activo. |

Reglas:

- Todo emprendimiento publicado debe tener **al menos una** subcategoría.
- Idealmente **una** subcategoría principal (`is_primary = true` y `emprendedores.subcategoria_principal_id`).

---

## 3. Flujo de clasificación

1. **Texto libre** desde nombre, descripcion_corta, descripcion_larga.
2. **IA** (OpenAI): detecta keywords y tags (misma lógica que `/api/clasificacion/sugerir`).
3. **Normalización** de términos (slug: minúsculas, guiones, sin acentos).
4. **keyword_to_subcategory_map**: coincidencia exacta por normalized_keyword.
5. **Fallback**: similitud por slug/nombre en `subcategorias` (lib `mapKeywordsToSubcategorias`).
6. **Guardado**: `emprendedor_subcategorias` (source_type, confidence_score, is_primary) y `emprendedores.subcategoria_principal_id` + `categoria_id`.
7. **Trazabilidad**: `ai_keywords_json`, `ai_raw_classification_json`.

---

## 4. Funciones (backend)

| Función | Descripción |
|---------|-------------|
| **detectBusinessKeywords(input)** | Toma nombre + descripciones, llama a la IA, devuelve keywords, tags_slugs, confianza y raw. |
| **mapKeywordsToSubcategories(supabase, keywords)** | Primero `keyword_to_subcategory_map`, luego similitud; devuelve candidatas con score y principalId. |
| **assignBusinessSubcategories(supabase, emprendedorId, candidatas, options?)** | Borra relaciones previas, inserta en emprendedor_subcategorias, actualiza subcategoria_principal_id y opcionalmente ai_keywords_json / ai_raw_classification_json. |
| **classifyAndAssignBusiness(supabase, emprendedorId)** | Orquestador: lee emprendimiento, detecta, mapea, asigna. |

Ubicación: `lib/classifyBusiness.ts`, `lib/aiClassify.ts`, `lib/mapKeywordsToSubcategorias.ts`.

---

## 5. Validaciones

- **Publicar**: no se permite publicar sin al menos una subcategoría (mensaje: indicar mejor rubro o elegir categoría/subcategorías a mano).
- **Conflicto**: si hay varias candidatas, se usa la de mayor score como principal; el resto se guarda como secundarias.

---

## 6. Integración con cobertura

Las vistas existentes no cambian:

- `vw_conteo_comuna_rubro`: sigue leyendo `emprendedor_subcategorias` + `subcategorias`.
- `vw_apertura_rubros_comuna`, rubros faltantes, ranking por comuna: igual.
- Filtros por rubro y páginas SEO comuna + rubro siguen usando la misma estructura.

Solo se asegura que **todos** los emprendimientos tengan al menos una fila en `emprendedor_subcategorias` (ya sea por flujo manual o por IA + mapeo).

---

## 7. Backfill para datos históricos

Script: `scripts/backfill-clasificacion-subcategorias.ts`

- Lista emprendimientos publicados.
- Para cada uno con texto suficiente: `classifyAndAssignBusiness(supabase, id)`.
- Incluye pausa entre llamadas para no saturar la API de OpenAI.

Ejecución (con env cargados):

```bash
npx tsx scripts/backfill-clasificacion-subcategorias.ts
```

Requiere: `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `OPENAI_API_KEY`.

---

## 8. Migración

Archivo: `supabase/migrations/20260324_clasificacion_automatica_arquitectura.sql`

- Crea `keyword_to_subcategory_map` y seed inicial (plomero→gasfiter, tortas→pasteleria, etc.).
- Añade en `emprendedores`: `subcategoria_principal_id`, `ai_keywords_json`, `ai_raw_classification_json`, `updated_at`.
- Añade en `emprendedor_subcategorias`: `source_type`, `confidence_score`, `is_primary`, `created_at`.

Ejecutar en Supabase antes de usar las nuevas funciones o el backfill.
