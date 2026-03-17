-- =============================================================================
-- Separación conceptual: APERTURA DE COMUNA vs OFERTA DISPONIBLE
-- =============================================================================
-- APERTURA: solo emprendimientos con comuna_base_id = esa comuna (ya usado en
--   vw_conteo_comuna_rubro, vw_comunas_por_abrir, comunas.emprendimientos_registrados).
-- OFERTA: base + negocios que atienden la comuna (cobertura) + regional + nacional.
-- =============================================================================

-- Comentarios en vistas existentes (solo documentación)
COMMENT ON VIEW public.vw_conteo_comuna_rubro IS
  'APERTURA: conteo de emprendimientos publicados por comuna y subcategoría. Solo comuna_base_id = comuna (no incluye cobertura).';
COMMENT ON VIEW public.vw_comunas_por_abrir IS
  'APERTURA: estado por comuna usando solo emprendimientos con comuna_base en esa comuna.';
COMMENT ON VIEW public.vw_apertura_rubros_comuna IS
  'APERTURA: rubros por comuna con registrados = solo negocios base en esa comuna.';

-- Función: contar emprendimientos que "atienden" una comuna (oferta disponible)
-- Incluye: base en la comuna + cobertura explícita (comunas) + regional + nacional
CREATE OR REPLACE FUNCTION public.get_oferta_comuna_count(p_comuna_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_region_id uuid;
  v_count int;
BEGIN
  SELECT region_id INTO v_region_id FROM public.comunas WHERE id = p_comuna_id LIMIT 1;
  IF v_region_id IS NULL THEN
    RETURN 0;
  END IF;

  SELECT COUNT(DISTINCT e.id)::int INTO v_count
  FROM public.emprendedores e
  WHERE e.estado_publicacion = 'publicado'
    AND (
      e.comuna_base_id = p_comuna_id
      OR EXISTS (
        SELECT 1 FROM public.emprendedor_comunas_cobertura ecc
        WHERE ecc.emprendedor_id = e.id AND ecc.comuna_id = p_comuna_id
      )
      OR e.nivel_cobertura = 'nacional'
      OR (
        e.nivel_cobertura = 'varias_regiones'
        AND EXISTS (
          SELECT 1 FROM public.emprendedor_regiones_cobertura err
          WHERE err.emprendedor_id = e.id AND err.region_id = v_region_id
        )
      )
    );

  RETURN COALESCE(v_count, 0);
END;
$$;

COMMENT ON FUNCTION public.get_oferta_comuna_count(uuid) IS
  'OFERTA: cuenta emprendimientos que atienden la comuna (base + cobertura comunas + regional + nacional). Para búsqueda y bloque "Oferta disponible" en /cobertura.';

GRANT EXECUTE ON FUNCTION public.get_oferta_comuna_count(uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.get_oferta_comuna_count(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_oferta_comuna_count(uuid) TO service_role;
