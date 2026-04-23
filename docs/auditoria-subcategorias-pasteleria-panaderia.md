## Auditoría: subcategorías Pastelería vs Panadería

### Contexto y problema detectado
- **Problema**: existen registros publicados con `subcategoria_slug_final = 'panaderia'` que por **nombre/frase/descripcion** parecen claramente **pastelería**. Esto contamina:
  - **búsqueda global** (exactos vs relacionados)
  - **similares** (tier por subcategoría)
  - **percepción de ranking** (el usuario ve el rubro incorrecto como “principal”)
- **Regla oficial** (producto):
  1. **categoría** = navegación amplia
  2. **subcategoría principal** = `subcategoria_slug_final` (servicio principal)
  3. **tags** = especialidades / problemas / productos específicos (refuerzo; nunca fuente principal)

### Alcance de esta auditoría
- **No** crear migraciones ni cambios estructurales de BD.
- **No** tocar Algolia en esta etapa.
- Cambios buscados: **pequeños, auditables, paso a paso**.
- Aquí solo se documenta diagnóstico + plan + SQL de auditoría/corrección controlada.

---

## Puntos del código auditados (rutas y funciones)

### Ficha pública
- **`app/emprendedor/[slug]/page.tsx`**
  - **Uso esperado**: `subcategoria_slug_final` como fuente única para rubro principal (título/subtítulo/contexto).
  - **Riesgo**: bajo (ya alineado).

### Similares (motor v2 en ficha pública)
- **`lib/getSimilaresFicha.ts`**
  - **Qué hace**: buckets por cercanía (comuna → cobertura → región → nacional) y fallback por categoría.
  - **Riesgo**: medio si el label de card depende de arrays desordenados (debe priorizar `subcategoria_slug_final`).

### Similares (API legacy)
- **`lib/getSimilaresBySlug.ts`**
  - **Qué hace**: similares por tiers; históricamente tomaba “principal” desde arrays (`subcategorias_*[0]`).
  - **Riesgo**: alto (mezcla “empanadas” u otras secundarias como principal si el array viene sucio/desordenado).

### Búsqueda global /resultados
- **`app/resultados/ResultadosClient.tsx`**
  - **Qué hace**: detecta intención exacta por subcategoría (ej. `pasteleria`) y separa resultados **exactos vs relacionados** en el render.
  - **Riesgo**: medio. El split es correcto, pero si los datos están sucios (pastelería guardada como panadería), el grupo “exactos” reflejará ese error.

### Mapper desde `vw_emprendedores_publico` a `BuscarApiItem`
- **`lib/mapVwEmprendedorPublicoToBuscarApiItem.ts`**
  - **Qué hace**: arma `subcategoriasSlugs` y `subcategoriasNombres` para cards.
  - **Riesgo**: medio si el orden de subcategorías no garantiza principal primero (blindaje recomendado: `[subcategoria_slug_final, ...rest]`).

### Loader ficha pública (contrato de datos)
- **`lib/getEmprendedorPublicoBySlug.ts`**
  - **Qué hace**: expone `subcategoria_slug_final`, pero también campos legacy `subcategoria_principal_*`.
  - **Riesgo**: medio si `subcategoria_principal_*` se deriva desde arrays `[0]` (puede reintroducir confusiones en UI/consumidores).

---

## Riesgos encontrados (resumen)
- **R1 (alto)**: cualquier uso de `subcategorias_slugs[0]` o `subcategorias_nombres_arr[0]` como “principal”.
- **R2 (medio)**: `subcategoriasSlugs` sin orden estable puede confundir UIs legacy que miran `[0]`.
- **R3 (medio)**: búsqueda global por texto (`ILIKE`) puede traer matches de categoría/texto que “parecen” pastelería/panadería; debe ser solo apoyo, no equivalencia principal.
- **R4 (dato sucio)**: si `subcategoria_slug_final` está mal, el producto se “porta bien” pero muestra resultados incorrectos por la fuente de verdad.

---

## Cambios propuestos (mínimos y seguros)

### Blindaje de producto (sin tocar BD estructuralmente)
- **A) Similares**: asegurar regla obligatoria
  1) misma `subcategoria_slug_final`
  2) misma comuna / atienden la misma comuna
  3) misma categoría solo como fallback tardío
  4) tags solo como refuerzo secundario (copy), nunca filtro principal

- **B) Mappers/Loaders**:
  - Asegurar que cualquier “principal” expuesto o consumido provenga de `subcategoria_slug_final`.
  - Si se entrega un array de subcategorías, asegurar que la **principal vaya primero**.

### Corrección controlada de datos (sin migraciones)
- Aplicar un UPDATE controlado y revisable para cambiar `subcategoria_slug_final` de `panaderia` → `pasteleria` en los casos donde el texto lo indica fuertemente.
- Si la señal es débil (p. ej. solo “repostería”), no cambiar subcategoría; solo considerar tag (si se decide hacerlo en otra etapa).

---

## SQL de auditoría y corrección controlada (no ejecutar aquí)

### 1) SELECT de auditoría (candidatos)
```sql
SELECT
  e.id,
  e.nombre_emprendimiento,
  e.frase_negocio,
  e.descripcion_libre,
  e.subcategoria_slug_final,
  e.tags_slugs,
  e.estado_publicacion,
  CASE
    WHEN (COALESCE(e.nombre_emprendimiento,'') || ' ' || COALESCE(e.frase_negocio,'') || ' ' || COALESCE(e.descripcion_libre,'')) ~* '\m(pasteler(i|í)a|tortas?|queques?|cupcakes?|brownies?|alfajores?|kuchen(es)?|cheesecake|macarons?|merengue|ganache|fondant|buttercream|crema\s+pastelera)\M'
      THEN 'cambiar_a_pasteleria'
    WHEN (COALESCE(e.nombre_emprendimiento,'') || ' ' || COALESCE(e.frase_negocio,'') || ' ' || COALESCE(e.descripcion_libre,'')) ~* '\m(reposter(i|í)a)\M'
      THEN 'solo_tag_reposteria'
    ELSE 'ignorar'
  END AS accion_sugerida
FROM public.emprendedores e
WHERE e.subcategoria_slug_final = 'panaderia'
  AND e.estado_publicacion = 'publicado'
  AND (
    (COALESCE(e.nombre_emprendimiento,'') || ' ' || COALESCE(e.frase_negocio,'') || ' ' || COALESCE(e.descripcion_libre,'')) ~* '\m(pasteler(i|í)a|tortas?|queques?|cupcakes?|brownies?|alfajores?|kuchen(es)?|cheesecake|macarons?|merengue|ganache|fondant|buttercream|crema\s+pastelera|reposter(i|í)a)\M'
  )
  AND NOT (
    (COALESCE(e.nombre_emprendimiento,'') || ' ' || COALESCE(e.frase_negocio,'') || ' ' || COALESCE(e.descripcion_libre,'')) ~* '\m(solo\s+pan|pan\s+amasado|marraqueta|hallulla)\M'
  )
ORDER BY e.updated_at DESC NULLS LAST, e.created_at DESC NULLS LAST;
```

### 2) SELECT de previsualización final (antes del cambio)
```sql
WITH base AS (
  SELECT
    e.*,
    (COALESCE(e.nombre_emprendimiento,'') || ' ' || COALESCE(e.frase_negocio,'') || ' ' || COALESCE(e.descripcion_libre,'')) AS blob
  FROM public.emprendedores e
  WHERE e.subcategoria_slug_final = 'panaderia'
    AND e.estado_publicacion = 'publicado'
),
candidatos AS (
  SELECT
    b.id,
    b.nombre_emprendimiento,
    b.frase_negocio,
    b.descripcion_libre,
    b.estado_publicacion,
    b.subcategoria_slug_final AS subcategoria_actual,
    b.tags_slugs             AS tags_actuales,
    CASE
      WHEN b.blob ~* '\m(pasteler(i|í)a|tortas?|queques?|cupcakes?|brownies?|alfajores?|kuchen(es)?|cheesecake|macarons?|merengue|ganache|fondant|buttercream|crema\s+pastelera)\M'
        THEN 'pasteleria'
      ELSE b.subcategoria_slug_final
    END AS subcategoria_nueva,
    CASE
      WHEN b.blob ~* '\m(reposter(i|í)a)\M' THEN 'reposteria'
      WHEN b.blob ~* '\m(pasteler(i|í)a)\M' THEN 'pasteleria'
      ELSE NULL
    END AS tag_a_agregar
  FROM base b
  WHERE b.blob ~* '\m(pasteler(i|í)a|tortas?|queques?|cupcakes?|brownies?|alfajores?|kuchen(es)?|cheesecake|macarons?|merengue|ganache|fondant|buttercream|crema\s+pastelera|reposter(i|í)a)\M'
    AND NOT (b.blob ~* '\m(solo\s+pan|pan\s+amasado|marraqueta|hallulla)\M')
)
SELECT
  c.id,
  c.nombre_emprendimiento,
  c.frase_negocio,
  c.descripcion_libre,
  c.estado_publicacion,
  c.subcategoria_actual,
  c.subcategoria_nueva,
  c.tags_actuales,
  c.tag_a_agregar,
  CASE
    WHEN c.subcategoria_nueva <> c.subcategoria_actual THEN 'cambiar_subcategoria'
    WHEN c.tag_a_agregar IS NOT NULL THEN 'solo_tag'
    ELSE 'sin_cambios'
  END AS accion_final
FROM candidatos c
ORDER BY accion_final, c.nombre_emprendimiento;
```

### 3) UPDATE final (controlado, idempotente; revisar RETURNING)
```sql
BEGIN;

WITH base AS (
  SELECT
    e.id,
    e.subcategoria_slug_final,
    e.tags_slugs,
    (COALESCE(e.nombre_emprendimiento,'') || ' ' || COALESCE(e.frase_negocio,'') || ' ' || COALESCE(e.descripcion_libre,'')) AS blob
  FROM public.emprendedores e
  WHERE e.subcategoria_slug_final = 'panaderia'
    AND e.estado_publicacion = 'publicado'
),
plan AS (
  SELECT
    b.id,
    CASE
      WHEN b.blob ~* '\m(pasteler(i|í)a|tortas?|queques?|cupcakes?|brownies?|alfajores?|kuchen(es)?|cheesecake|macarons?|merengue|ganache|fondant|buttercream|crema\s+pastelera)\M'
        THEN 'pasteleria'
      ELSE b.subcategoria_slug_final
    END AS subcategoria_nueva,
    CASE
      WHEN b.blob ~* '\m(reposter(i|í)a)\M' THEN 'reposteria'
      WHEN b.blob ~* '\m(pasteler(i|í)a)\M' THEN 'pasteleria'
      ELSE NULL
    END AS tag_a_agregar
  FROM base b
  WHERE b.blob ~* '\m(pasteler(i|í)a|tortas?|queques?|cupcakes?|brownies?|alfajores?|kuchen(es)?|cheesecake|macarons?|merengue|ganache|fondant|buttercream|crema\s+pastelera|reposter(i|í)a)\M'
    AND NOT (b.blob ~* '\m(solo\s+pan|pan\s+amasado|marraqueta|hallulla)\M')
),
upd AS (
  UPDATE public.emprendedores e
  SET
    subcategoria_slug_final = p.subcategoria_nueva,
    tags_slugs = CASE
      WHEN p.tag_a_agregar IS NULL THEN e.tags_slugs
      ELSE (
        SELECT COALESCE(ARRAY_AGG(DISTINCT x ORDER BY x), ARRAY[]::text[])
        FROM UNNEST(COALESCE(e.tags_slugs, ARRAY[]::text[]) || ARRAY[p.tag_a_agregar]) u(x)
      )
    END
  FROM plan p
  WHERE e.id = p.id
    AND (
      e.subcategoria_slug_final IS DISTINCT FROM p.subcategoria_nueva
      OR (p.tag_a_agregar IS NOT NULL AND NOT (p.tag_a_agregar = ANY (COALESCE(e.tags_slugs, ARRAY[]::text[]))))
    )
  RETURNING e.id, e.subcategoria_slug_final AS subcategoria_nueva, e.tags_slugs
)
SELECT * FROM upd;

-- COMMIT;
ROLLBACK;
```

---

## Checklist QA (antes/después)
- **Búsqueda global**:
  - Buscar `pasteleria`: bloque “Pastelerías en tu zona” contiene solo exactos; “También podrían servirte” no desplaza exactos.
- **Ficha pastelería**:
  - Título y subtítulo usan `subcategoria_slug_final` (no aparece “empanadas” como principal).
  - Similares tier1: misma subcategoría (no panadería/empanadas como “principal”).
- **Ficha panadería**:
  - No se “convierte” a pastelería por tags o texto libre.
- **Regresión**:
  - Similares sin `subcategoria_slug_final`: cae a `categoria_nombre` (no inventa secundaria).
  - No se degradan tiempos de respuesta perceptibles (los lookups deben mantenerse acotados).

