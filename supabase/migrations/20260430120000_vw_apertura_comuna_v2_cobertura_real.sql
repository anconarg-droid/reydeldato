-- =============================================================================
-- vw_apertura_comuna_v2: meta de apertura por comuna alineada con la oferta real.
-- total_cumplido = count_emprendedores_abrir_comuna_activacion (misma función que /abrir-comuna):
--   - comuna_base_id / comuna_id
--   - emprendedor_comunas_cobertura
--   - comunas_cobertura (text[]) cuando cobertura_tipo = varias_comunas
--   - varias_regiones / regional vía emprendedor_regiones_cobertura + región de la comuna
--   - nacional
-- Antes muchos entornos contaban solo comuna_base en la vista → RM regional no sumaba en otras comunas.
-- =============================================================================

CREATE OR REPLACE VIEW public.vw_apertura_comuna_v2 AS
WITH meta_apertura AS (
  SELECT COALESCE(
    (
      SELECT (cs.valor_numero)::int
      FROM public.configuracion_sistema cs
      WHERE cs.clave = 'meta_apertura_comuna'
      LIMIT 1
    ),
    50
  ) AS total_requerido
),
conteo AS (
  SELECT
    c.slug AS comuna_slug,
    c.nombre AS comuna_nombre,
    (SELECT total_requerido FROM meta_apertura) AS total_requerido,
    public.count_emprendedores_abrir_comuna_activacion(
      c.id,
      c.slug,
      COALESCE(r.slug, '')
    )::bigint AS total_cumplido_raw
  FROM public.comunas c
  LEFT JOIN public.regiones r ON r.id = c.region_id
)
SELECT
  comuna_slug,
  comuna_nombre,
  total_requerido,
  total_cumplido_raw::int AS total_cumplido,
  LEAST(
    100::numeric,
    ROUND(
      (total_cumplido_raw::numeric / NULLIF(total_requerido::numeric, 0)) * 100,
      1
    )
  ) AS porcentaje_apertura,
  (total_cumplido_raw >= total_requerido::bigint) AS abierta
FROM conteo;

COMMENT ON VIEW public.vw_apertura_comuna_v2 IS
  'Apertura por comuna: total_cumplido = emprendedores publicados que atienden la comuna (base, cobertura comunas, regional, nacional); meta desde configuracion_sistema meta_apertura_comuna.';
