# Estructura de datos: captura y clasificación automática de emprendimientos

Objetivo: el emprendedor no elige categoría ni subcategoría. Solo describe su negocio y opcionalmente ingresa palabras clave. La taxonomía es interna; la clasificación la hace el sistema (IA + mapeo) y la moderación puede corregir después.

---

## 1. Flujo de captura (formulario)

- **Campos básicos**: nombre, contacto, ubicación, cobertura, modalidades, fotos (sin cambios).
- **Campo principal**: “Describe qué hace tu emprendimiento” → texto libre completo.
- **Campo opcional**: “Palabras clave de tu negocio” → máximo 10 términos.

No se pide categoría ni subcategoría en el formulario.

---

## 2. Estructura de datos en `emprendedores`

### 2.1 Texto libre y keywords

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `descripcion_negocio` | `text` | Texto libre completo enviado por el usuario (“Describe qué hace tu emprendimiento”). Fuente principal para la IA. |
| `keywords_usuario` | `text[]` | Palabras clave ingresadas por el usuario (máximo 10). |
| `keywords_ia` | `text[]` | Keywords detectadas por la IA a partir del texto + keywords usuario. |
| `keywords` | `text[]` | Combinación final para búsqueda: usuario + IA (deduplicado). |

- **Derivación**: si no se envía `descripcion_corta`, se puede derivar de los primeros 160 caracteres de `descripcion_negocio` para tarjetas y resultados.

### 2.2 Clasificación (taxonomía interna)

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `categoria_principal_id` | `uuid` (FK categorias) | Asignado por IA o por corrección manual. |
| `subcategoria_principal_id` | `uuid` (FK subcategorias) | Asignado por IA o por corrección manual. |

(Se mantienen también `categoria_id` / `subcategoria_principal_id` si ya existen en el modelo.)

### 2.3 Estado de clasificación y revisión

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `estado_clasificacion` | `text` | `'automatica'` \| `'pendiente_revision'` \| `'corregida_manual'`. |
| `motivo_revision_manual` | `text` (nullable) | Motivo cuando requiere o tuvo revisión: ej. “Sin match suficiente en clasificación automática”, “Rubro corregido por moderación”. |

- **`automatica`**: la IA asignó al menos una subcategoría con confianza aceptable.
- **`pendiente_revision`**: la IA no encontró match suficiente; un humano debe asignar categoría/subcategoría.
- **`corregida_manual`**: un moderador corrigió categoría o subcategoría.

### 2.4 Trazabilidad IA (existentes)

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `ai_raw_classification_json` | `jsonb` | Respuesta completa de la IA (tipo_actividad, sector_slug, tags_slugs, keywords, confianza, etc.). |
| `ai_keywords_json` | `jsonb` | Keywords y confianza usadas para el mapeo (ej. `{ "keywords": [], "confianza": 0.85 }`). |

### 2.5 Publicación y moderación

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `estado_publicacion` | `text` | `'publicado'` \| `'en_revision'`. |
| `motivo_verificacion` | `text` (nullable) | Motivo cuando la ficha está en revisión (`estado_publicacion = 'en_revision'`) (ej. rubro regulado o “Clasificación automática sin match suficiente”). |

Regla: si no hay match suficiente de clasificación, se debe dejar `estado_publicacion = 'en_revision'` y no publicar hasta revisión.

---

## 3. Proceso interno (backend)

1. **Entrada**: `descripcion_negocio` (requerido) + `keywords_usuario` (opcional, máx 10).
2. **Texto para IA**: `descripcion_negocio + " " + keywords_usuario.join(" ")`.
3. **IA**: detectar tipo_actividad, sector_slug, tags_slugs, keywords, confianza.
4. **Combinar**: `keywords_final = unique(keywords_usuario + keywords_ia)`.
5. **Mapear**: keywords → subcategorías (keyword_to_subcategory_map + similitud slug/nombre).
6. **Decisión**:
   - Si hay al menos una subcategoría con score aceptable → asignar `categoria_principal_id` y `subcategoria_principal_id`, `estado_clasificacion = 'automatica'`. Publicación según reglas existentes (ej. rubros regulados → `en_revision`).
   - Si no hay match suficiente → no asignar categoría/subcategoría; `estado_publicacion = 'en_revision'`, `motivo_verificacion` y `motivo_revision_manual` descriptivos; `estado_clasificacion = 'pendiente_revision'`. Guardar igualmente trazabilidad (IA + keywords).
7. **Moderación**: el panel puede actualizar `categoria_principal_id`, `subcategoria_principal_id` y poner `estado_clasificacion = 'corregida_manual'`, `motivo_revision_manual` opcional.

---

## 4. Resumen de columnas nuevas sugeridas

```sql
-- En tabla public.emprendedores (ejemplo):

ALTER TABLE public.emprendedores
  ADD COLUMN IF NOT EXISTS descripcion_negocio text,
  ADD COLUMN IF NOT EXISTS keywords_usuario text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS keywords_ia text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS estado_clasificacion text DEFAULT 'pendiente_revision',
  ADD COLUMN IF NOT EXISTS motivo_revision_manual text;

COMMENT ON COLUMN public.emprendedores.descripcion_negocio IS 'Texto libre: describe qué hace el emprendimiento (fuente para IA).';
COMMENT ON COLUMN public.emprendedores.keywords_usuario IS 'Palabras clave ingresadas por el usuario (máx 10).';
COMMENT ON COLUMN public.emprendedores.keywords_ia IS 'Keywords detectadas por la IA.';
COMMENT ON COLUMN public.emprendedores.estado_clasificacion IS 'automatica | pendiente_revision | corregida_manual';
COMMENT ON COLUMN public.emprendedores.motivo_revision_manual IS 'Motivo cuando se requiere o se hizo revisión manual de categoría/subcategoría.';
```

---

## 5. Prioridad de negocio

- No obligar al usuario a navegar categorías ni subcategorías.
- No dejar fuera negocios raros o nuevos: si la IA no clasifica, se guarda con `pendiente_revision` y un humano asigna después.
- La taxonomía es interna; la captura es simple y flexible (texto + hasta 10 palabras clave).
