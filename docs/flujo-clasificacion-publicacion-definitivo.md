# Flujo definitivo: clasificación y publicación

## 1. Separación de estados

### Estado de clasificación (`classification_status`)

Solo describe si el rubro está asignado y cómo:

| Valor | Significado |
|-------|-------------|
| `sin_clasificar` | Aún no se ha intentado clasificar o no hay datos suficientes. |
| `clasificada_automatica` | La IA asignó subcategoría(s) con confianza ≥ umbral. |
| `pendiente_revision` | Sin match, o match con confianza baja; requiere revisión humana. |
| `clasificada_manual` | Un moderador asignó o corrigió la clasificación. |

### Estado de publicación (`estado_publicacion`)

Describe el ciclo de vida de la ficha ante el público:

| Valor | Significado |
|-------|-------------|
| `borrador` | El emprendedor aún no envía. |
| `en_revision` | Enviado; pendiente de revisión (clasificación o moderación). |
| `publicado` | Visible en el sitio. |
| `rechazado` | Rechazado por moderación. |

La clasificación y la publicación son independientes: puede estar `clasificada_automatica` y `en_revision` (p. ej. rubro regulado).

---

## 2. Prioridad de fuentes en `classifyAndAssignBusiness`

### Texto para la IA (orden estricto)

1. **`descripcion_negocio`** — Si existe, se usa solo este.
2. **`descripcion_corta` + `descripcion_larga`** — Si no hay descripción de negocio.
3. **`nombre`** — Si no hay ninguna descripción.

No se mezclan: se toma la primera fuente disponible en ese orden.

### Keywords para el mapeo (orden estricto)

1. **`keywords_usuario_json`** (o columna `keywords_usuario`) — Primero.
2. **Keywords detectadas por IA** — Después, sin duplicar las del usuario.

La lista que se envía al mapeo es: `[ ...keywordsUsuario, ...keywordsIa ]` (usuario primero, luego IA).

---

## 3. Validación para “suficiente información”

No se usa solo “25 caracteres”. Se considera que hay suficiente para clasificar si se cumple **al menos una** de:

- **Al menos 2 keywords de usuario** (`keywordsUsuario.length >= 2`), o
- **Texto con al menos 2 palabras y 25+ caracteres**, o
- **Texto con al menos 3 palabras y 20+ caracteres.**

Implementación: `hasEnoughInfoToClassify(text, keywordsUsuario)` en `lib/classifyBusiness.ts`.

---

## 4. Confianza baja → pendiente de revisión

Si hay **match** de subcategoría(s) pero la confianza de la IA es **&lt; 0.7**:

- Se asignan igual **subcategoría principal y secundarias** en `emprendedor_subcategorias`.
- Se guarda **`classification_status = pendiente_revision`** y **`classification_review_required = true`**.
- Se añade o mantiene el registro en **`clasificacion_pendiente`** para revisión humana.
- **No** se marca como `clasificada_automatica`.

Umbral: constante `CONFIDENCE_THRESHOLD = 0.7` en `lib/classifyBusiness.ts`.

---

## 5. Subcategoría principal y secundarias

- **Principal:** primera candidata (mayor score), `is_primary = true` en `emprendedor_subcategorias` y `subcategoria_principal_id` en `emprendedores`.
- **Secundarias:** resto de candidatas (hasta 6), `is_primary = false`.

Todas se persisten en `emprendedor_subcategorias` con `source_type` y `confidence_score`.

---

## 6. Tablas para aprendizaje futuro

- **`clasificacion_pendiente`** — Cola de emprendimientos con clasificación pendiente de revisión (status: pendiente, en_revision, resuelto).
- **`clasificacion_feedback_log`** — Log de correcciones/aprobaciones/rechazos (action: correccion, aprobacion, rechazo, observacion).

Quedan como base para entrenar o ajustar reglas sin tocar el flujo actual.

---

## 7. Migraciones SQL

1. **`20260326000000_motor_clasificacion_ia_completo.sql`**  
   Crea tablas (subcategorias, emprendedor_subcategorias, keyword_to_subcategory_map, clasificacion_pendiente, clasificacion_feedback_log) y columnas en `emprendedores`.

2. **`20260327000000_estados_clasificacion_publicacion_definitivo.sql`**  
   - Normaliza filas intermedias a `estado_publicacion = 'en_revision'` cuando no son `borrador`, `publicado`, `rechazado` ni `suspendido`.
   - Mapea `classification_status` antiguos a los nuevos (`automatica` → `clasificada_automatica`, `corregida_manual` → `clasificada_manual`, etc.).
   - Ajusta CHECK de `classification_status` a: `sin_clasificar`, `clasificada_automatica`, `pendiente_revision`, `clasificada_manual`.
   - Ajusta CHECK de `estado_publicacion` a: `borrador`, `en_revision`, `publicado`, `rechazado`, `suspendido`.
   - Asegura que existan `clasificacion_pendiente` y `clasificacion_feedback_log`.

**Orden:** ejecutar primero la migración del motor, luego la de estados.

---

## 8. Flujo de creación (publicar)

1. El usuario envía descripción de negocio y opcionalmente keywords.
2. Se valida con **`hasEnoughInfoToClassify(descripcionNegocio, keywordsUsuario)`**.
3. Si hay suficiente información → se inserta el emprendedor (con clasificación en null) y se llama a **`classifyAndAssignBusiness(supabase, id, { descripcion_negocio, keywords_usuario })`**.
4. Dentro de `classifyAndAssignBusiness`:
   - Texto por prioridad: `descripcion_negocio` > descripciones > nombre.
   - Keywords: usuario primero, luego IA.
   - Si no hay suficiente texto/keywords → error.
   - IA + mapeo → candidatas.
   - Sin match → `classification_status = pendiente_revision`, `estado_publicacion = en_revision`, upsert en `clasificacion_pendiente`.
   - Con match y confianza &lt; 0.7 → se asignan principal y secundarias, pero `classification_status = pendiente_revision` y upsert en `clasificacion_pendiente`.
   - Con match y confianza ≥ 0.7 → `classification_status = clasificada_automatica`, se borra de `clasificacion_pendiente`, y `estado_publicacion` según `getPublishingDecision` (publicado o `en_revision` si es rubro regulado).

---

## 9. Flujo de actualización (reclasificar)

- **`POST /api/emprendedor/[slug]/reclasificar`**  
  Lee de la fila `descripcion_negocio`, `descripcion_corta`, `descripcion_larga`, `keywords_usuario_json`/`keywords_usuario` y llama a **`classifyAndAssignBusiness(supabase, id)`** sin opciones.  
  Misma lógica de prioridades, validación, confianza y estados que en creación.
