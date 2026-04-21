-- RPC usado por GET /api/buscar (?comuna=slug). Reemplaza execute_sql con consulta parametrizada.

-- Postgres no permite cambiar RETURNS TABLE vía CREATE OR REPLACE si la función ya existe
-- con otra definición de columnas OUT. Dropeamos primero para evitar 42P13.
DROP FUNCTION IF EXISTS public.buscar_emprendedores_por_comuna(text);

CREATE OR REPLACE FUNCTION public.buscar_emprendedores_por_comuna(p_comuna_slug text)
RETURNS TABLE (
  id uuid,
  nombre_emprendimiento text,
  slug text,
  comuna_id bigint,
  cobertura_tipo text,
  prioridad integer
)
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  WITH comuna_target AS (
    SELECT
      c.id AS comuna_id,
      c.slug AS comuna_slug,
      r.slug AS region_slug
    FROM public.comunas c
    JOIN public.regiones r ON r.id = c.region_id
    WHERE c.slug = p_comuna_slug
  )
  SELECT
    e.id,
    e.nombre_emprendimiento,
    e.slug,
    e.comuna_id,
    e.cobertura_tipo::text AS cobertura_tipo,
    (
      CASE
        WHEN e.comuna_id = ct.comuna_id AND e.cobertura_tipo = 'solo_comuna' THEN 1
        WHEN e.comuna_id = ct.comuna_id AND e.cobertura_tipo = 'varias_comunas' THEN 2
        WHEN e.comuna_id = ct.comuna_id AND e.cobertura_tipo = 'varias_regiones' THEN 3
        WHEN e.comuna_id = ct.comuna_id AND e.cobertura_tipo = 'nacional' THEN 4
        WHEN e.cobertura_tipo = 'varias_comunas'
          AND ct.comuna_slug = ANY (e.comunas_cobertura) THEN 5
        WHEN e.cobertura_tipo = 'varias_regiones'
          AND ct.region_slug = ANY (e.regiones_cobertura) THEN 6
        WHEN e.cobertura_tipo = 'nacional' THEN 7
        ELSE 8
      END
    )::integer AS prioridad
  FROM public.emprendedores e
  CROSS JOIN comuna_target ct
  ORDER BY prioridad ASC, random();
$$;

COMMENT ON FUNCTION public.buscar_emprendedores_por_comuna(text) IS
  'Lista emprendedores visibles para una comuna (slug), con prioridad de cobertura; usado por /api/buscar.';

GRANT EXECUTE ON FUNCTION public.buscar_emprendedores_por_comuna(text) TO anon, authenticated, service_role;
