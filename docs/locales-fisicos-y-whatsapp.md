# Locales físicos y política WhatsApp

## Resumen

- **Locales físicos:** Un emprendimiento puede tener 0 a 3 locales. Uno debe marcarse como principal; su comuna alimenta `comuna_base_id`.
- **Cobertura:** Sigue siendo un concepto aparte (solo mi comuna, varias comunas, regiones, nacional).
- **WhatsApp:** 1 principal obligatorio, 1 secundario opcional (máximo 2 por emprendimiento). El mismo número puede repetirse en varios emprendimientos; se detecta si aparece en más de 3 fichas para moderación.

## Base de datos

### Tabla `emprendedor_locales`

| Columna        | Tipo      | Descripción                                      |
|----------------|-----------|--------------------------------------------------|
| id             | uuid      | PK                                               |
| emprendedor_id | uuid      | FK emprendedores                                 |
| nombre_local   | text      | Opcional (ej. "Sucursal Centro")                  |
| direccion      | text      | Obligatorio                                      |
| comuna_id      | uuid      | FK comunas                                       |
| es_principal  | boolean   | Solo un local por emprendimiento puede ser true   |
| created_at     | timestamptz |                                                |
| updated_at     | timestamptz |                                                |

- Índice único parcial: un solo `es_principal = true` por `emprendedor_id`.
- Regla de negocio: máximo 3 locales por emprendimiento (aplicada en API y formulario).

### Columnas en `emprendedores`

- **whatsapp_principal:** WhatsApp principal (obligatorio). Se mantiene también la columna `whatsapp` con el mismo valor por compatibilidad.
- **whatsapp_secundario:** Opcional; máximo 2 WhatsApp por emprendimiento.

### Vista `vw_whatsapp_mas_de_tres_fichas`

- Consulta números WhatsApp (principal y secundario) normalizados (solo dígitos) de emprendimientos publicados.
- Agrupa por número y filtra los que aparecen en **más de 3** fichas.
- Uso: revisión o moderación (no bloquea el registro).

## Comuna base

- **Con locales:** `comuna_base_id` = comuna del local marcado como principal.
- **Sin locales:** `comuna_base_id` = comuna base elegida en el formulario (comuna principal declarada).

La cobertura y los locales no se mezclan: la cobertura sigue definiendo dónde atiende (solo comuna, varias comunas, regiones, nacional).

## Formulario

1. **¿Tienes local físico?** Sí / No.
2. Si **Sí:** se muestran hasta 3 locales. Cada uno: nombre (opcional), dirección, comuna, y uno marcado como "Es el local principal". Botón "Agregar otro local" (máximo 3).
3. Si **No:** se pide comuna base como antes y, si aplica, una dirección única.
4. **Contacto:** WhatsApp principal (obligatorio), WhatsApp secundario (opcional).

## API de publicación

- **Body:** `tiene_local_fisico`, `locales` (array de `{ nombre_local?, direccion, comuna_slug, es_principal }`), `whatsapp_principal`, `whatsapp_secundario`.
- Si `tiene_local_fisico` y hay locales: se valida 1–3 locales, uno principal; se resuelve `comuna_base_id` y dirección desde el local principal; se insertan filas en `emprendedor_locales`.
- Se validan los dos WhatsApp (formato Chile, secundario distinto del principal).

## Detección WhatsApp en muchas fichas

- **Vista:** `vw_whatsapp_mas_de_tres_fichas`.
- **Helper:** `lib/whatsappModeration.ts` → `getWhatsAppEnMasDeTresFichas(supabase)` devuelve la lista de números (normalizados) con más de 3 fichas para uso en panel o tareas de moderación.

## Búsqueda por comuna y resultados

- **Distinción en resultados:** La API `GET /api/buscar?comuna=...` devuelve por cada ítem:
  - `tiene_local_en_comuna`: true si el negocio tiene al menos un local en `emprendedor_locales` con esa comuna.
  - `atiende_comuna`: true si tiene local, base, cobertura explícita, regional o nacional que aplica a la comuna.
  - `comuna_match_source`: `'local' | 'base' | 'cobertura' | 'regional' | 'nacional' | null`.
- **Ranking:** 1) Con local en la comuna, 2) Base en la comuna, 3) Atienden por cobertura, 4) Regional, 5) Nacional. Ver `lib/comunaMatch.ts` y `app/api/buscar/route.ts`.
- **Listados:** En `PublicSearchResults` se muestra primero el bloque "Con local en [comuna]", luego "En tu comuna", luego "También atienden [comuna]".

## Ficha pública y locales físicos

- **API** `GET /api/emprendedor/[slug]`: incluye `item.locales` (array desde `emprendedor_locales` con nombre_local, direccion, comuna_nombre, comuna_slug, es_principal).
- **Ficha** (`EmprendedorClient`): si hay 1 local se muestra en un recuadro "Local"; si hay 2 o 3 se muestra el bloque "Locales físicos" con lista (nombre opcional, comuna, dirección, indicador principal).

## Migración

- `supabase/migrations/20260415000000_locales_fisicos_y_whatsapp.sql`: crea `emprendedor_locales`, añade `whatsapp_principal` y `whatsapp_secundario`, backfill desde `whatsapp`, crea la vista de moderación.
