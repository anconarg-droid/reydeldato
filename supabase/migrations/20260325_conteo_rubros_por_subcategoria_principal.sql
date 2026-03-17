-- =============================================================================
-- Conteo de rubros por comuna: SOLO subcategoria_principal_id y comuna_base_id.
-- Esta vista alimenta la grilla "rubros faltantes" en /cobertura.
-- No usa categorias ni keywords; solo emprendedores.subcategoria_principal_id.
-- =============================================================================

-- Equivalente a:
--   SELECT s.id, s.nombre, COUNT(*) AS total
--   FROM emprendedores e
--   JOIN subcategorias s ON s.id = e.subcategoria_principal_id
--   WHERE e.comuna_base_id = :comunaId AND e.estado_publicacion = 'publicado'
--   GROUP BY s.id, s.nombre
CREATE OR REPLACE VIEW public.vw_conteo_comuna_rubro AS
SELECT
  c.id          AS comuna_id,
  c.slug        AS comuna_slug,
  c.nombre      AS comuna_nombre,
  r.id          AS region_id,
  r.nombre      AS region_nombre,
  s.slug        AS subcategoria_slug,
  COUNT(*)::bigint AS total_registrados
FROM public.emprendedores e
JOIN public.subcategorias s ON s.id = e.subcategoria_principal_id
JOIN public.comunas c ON c.id = e.comuna_base_id
JOIN public.regiones r ON r.id = c.region_id
WHERE e.estado_publicacion = 'publicado'
  AND e.subcategoria_principal_id IS NOT NULL
GROUP BY c.id, c.slug, c.nombre, r.id, r.nombre, s.id, s.slug, s.nombre;

COMMENT ON VIEW public.vw_conteo_comuna_rubro IS 'Conteo por comuna y subcategoría para /cobertura. Usa solo emprendedores.comuna_base_id y emprendedores.subcategoria_principal_id (no categorias ni keywords).';
