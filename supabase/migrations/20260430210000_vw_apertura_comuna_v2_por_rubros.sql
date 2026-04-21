-- =============================================================================
-- vw_apertura_comuna_v2: apertura por comuna = TODOS los rubros activos en
-- rubros_apertura cumplen su mínimo (contar_grupos_apertura_por_comuna.faltantes = 0).
--
-- Reemplaza la definición anterior basada en count_emprendedores_abrir_comuna_activacion
-- + meta numérica global (meta_apertura_comuna), que podía marcar una comuna como
-- "100%" con mucha oferta sin cubrir los 15 rubros obligatorios.
--
-- Columnas (mismo contrato que antes):
--   total_requerido = cantidad de filas activas en rubros_apertura
--   total_cumplido  = rubros con mínimo cumplido (faltantes = 0)
--   porcentaje_apertura = (total_cumplido / total_requerido) * 100
--   abierta = total_cumplido >= total_requerido (y total_requerido > 0)
--
-- Nota: CREATE OR REPLACE VIEW no sirve si cambia el conjunto de columnas; se usa
-- DROP VIEW + CREATE VIEW.
-- =============================================================================

-- Depende de vw_apertura_comuna_v2; debe ir antes del DROP VIEW.
DROP FUNCTION IF EXISTS public.contar_apertura_real_por_comuna(text);

DROP VIEW IF EXISTS public.vw_apertura_comuna_v2;

CREATE VIEW public.vw_apertura_comuna_v2 AS
WITH meta_rubros AS (
  SELECT COUNT(*)::int AS total_requerido
  FROM public.rubros_apertura
  WHERE activo = true
)
SELECT
  c.slug::text AS comuna_slug,
  c.nombre::text AS comuna_nombre,
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
) r ON true;

COMMENT ON VIEW public.vw_apertura_comuna_v2 IS
  'Apertura por comuna: total_cumplido = rubros_apertura activos con mínimo territorial cumplido; total_requerido = cantidad de rubros activos; abierta solo si todos cumplen.';

-- -----------------------------------------------------------------------------
-- Alias explícito para diagnósticos y paridad con llamadas en SQL (p. ej. Maipú).
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.contar_apertura_real_por_comuna(p_comuna_slug text)
RETURNS TABLE (
  comuna_slug text,
  total_rubros_meta int,
  rubros_cumplidos int,
  porcentaje_apertura numeric,
  abierta boolean
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
    v.abierta
  FROM public.vw_apertura_comuna_v2 v
  WHERE lower(btrim(v.comuna_slug)) = lower(btrim(p_comuna_slug))
  LIMIT 1;
$$;

COMMENT ON FUNCTION public.contar_apertura_real_por_comuna(text) IS
  'Resumen de apertura real por slug: mismos números que vw_apertura_comuna_v2 (rubros cumplidos / rubros requeridos).';

GRANT EXECUTE ON FUNCTION public.contar_apertura_real_por_comuna(text) TO anon;
GRANT EXECUTE ON FUNCTION public.contar_apertura_real_por_comuna(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.contar_apertura_real_por_comuna(text) TO service_role;
