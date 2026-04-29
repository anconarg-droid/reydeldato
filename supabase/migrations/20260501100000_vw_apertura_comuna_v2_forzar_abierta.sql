-- =============================================================================
-- vw_apertura_comuna_v2: mismos porcentajes / abierta por mínimos (rubros).
-- Añade forzar_abierta (desde comunas) y comuna_abierta = override OR mínimos
-- OR porcentaje_apertura >= 100 (paridad con lib/comunaPublicaAbierta.ts).
-- =============================================================================

DROP FUNCTION IF EXISTS public.contar_apertura_real_por_comuna(text);

DROP VIEW IF EXISTS public.vw_apertura_comuna_v2;

CREATE VIEW public.vw_apertura_comuna_v2 AS
WITH meta_rubros AS (
  SELECT COUNT(*)::int AS total_requerido
  FROM public.rubros_apertura
  WHERE activo = true
),
base AS (
  SELECT
    c.slug::text AS comuna_slug,
    c.nombre::text AS comuna_nombre,
    COALESCE(c.forzar_abierta, false) AS forzar_abierta,
    m.total_requerido,
    COALESCE(r.rubros_cumplidos, 0)::int AS total_cumplido,
    CASE
      WHEN m.total_requerido <= 0 THEN 0::numeric
      ELSE LEAST(
        100::numeric,
        ROUND(
          (COALESCE(r.rubros_cumplidos, 0)::numeric / m.total_requerido::numeric) * 100,
          1
        )
      )
    END AS porcentaje_apertura,
    (
      m.total_requerido > 0
      AND COALESCE(r.rubros_cumplidos, 0) >= m.total_requerido
    ) AS abierta
  FROM public.comunas c
  CROSS JOIN meta_rubros m
  LEFT JOIN LATERAL (
    SELECT COUNT(*)::int AS rubros_cumplidos
    FROM public.contar_grupos_apertura_por_comuna(c.id) x
    WHERE x.faltantes = 0
  ) r ON true
)
SELECT
  comuna_slug,
  comuna_nombre,
  total_requerido,
  total_cumplido,
  porcentaje_apertura,
  abierta,
  forzar_abierta,
  (
    forzar_abierta
    OR abierta
    OR porcentaje_apertura >= 100::numeric
  ) AS comuna_abierta
FROM base;

COMMENT ON VIEW public.vw_apertura_comuna_v2 IS
  'Apertura por comuna: total_cumplido / total_requerido por rubros_apertura activos; abierta = mínimos cumplidos; forzar_abierta y comuna_abierta incluyen override en comunas (pruebas).';

GRANT SELECT ON public.vw_apertura_comuna_v2 TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.contar_apertura_real_por_comuna(p_comuna_slug text)
RETURNS TABLE (
  comuna_slug text,
  total_rubros_meta int,
  rubros_cumplidos int,
  porcentaje_apertura numeric,
  abierta boolean,
  forzar_abierta boolean,
  comuna_abierta boolean
)
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT
    v.comuna_slug,
    v.total_requerido AS total_rubros_meta,
    v.total_cumplido AS rubros_cumplidos,
    v.porcentaje_apertura,
    v.abierta,
    v.forzar_abierta,
    v.comuna_abierta
  FROM public.vw_apertura_comuna_v2 v
  WHERE lower(btrim(v.comuna_slug)) = lower(btrim(p_comuna_slug))
  LIMIT 1;
$$;

COMMENT ON FUNCTION public.contar_apertura_real_por_comuna(text) IS
  'Resumen de apertura por slug: mismos números que vw_apertura_comuna_v2 (incl. forzar_abierta y comuna_abierta).';

GRANT EXECUTE ON FUNCTION public.contar_apertura_real_por_comuna(text) TO anon;
GRANT EXECUTE ON FUNCTION public.contar_apertura_real_por_comuna(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.contar_apertura_real_por_comuna(text) TO service_role;

-- Prueba: forzar apertura en esta comuna (revertir con UPDATE forzar_abierta = false si hace falta).
UPDATE public.comunas
SET forzar_abierta = true
WHERE slug = 'calera-de-tango';
