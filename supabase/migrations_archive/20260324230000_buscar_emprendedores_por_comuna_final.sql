-- RPC final: buscar emprendedores por comuna con búsqueda opcional.
-- Deja una única firma: buscar_emprendedores_por_comuna(text, text).

DROP FUNCTION IF EXISTS public.buscar_emprendedores_por_comuna(text);
DROP FUNCTION IF EXISTS public.buscar_emprendedores_por_comuna(text, text);

CREATE OR REPLACE FUNCTION public.buscar_emprendedores_por_comuna(
  p_comuna_slug text,
  p_q text default null
)
RETURNS TABLE (
  id uuid,
  nombre_emprendimiento text,
  slug text,
  comuna_id int,
  comuna_slug text,
  comuna_nombre text,
  cobertura_tipo text,
  frase_negocio text,
  foto_principal_url text,
  whatsapp_principal text,
  tipo_ficha text,
  prioridad int,
  bloque_visible text
)
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  WITH comuna_target AS (
    SELECT
      c.id AS comuna_id,
      c.slug AS comuna_slug,
      c.nombre AS comuna_nombre,
      r.slug AS region_slug
    FROM public.comunas c
    JOIN public.regiones r ON r.id = c.region_id
    WHERE c.slug = p_comuna_slug
  ),
  base AS (
    SELECT
      e.id,
      e.nombre_emprendimiento,
      e.slug,
      e.comuna_id::int AS comuna_id,
      cb.slug AS comuna_slug,
      cb.nombre AS comuna_nombre,
      e.cobertura_tipo::text AS cobertura_tipo,
      e.frase_negocio,
      e.foto_principal_url,
      e.whatsapp_principal,
      CASE
        WHEN COALESCE(e.plan_activo, false) IS TRUE THEN 'completa'
        WHEN e.plan_expira_at IS NOT NULL AND e.plan_expira_at > now() THEN 'completa'
        WHEN e.trial_expira_at IS NOT NULL AND e.trial_expira_at > now() THEN 'completa'
        WHEN e.trial_expira IS NOT NULL AND e.trial_expira > now() THEN 'completa'
        ELSE 'basica'
      END AS tipo_ficha,
      CASE
        WHEN e.comuna_id = ct.comuna_id AND e.cobertura_tipo = 'solo_comuna' THEN 1
        WHEN e.comuna_id = ct.comuna_id AND e.cobertura_tipo = 'varias_comunas' THEN 2
        WHEN e.comuna_id = ct.comuna_id AND e.cobertura_tipo = 'varias_regiones' THEN 3
        WHEN e.comuna_id = ct.comuna_id AND e.cobertura_tipo = 'nacional' THEN 4

        WHEN e.cobertura_tipo = 'varias_comunas'
          AND ct.comuna_slug = ANY (COALESCE(e.comunas_cobertura, '{}'::text[])) THEN 5

        WHEN e.cobertura_tipo = 'varias_regiones'
          AND ct.region_slug = ANY (COALESCE(e.regiones_cobertura, '{}'::text[])) THEN 6

        WHEN e.cobertura_tipo = 'nacional' THEN 7
        ELSE 8
      END AS prioridad
    FROM public.emprendedores e
    JOIN public.comunas cb ON cb.id = e.comuna_id
    CROSS JOIN comuna_target ct
    WHERE
      p_q IS NULL
      OR p_q = ''
      OR LOWER(COALESCE(e.nombre_emprendimiento, '')) LIKE '%' || LOWER(p_q) || '%'
      OR LOWER(COALESCE(e.frase_negocio, '')) LIKE '%' || LOWER(p_q) || '%'
  )
  SELECT
    b.id,
    b.nombre_emprendimiento,
    b.slug,
    b.comuna_id,
    b.comuna_slug,
    b.comuna_nombre,
    b.cobertura_tipo,
    b.frase_negocio,
    b.foto_principal_url,
    b.whatsapp_principal,
    b.tipo_ficha,
    b.prioridad,
    CASE
      WHEN p_q IS NOT NULL AND p_q <> '' AND b.prioridad BETWEEN 1 AND 4 THEN 'de_tu_comuna'
      WHEN p_q IS NOT NULL AND p_q <> '' AND b.prioridad BETWEEN 5 AND 7 THEN 'atienden_tu_comuna'
      ELSE 'lista_general'
    END AS bloque_visible
  FROM base b
  WHERE b.prioridad < 8
  ORDER BY
    CASE
      WHEN p_q IS NOT NULL AND p_q <> '' AND b.prioridad BETWEEN 1 AND 4 THEN 1
      WHEN p_q IS NOT NULL AND p_q <> '' AND b.prioridad BETWEEN 5 AND 7 THEN 2
      ELSE 1
    END,
    b.prioridad ASC,
    md5(
      COALESCE(b.id::text, '') ||
      floor(extract(epoch from now()) / 300)::text
    );
$$;

COMMENT ON FUNCTION public.buscar_emprendedores_por_comuna(text, text) IS
  'RPC final del buscador: lista emprendedores por comuna con búsqueda opcional (p_q), prioridad y bloque_visible.';

GRANT EXECUTE ON FUNCTION public.buscar_emprendedores_por_comuna(text, text) TO anon, authenticated, service_role;
