-- =============================================================================
-- Capa de datos de cobertura: vistas ordenadas por estructura lógica
-- Tablas base: regiones, comunas, categorias, subcategorias, emprendedores,
--             emprendedor_subcategorias, rubros_apertura, configuracion_sistema
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. vw_conteo_comuna_rubro
-- Cuenta emprendimientos publicados por comuna y subcategoría.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.vw_conteo_comuna_rubro AS
SELECT
  c.id              AS comuna_id,
  c.slug            AS comuna_slug,
  c.nombre          AS comuna_nombre,
  r.id              AS region_id,
  r.nombre          AS region_nombre,
  s.slug            AS subcategoria_slug,
  COUNT(*)::bigint  AS total_registrados
FROM public.emprendedor_subcategorias es
JOIN public.emprendedores e   ON e.id = es.emprendedor_id
JOIN public.subcategorias s   ON s.id = es.subcategoria_id
JOIN public.comunas c         ON c.id = e.comuna_base_id
JOIN public.regiones r        ON r.id = c.region_id
WHERE e.estado_publicacion = 'publicado'
GROUP BY c.id, c.slug, c.nombre, r.id, r.nombre, s.slug;

COMMENT ON VIEW public.vw_conteo_comuna_rubro IS 'Conteo de emprendimientos publicados por comuna y subcategoría.';

-- -----------------------------------------------------------------------------
-- 2. vw_conteo_comuna_rubro_contado
-- Aplica LEAST(total_registrados, maximo_contable) por rubro de apertura.
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

COMMENT ON VIEW public.vw_conteo_comuna_rubro_contado IS 'Conteo por comuna y rubro con tope maximo_contable aplicado.';

-- -----------------------------------------------------------------------------
-- 3. vw_apertura_rubros_comuna
-- Por comuna y rubro: objetivo, registrados, faltan, porcentaje.
-- Incluye todas las comunas × rubros de apertura (registrados en 0 si no hay).
-- -----------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.vw_apertura_rubros_comuna AS
SELECT
  c.slug                                                                 AS comuna_slug,
  c.nombre                                                               AS comuna_nombre,
  r.nombre                                                               AS region_nombre,
  ra.subcategoria_slug                                                   AS subcategoria_slug,
  COALESCE(ra.nombre, s.nombre, ra.subcategoria_slug)                    AS subcategoria_nombre,
  ra.prioridad                                                           AS prioridad,
  ra.maximo_contable                                                     AS objetivo,
  COALESCE(v.total_registrados, 0)::int                                  AS registrados,
  GREATEST(ra.maximo_contable - COALESCE(v.total_registrados, 0), 0)::int AS faltan,
  ROUND(
    (LEAST(COALESCE(v.total_registrados, 0), ra.maximo_contable)::numeric / NULLIF(ra.maximo_contable, 0)) * 100,
    1
  )::numeric                                                             AS porcentaje
FROM public.comunas c
JOIN public.regiones r ON r.id = c.region_id
CROSS JOIN public.rubros_apertura ra
LEFT JOIN public.subcategorias s ON s.slug = ra.subcategoria_slug
LEFT JOIN public.vw_conteo_comuna_rubro v
  ON v.comuna_slug = c.slug
  AND v.subcategoria_slug = ra.subcategoria_slug
WHERE ra.activo = true;

COMMENT ON VIEW public.vw_apertura_rubros_comuna IS 'Detalle por comuna y rubro: objetivo, registrados, faltan y porcentaje para /cobertura.';

-- -----------------------------------------------------------------------------
-- 4. vw_comunas_por_abrir
-- Por comuna: total contado, meta, faltan, porcentaje y estado.
-- Sin rubros_detalle; el detalle por rubro está en vw_apertura_rubros_comuna.
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
)
SELECT
  c.slug                                                                 AS comuna_slug,
  c.nombre                                                               AS comuna_nombre,
  r.nombre                                                               AS region_nombre,
  COALESCE(t.total_contado_apertura, 0)::int                             AS total_contado_apertura,
  COALESCE(t.total_contado_apertura, 0)::int                             AS total_emprendedores,  -- alias compatibilidad
  mc.meta_apertura                                                       AS meta_apertura,
  GREATEST(mc.meta_apertura - COALESCE(t.total_contado_apertura, 0), 0)::int AS faltan_emprendedores_meta,
  ROUND(
    (COALESCE(t.total_contado_apertura, 0)::numeric / NULLIF(mc.meta_apertura, 0)) * 100,
    1
  )::numeric                                                             AS porcentaje_apertura,
  ROUND(
    (COALESCE(t.total_contado_apertura, 0)::numeric / NULLIF(mc.meta_apertura, 0)) * 100,
    1
  )::numeric                                                             AS avance_porcentaje,   -- alias compatibilidad
  CASE
    WHEN COALESCE(t.total_contado_apertura, 0) >= mc.meta_apertura THEN 'activa'
    WHEN COALESCE(t.total_contado_apertura, 0) > 0                 THEN 'en_apertura'
    ELSE 'sin_cobertura'
  END                                                                    AS estado_apertura
FROM public.comunas c
JOIN public.regiones r ON r.id = c.region_id
CROSS JOIN meta_config mc
LEFT JOIN totales_por_comuna t ON t.comuna_slug = c.slug;

COMMENT ON VIEW public.vw_comunas_por_abrir IS 'Estado de apertura por comuna: total contado, meta, faltan, porcentaje y estado.';

-- -----------------------------------------------------------------------------
-- 5. vw_resumen_regiones_apertura
-- Por región: total comunas, activas, en apertura, sin cobertura, % cobertura.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.vw_resumen_regiones_apertura AS
WITH agg AS (
  SELECT
    v.region_nombre,
    COUNT(*)::int                                          AS total_comunas,
    COUNT(*) FILTER (WHERE v.estado_apertura = 'activa')    AS comunas_activas,
    COUNT(*) FILTER (WHERE v.estado_apertura = 'en_apertura') AS comunas_en_apertura,
    COUNT(*) FILTER (WHERE v.estado_apertura = 'sin_cobertura') AS comunas_sin_cobertura
  FROM public.vw_comunas_por_abrir v
  GROUP BY v.region_nombre
)
SELECT
  COALESCE(re.slug, lower(replace(agg.region_nombre, ' ', '-'))) AS region_slug,
  agg.region_nombre                                              AS region_nombre,
  agg.total_comunas                                              AS total_comunas,
  agg.comunas_activas                                            AS comunas_activas,
  agg.comunas_en_apertura                                        AS comunas_en_apertura,
  agg.comunas_sin_cobertura                                      AS comunas_sin_cobertura,
  ROUND(
    (agg.comunas_activas::numeric / NULLIF(agg.total_comunas, 0)) * 100,
    1
  )::numeric                                                     AS porcentaje_cobertura_region
FROM agg
LEFT JOIN public.regiones re ON re.nombre = agg.region_nombre;

COMMENT ON VIEW public.vw_resumen_regiones_apertura IS 'Resumen por región: total comunas, activas, en apertura, sin cobertura y % cobertura.';

-- -----------------------------------------------------------------------------
-- 6. vw_resumen_pais_apertura
-- Una fila: resumen nacional de cobertura.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.vw_resumen_pais_apertura AS
SELECT
  'Chile'::text                                                AS pais_nombre,
  COUNT(*)::int                                                AS total_comunas,
  COUNT(*) FILTER (WHERE estado_apertura = 'activa')::int      AS comunas_activas,
  COUNT(*) FILTER (WHERE estado_apertura = 'en_apertura')::int AS comunas_en_apertura,
  COUNT(*) FILTER (WHERE estado_apertura = 'sin_cobertura')::int AS comunas_sin_cobertura,
  ROUND(
    (COUNT(*) FILTER (WHERE estado_apertura = 'activa')::numeric / NULLIF(COUNT(*), 0)) * 100,
    1
  )::numeric                                                   AS porcentaje_cobertura_pais
FROM public.vw_comunas_por_abrir;

COMMENT ON VIEW public.vw_resumen_pais_apertura IS 'Resumen país: total comunas, activas, en apertura, sin cobertura y % cobertura.';
