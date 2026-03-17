-- =============================================================================
-- Diagnóstico: Hero 7 registrados vs Rubros todos 0 en Maipú
-- Ejecutar en Supabase SQL Editor para verificar fuentes y relaciones.
-- =============================================================================

-- 1) ID de la comuna Maipú (ajusta el slug si en tu BD es distinto, ej. 'maipú')
DO $$
DECLARE
  v_comuna_id uuid;
  v_comuna_slug text;
  v_total_hero_tabla int;
  v_total_vista int;
  v_total_raw int;
  v_con_subcategoria int;
  v_sin_subcategoria int;
BEGIN
  SELECT id, slug INTO v_comuna_id, v_comuna_slug
  FROM public.comunas
  WHERE LOWER(TRIM(slug)) IN ('maipu', 'maipú')
  LIMIT 1;

  IF v_comuna_id IS NULL THEN
    RAISE NOTICE 'No se encontró comuna Maipú. Revisa el slug en la tabla comunas.';
    RETURN;
  END IF;

  RAISE NOTICE 'Comuna: % (id: %)', v_comuna_slug, v_comuna_id;

  -- A. Total que usa el HERO (tabla comunas)
  SELECT COALESCE(emprendimientos_registrados, 0)::int INTO v_total_hero_tabla
  FROM public.comunas WHERE id = v_comuna_id;
  RAISE NOTICE 'A. HERO - comunas.emprendimientos_registrados: %', v_total_hero_tabla;

  -- A. Alternativa: vista vw_comunas_por_abrir
  SELECT COALESCE(total_emprendedores, 0)::int INTO v_total_vista
  FROM public.vw_comunas_por_abrir WHERE comuna_slug = (SELECT slug FROM public.comunas WHERE id = v_comuna_id);
  RAISE NOTICE 'A. HERO (alternativa) - vw_comunas_por_abrir.total_emprendedores: %', v_total_vista;

  -- Total raw: emprendedores publicados con comuna_base = esta comuna
  SELECT COUNT(*)::int INTO v_total_raw
  FROM public.emprendedores
  WHERE comuna_base_id = v_comuna_id AND estado_publicacion = 'publicado';
  RAISE NOTICE 'Total emprendimientos en comuna (raw): %', v_total_raw;

  -- Cuántos tienen al menos una subcategoría (tabla intermedia emprendedor_subcategorias)
  SELECT COUNT(DISTINCT e.id)::int INTO v_con_subcategoria
  FROM public.emprendedores e
  WHERE e.comuna_base_id = v_comuna_id AND e.estado_publicacion = 'publicado'
    AND EXISTS (SELECT 1 FROM public.emprendedor_subcategorias es WHERE es.emprendedor_id = e.id);
  v_sin_subcategoria := v_total_raw - v_con_subcategoria;

  RAISE NOTICE 'Con subcategoría asignada (aparecen en rubros): %', v_con_subcategoria;
  RAISE NOTICE 'Sin subcategoría (no aparecen en vw_conteo_comuna_rubro): %', v_sin_subcategoria;
END $$;

-- 2) Listado: emprendimientos de Maipú y si tienen subcategoría
SELECT
  e.id AS emprendedor_id,
  e.nombre AS emprendimiento_nombre,
  e.slug,
  (SELECT COUNT(*) FROM public.emprendedor_subcategorias es WHERE es.emprendedor_id = e.id) AS num_subcategorias,
  (
    SELECT string_agg(s.slug || ' (' || s.nombre || ')', ', ')
    FROM public.emprendedor_subcategorias es
    JOIN public.subcategorias s ON s.id = es.subcategoria_id
    WHERE es.emprendedor_id = e.id
  ) AS subcategorias_asignadas
FROM public.emprendedores e
WHERE e.comuna_base_id = (SELECT id FROM public.comunas WHERE LOWER(TRIM(slug)) IN ('maipu', 'maipú') LIMIT 1)
  AND e.estado_publicacion = 'publicado'
ORDER BY num_subcategorias DESC, e.nombre;

-- 3) Qué devuelve la vista de rubros para Maipú (B. Bloque rubros)
SELECT comuna_slug, subcategoria_slug, subcategoria_nombre, objetivo, registrados, faltan
FROM public.vw_apertura_rubros_comuna
WHERE comuna_slug = (SELECT slug FROM public.comunas WHERE LOWER(TRIM(slug)) IN ('maipu', 'maipú') LIMIT 1)
ORDER BY subcategoria_slug
LIMIT 20;

-- 4) Qué devuelve vw_conteo_comuna_rubro para Maipú (origen de registrados por rubro)
SELECT comuna_slug, subcategoria_slug, total_registrados
FROM public.vw_conteo_comuna_rubro
WHERE comuna_slug = (SELECT slug FROM public.comunas WHERE LOWER(TRIM(slug)) IN ('maipu', 'maipú') LIMIT 1)
ORDER BY subcategoria_slug;
