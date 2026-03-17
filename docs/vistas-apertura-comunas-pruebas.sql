-- =============================================================================
-- Consultas de prueba: vistas de apertura de comunas (segunda etapa)
-- Ejecutar en Supabase SQL Editor o psql después de aplicar la migración
-- 20260317_vistas_apertura_comunas.sql
-- =============================================================================

-- 1) Conteo por comuna y rubro (solo pares con emprendimientos publicados)
SELECT * FROM public.vw_conteo_comuna_rubro LIMIT 20;

-- 2) Conteo con límite maximo_contable aplicado por rubro
SELECT * FROM public.vw_conteo_comuna_rubro_contado LIMIT 20;

-- 3) Vista final: estado de apertura por comuna
SELECT * FROM public.vw_comunas_por_abrir LIMIT 20;

-- 4) Solo comunas en apertura (ordenadas por avance)
SELECT
  comuna_slug,
  comuna_nombre,
  region_nombre,
  total_contado_apertura,
  meta_apertura,
  faltan_emprendedores_meta,
  porcentaje_apertura,
  estado_apertura
FROM public.vw_comunas_por_abrir
WHERE estado_apertura = 'en_apertura'
ORDER BY porcentaje_apertura DESC;
