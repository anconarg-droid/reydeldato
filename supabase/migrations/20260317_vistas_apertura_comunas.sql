-- =============================================================================
-- Segunda etapa: vistas para lógica de apertura de comunas
-- Usa: rubros_apertura, configuracion_sistema (meta_apertura_comuna = 50)
-- =============================================================================

-- -----------------------------------------------------------------------------
-- PASO 1: Vista base — conteo de emprendimientos por comuna + subcategoría
-- Parte de emprendedor_subcategorias; solo publicados; una fila por (comuna, subcategoria).
-- Sin filtro por e.activo para compatibilidad con esquemas donde no existe.
-- -----------------------------------------------------------------------------
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

-- -----------------------------------------------------------------------------
-- PASO 2: Vista intermedia — aplica límite maximo_contable por rubro
-- Cruza con rubros_apertura y capa total_contado.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.vw_conteo_comuna_rubro_contado AS
SELECT
  v.comuna_slug,
  v.subcategoria_slug,
  v.total_registrados,
  ra.maximo_contable,
  LEAST(v.total_registrados, ra.maximo_contable)::int AS total_contado
FROM public.vw_conteo_comuna_rubro v
JOIN public.rubros_apertura ra
  ON ra.subcategoria_slug = v.subcategoria_slug
  AND ra.activo = true;

COMMENT ON VIEW public.vw_conteo_comuna_rubro_contado IS 'Conteo por comuna y rubro de apertura con tope maximo_contable aplicado.';

-- -----------------------------------------------------------------------------
-- PASO 3: Vista final — estado de apertura por comuna
-- Incluye todas las comunas, meta desde configuracion_sistema, rubros_detalle.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.vw_comunas_por_abrir AS
WITH meta_config AS (
  SELECT COALESCE((valor_numero)::int, 50) AS meta_apertura
  FROM public.configuracion_sistema
  WHERE clave = 'meta_apertura_comuna'
  LIMIT 1
),
totales_por_comuna AS (
  SELECT
    comuna_slug,
    SUM(total_contado)::int AS total_contado_apertura
  FROM public.vw_conteo_comuna_rubro_contado
  GROUP BY comuna_slug
),
rubros_por_comuna AS (
  SELECT
    c.slug AS comuna_slug,
    json_agg(
      json_build_object(
        'rubro',       ra.subcategoria_slug,
        'registrados', COALESCE(v.total_registrados, 0),
        'contados',    LEAST(COALESCE(v.total_registrados, 0), ra.maximo_contable)::int,
        'maximo',      ra.maximo_contable
      ) ORDER BY ra.subcategoria_slug
    ) AS rubros_detalle
  FROM comunas c
  CROSS JOIN public.rubros_apertura ra
  LEFT JOIN public.vw_conteo_comuna_rubro v
    ON v.comuna_slug = c.slug
   AND v.subcategoria_slug = ra.subcategoria_slug
  WHERE ra.activo = true
  GROUP BY c.slug
)
SELECT
  c.slug                    AS comuna_slug,
  c.nombre                  AS comuna_nombre,
  r.nombre                  AS region_nombre,
  COALESCE(t.total_contado_apertura, 0)::int AS total_contado_apertura,
  COALESCE(t.total_contado_apertura, 0)::int AS total_emprendedores,  -- alias para compatibilidad con frontend
  mc.meta_apertura          AS meta_apertura,
  GREATEST(mc.meta_apertura - COALESCE(t.total_contado_apertura, 0), 0)::int AS faltan_emprendedores_meta,
  ROUND(
    (COALESCE(t.total_contado_apertura, 0)::numeric / NULLIF(mc.meta_apertura, 0)) * 100,
    1
  )::numeric AS porcentaje_apertura,
  CASE
    WHEN COALESCE(t.total_contado_apertura, 0) >= mc.meta_apertura THEN 'activa'
    WHEN COALESCE(t.total_contado_apertura, 0) > 0                 THEN 'en_apertura'
    ELSE 'sin_cobertura'
  END AS estado_apertura,
  COALESCE(rp.rubros_detalle, '[]'::json) AS rubros_detalle
FROM comunas c
JOIN regiones r ON r.id = c.region_id
CROSS JOIN meta_config mc
LEFT JOIN totales_por_comuna t ON t.comuna_slug = c.slug
LEFT JOIN rubros_por_comuna rp ON rp.comuna_slug = c.slug;

COMMENT ON VIEW public.vw_comunas_por_abrir IS 'Estado de apertura por comuna: total_contado con reglas de rubros_apertura, meta desde configuracion_sistema, estado y rubros_detalle para /cobertura.';

-- =============================================================================
-- Consultas de prueba (ejecutar en Supabase SQL Editor o psql)
-- =============================================================================
-- 1) Conteo por comuna y rubro (base)
-- SELECT * FROM public.vw_conteo_comuna_rubro LIMIT 20;
--
-- 2) Conteo con límite aplicado (intermedia)
-- SELECT * FROM public.vw_conteo_comuna_rubro_contado LIMIT 20;
--
-- 3) Estado de apertura por comuna (vista final)
-- SELECT * FROM public.vw_comunas_por_abrir LIMIT 20;
--
-- 4) Solo comunas en apertura
-- SELECT comuna_slug, comuna_nombre, total_contado_apertura, meta_apertura, porcentaje_apertura, estado_apertura
--   FROM public.vw_comunas_por_abrir
--   WHERE estado_apertura = 'en_apertura'
--   ORDER BY porcentaje_apertura DESC;
