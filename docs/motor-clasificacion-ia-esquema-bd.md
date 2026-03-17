# Motor de clasificación IA – Esquema de base de datos

Objetivo: que el usuario describa su negocio en texto libre, la IA interprete, el sistema clasifique automáticamente y los casos no resueltos queden en cola para revisión humana.

---

## 1. Tablas

### 1.1 `subcategorias`

Rubros/servicios estructurados (taxonomía interna). Depende de `categorias`.

| Columna        | Tipo         | Restricciones | Descripción                    |
|----------------|--------------|---------------|--------------------------------|
| id             | uuid         | PK, DEFAULT gen_random_uuid() | Identificador.                |
| categoria_id   | uuid         | NOT NULL, FK → categorias(id) ON DELETE CASCADE | Categoría padre. |
| nombre         | text         | NOT NULL      | Nombre para mostrar.           |
| slug           | text         | NOT NULL, UNIQUE | Slug URL (ej. gasfiter, panaderia). |
| is_destacada   | boolean      | DEFAULT false | Destacada en UI.               |
| orden_destacada| int          | NULL          | Orden en listados.             |
| created_at     | timestamptz  | DEFAULT now() | Alta.                          |
| updated_at     | timestamptz  | DEFAULT now() | Última actualización.          |

**Índices recomendados:** `(categoria_id)`, `(slug)` (UNIQUE ya indexa).

---

### 1.2 `emprendedor_subcategorias`

Pivote N:M entre emprendedores y subcategorías (varios rubros por emprendimiento).

| Columna         | Tipo         | Restricciones | Descripción                          |
|-----------------|--------------|---------------|--------------------------------------|
| id              | uuid         | PK, DEFAULT gen_random_uuid() | Identificador.                    |
| emprendedor_id  | uuid         | NOT NULL, FK → emprendedores(id) ON DELETE CASCADE | Emprendimiento. |
| subcategoria_id  | uuid         | NOT NULL, FK → subcategorias(id) ON DELETE CASCADE | Subcategoría.   |
| source_type     | text         | CHECK IN ('manual','ai','fallback'), DEFAULT 'manual' | Origen: manual, IA o fallback. |
| confidence_score| numeric(3,2) | NULL o 0–1    | Confianza de la asignación (IA).     |
| is_primary      | boolean      | NOT NULL DEFAULT false | Si es la subcategoría principal.   |
| created_at      | timestamptz  | NOT NULL DEFAULT now() | Alta.                            |

**Única por par:** UNIQUE(emprendedor_id, subcategoria_id).

**Índices recomendados:** `(emprendedor_id)`, `(subcategoria_id)`.

---

### 1.3 `keyword_to_subcategory_map`

Mapeo keyword (sinónimo / término libre) → subcategoría para clasificación automática.

| Columna            | Tipo         | Restricciones | Descripción                    |
|--------------------|--------------|---------------|--------------------------------|
| id                 | uuid         | PK, DEFAULT gen_random_uuid() | Identificador.            |
| keyword            | text         | NOT NULL, UNIQUE | Término original (ej. plomero). |
| normalized_keyword | text         | NOT NULL      | Término normalizado (slug).     |
| subcategoria_id     | uuid         | NOT NULL, FK → subcategorias(id) ON DELETE CASCADE | Subcategoría destino. |
| confidence_default  | numeric(3,2) | NOT NULL DEFAULT 0.85, CHECK 0–1 | Confianza por defecto.   |
| activo             | boolean      | NOT NULL DEFAULT true | Si se usa en mapeo.      |
| created_at         | timestamptz  | DEFAULT now() | Alta.                          |
| updated_at         | timestamptz  | DEFAULT now() | Última actualización.          |

**Índices recomendados:** `(normalized_keyword)`, `(subcategoria_id)`, `(activo) WHERE activo = true`.

---

### 1.4 `clasificacion_pendiente`

Cola de emprendimientos cuya clasificación requiere revisión humana.

| Columna        | Tipo         | Restricciones | Descripción                          |
|----------------|--------------|---------------|--------------------------------------|
| id             | uuid         | PK, DEFAULT gen_random_uuid() | Identificador.                    |
| emprendedor_id | uuid         | NOT NULL, FK → emprendedores(id) ON DELETE CASCADE, UNIQUE | Un registro por emprendimiento. |
| prioridad      | smallint     | DEFAULT 0     | Mayor = más urgente.                 |
| status         | text         | NOT NULL DEFAULT 'pendiente' | pendiente \| en_revision \| resuelto. |
| assigned_to    | uuid         | NULL, FK → auth.users(id) ON DELETE SET NULL | Revisor asignado (opcional). |
| resuelto_at    | timestamptz  | NULL          | Fecha de resolución.                 |
| created_at     | timestamptz  | NOT NULL DEFAULT now() | Entrada en cola.                 |
| updated_at     | timestamptz  | NOT NULL DEFAULT now() | Última actualización.            |

**Índices recomendados:** `(status)`, `(prioridad DESC, created_at)`, `(emprendedor_id)` (UNIQUE).

---

### 1.5 `clasificacion_feedback_log`

Registro de correcciones y feedback de moderación sobre clasificación.

| Columna             | Tipo         | Restricciones | Descripción                          |
|---------------------|--------------|---------------|--------------------------------------|
| id                  | uuid         | PK, DEFAULT gen_random_uuid() | Identificador.                    |
| emprendedor_id      | uuid         | NOT NULL, FK → emprendedores(id) ON DELETE CASCADE | Emprendimiento. |
| action              | text         | NOT NULL      | correccion \| aprobacion \| rechazo \| observacion. |
| old_subcategoria_id | uuid         | NULL, FK → subcategorias(id) ON DELETE SET NULL | Subcategoría anterior (si aplica). |
| new_subcategoria_id | uuid         | NULL, FK → subcategorias(id) ON DELETE SET NULL | Subcategoría nueva (si aplica).   |
| reviewed_by         | uuid         | NULL, FK → auth.users(id) ON DELETE SET NULL | Usuario revisor.               |
| notes               | text         | NULL          | Comentario del revisor.              |
| created_at          | timestamptz  | NOT NULL DEFAULT now() | Momento del evento.             |

**Índices recomendados:** `(emprendedor_id)`, `(created_at DESC)`, `(action)`.

---

## 2. Columnas en `emprendedores` (clasificación IA)

| Columna                     | Tipo    | Restricciones | Descripción |
|----------------------------|---------|---------------|-------------|
| subcategoria_principal_id  | uuid    | NULL, FK → subcategorias(id) ON DELETE SET NULL | Subcategoría principal asignada. |
| keywords_usuario_json      | jsonb   | NULL          | Palabras clave ingresadas por el usuario (ej. `["pan", "repostería"]`). |
| ai_keywords_json           | jsonb   | NULL          | Salida de la IA (keywords/tags y confianza). |
| ai_raw_classification_json | jsonb   | NULL          | Respuesta cruda del modelo (trazabilidad). |
| classification_status      | text    | DEFAULT 'pendiente_revision' | automatica \| pendiente_revision \| corregida_manual. |
| classification_confidence | numeric(3,2) | NULL, 0–1 | Confianza global de la clasificación automática. |
| classification_review_required | boolean | DEFAULT true | Si requiere revisión humana. |

**Índice recomendado:** `(subcategoria_principal_id)`, `(classification_status)`, `(classification_review_required) WHERE classification_review_required = true`.

---

## 3. Relaciones (resumen)

- `subcategorias.categoria_id` → `categorias.id`
- `emprendedor_subcategorias.emprendedor_id` → `emprendedores.id`
- `emprendedor_subcategorias.subcategoria_id` → `subcategorias.id`
- `keyword_to_subcategory_map.subcategoria_id` → `subcategorias.id`
- `clasificacion_pendiente.emprendedor_id` → `emprendedores.id`
- `clasificacion_feedback_log.emprendedor_id` → `emprendedores.id`
- `emprendedores.subcategoria_principal_id` → `subcategorias.id`

---

## 4. Flujo de creación / actualización

1. **Publicación (usuario)**  
   - Se guarda en `emprendedores`: texto libre, `keywords_usuario_json`, y (tras llamar a la IA) `ai_keywords_json`, `ai_raw_classification_json`, `classification_confidence`, `classification_status` (`automatica` o `pendiente_revision`), `classification_review_required`.

2. **Clasificación automática**  
   - Se combinan keywords usuario + IA.  
   - Se resuelve vía `keyword_to_subcategory_map` y/o similitud con `subcategorias`.  
   - Si hay match: se insertan filas en `emprendedor_subcategorias` y se actualiza `subcategoria_principal_id` y `classification_status = 'automatica'`.  
   - Si no hay match: `classification_status = 'pendiente_revision'`, `classification_review_required = true` y se inserta/actualiza una fila en `clasificacion_pendiente`.

3. **Revisión humana**  
   - Se consulta `clasificacion_pendiente` (status = pendiente / en_revision).  
   - El revisor asigna o corrige subcategoría en `emprendedores` y en `emprendedor_subcategorias`.  
   - Se inserta un registro en `clasificacion_feedback_log` (action, old/new subcategoria, reviewed_by, notes).  
   - Se actualiza o elimina la fila en `clasificacion_pendiente` (status = resuelto, resuelto_at).  
   - En `emprendedores`: `classification_status = 'corregida_manual'`, `classification_review_required = false`.

4. **Alimentar el mapeo**  
   - A partir de `clasificacion_feedback_log` (correcciones) se pueden proponer nuevas filas en `keyword_to_subcategory_map` para mejorar la IA.

---

## 5. Compatibilidad con columnas ya existentes

Si en `emprendedores` ya tienes:

- `estado_clasificacion` → puedes mantenerla y sincronizarla con `classification_status`, o dejar de usarla y usar solo `classification_status`.
- `keywords_usuario` (text[]) → la migración añade `keywords_usuario_json` (jsonb); puedes rellenar `keywords_usuario_json` con `to_jsonb(keywords_usuario)` en una actualización única y luego deprecar `keywords_usuario`.
- `clasificacion_confianza` → equivalente a `classification_confidence`; mismo criterio de migración o alias.

La migración `20260326000000_motor_clasificacion_ia_completo.sql` solo añade columnas con `ADD COLUMN IF NOT EXISTS`, por lo que no borra ni renombra columnas existentes.
