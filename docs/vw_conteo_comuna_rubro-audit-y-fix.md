# Auditoría y corrección de `public.vw_conteo_comuna_rubro`

## A. Definición actual (según migración 20260317)

```sql
CREATE OR REPLACE VIEW public.vw_conteo_comuna_rubro AS
SELECT
  c.id          AS comuna_id,
  c.slug        AS comuna_slug,
  c.nombre      AS comuna_nombre,
  r.nombre      AS region_nombre,
  s.slug        AS subcategoria_slug,
  COUNT(*)::bigint AS total_registrados
FROM emprendedores e
JOIN emprendedor_subcategorias es ON es.emprendedor_id = e.id
JOIN subcategorias s             ON s.id = es.subcategoria_id
JOIN comunas c                   ON c.id = e.comuna_base_id
JOIN regiones r                  ON r.id = c.region_id
WHERE e.estado_publicacion = 'publicado'
  AND COALESCE(e.activo, true) = true
GROUP BY c.id, c.slug, c.nombre, r.nombre, s.slug;
```

---

## B. Diagnóstico exacto del error

1. **Resultado erróneo:** una sola fila para Talagante con `total_registrados = 7` y `subcategoria_slug = NULL`. Eso indica que en la base está desplegada **otra definición de la vista**, no la de la migración anterior.

2. **Causa probable:** una versión antigua de la vista que:
   - Agrupa solo por comuna (sin `s.slug` en el `GROUP BY`), o
   - No hace `JOIN` con `emprendedor_subcategorias` / `subcategorias`, o
   - Hace un `SELECT`/agregación que no incluye `subcategoria_slug` (o lo deja fuera del `GROUP BY`), y el motor devuelve NULL para ese atributo.

3. **Riesgo adicional:** la columna `e.activo` **no existe** en tu tabla `emprendedores` (según tu CSV). Si la vista actual sí usa `COALESCE(e.activo, true)`, al consultarla puede fallar o haberse creado con una definición que omitió esa parte, dejando una vista que solo agrupa por comuna.

4. **Resumen:** la vista en BD no refleja la lógica “una fila por (comuna, subcategoría)” desde `emprendedor_subcategorias` y `subcategorias`, por eso ves un solo total por comuna y `subcategoria_slug = NULL`.

---

## C. SQL corregido de la vista

- Se parte de `public.emprendedor_subcategorias` y se hace `JOIN` a `emprendedores`, `subcategorias`, `comunas` y `regiones`.
- Solo se cuentan emprendimientos con `estado_publicacion = 'publicado'`.
- Se elimina el filtro por `e.activo` para que funcione en esquemas donde esa columna no existe.
- Se agrupa por comuna y por `subcategoria_slug` para que cada fila sea un (comuna, subcategoría) con su conteo.

Ejecutar en Supabase:

**Opción 1 — CREATE OR REPLACE** (incluye `region_id` para no quitar columnas; si da "cannot drop columns", usa Opción 2):

```sql
CREATE OR REPLACE VIEW public.vw_conteo_comuna_rubro AS
SELECT
  c.id          AS comuna_id,
  c.slug        AS comuna_slug,
  c.nombre      AS comuna_nombre,
  r.id          AS region_id,
  r.nombre      AS region_nombre,
  s.slug        AS subcategoria_slug,
  COUNT(*)::bigint AS total_registrados
FROM public.emprendedor_subcategorias es
JOIN public.emprendedores e   ON e.id = es.emprendedor_id
JOIN public.subcategorias s   ON s.id = es.subcategoria_id
JOIN public.comunas c         ON c.id = e.comuna_base_id
JOIN public.regiones r        ON r.id = c.region_id
WHERE e.estado_publicacion = 'publicado'
GROUP BY c.id, c.slug, c.nombre, r.id, r.nombre, s.slug;

COMMENT ON VIEW public.vw_conteo_comuna_rubro IS 'Conteo de emprendimientos publicados por comuna y subcategoría (desde emprendedor_subcategorias).';
```

**Opción 2 — Si sigue "cannot drop columns":** borrar la vista y recrearla (y las que dependen). Ejecutar primero los `DROP` y luego el contenido de la migración `20260317_vistas_apertura_comunas.sql`:

```sql
DROP VIEW IF EXISTS public.vw_comunas_por_abrir;
DROP VIEW IF EXISTS public.vw_conteo_comuna_rubro_contado;
DROP VIEW IF EXISTS public.vw_conteo_comuna_rubro;
```

---

## D. Consulta de validación (Talagante y panadería)

Ejecutar después de aplicar la vista corregida:

```sql
SELECT *
FROM public.vw_conteo_comuna_rubro
WHERE comuna_slug = 'talagante'
ORDER BY subcategoria_slug;
```

Debe aparecer al menos una fila con:
- `comuna_slug` = `talagante`
- `subcategoria_slug` = `panaderia`
- `total_registrados` ≥ 1 (incluyendo “Panadería de prueba”).

Si hay más subcategorías en Talagante, cada una debe ser una fila distinta con su `subcategoria_slug` no nulo.
