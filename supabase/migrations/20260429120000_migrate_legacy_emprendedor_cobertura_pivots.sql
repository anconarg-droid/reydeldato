-- =============================================================================
-- Copia datos desde nombres legacy de pivotes de cobertura (si existen) hacia
-- las tablas canónicas usadas por aprobar, panel y vw_emprendedores_algolia_final.
-- No elimina tablas legacy. Idempotente (ON CONFLICT DO NOTHING).
-- Ejecutar después de tener creadas emprendedor_comunas_cobertura y
-- emprendedor_regiones_cobertura (p. ej. 20260322100000).
-- =============================================================================

-- Comunas: emprendedor_cobertura_comunas -> emprendedor_comunas_cobertura
DO $$
BEGIN
  IF to_regclass('public.emprendedor_cobertura_comunas') IS NULL THEN
    RAISE NOTICE 'Omitido: no existe public.emprendedor_cobertura_comunas';
  ELSIF to_regclass('public.emprendedor_comunas_cobertura') IS NULL THEN
    RAISE NOTICE 'Omitido: falta public.emprendedor_comunas_cobertura';
  ELSE
    INSERT INTO public.emprendedor_comunas_cobertura (emprendedor_id, comuna_id)
    SELECT src.emprendedor_id, src.comuna_id
    FROM public.emprendedor_cobertura_comunas AS src
    ON CONFLICT (emprendedor_id, comuna_id) DO NOTHING;
    RAISE NOTICE 'Migración comunas: filas intentadas desde emprendedor_cobertura_comunas';
  END IF;
END $$;

-- Regiones: emprendedor_cobertura_regiones -> emprendedor_regiones_cobertura
DO $$
BEGIN
  IF to_regclass('public.emprendedor_cobertura_regiones') IS NULL THEN
    RAISE NOTICE 'Omitido: no existe public.emprendedor_cobertura_regiones';
  ELSIF to_regclass('public.emprendedor_regiones_cobertura') IS NULL THEN
    RAISE NOTICE 'Omitido: falta public.emprendedor_regiones_cobertura';
  ELSE
    INSERT INTO public.emprendedor_regiones_cobertura (emprendedor_id, region_id)
    SELECT src.emprendedor_id, src.region_id
    FROM public.emprendedor_cobertura_regiones AS src
    ON CONFLICT (emprendedor_id, region_id) DO NOTHING;
    RAISE NOTICE 'Migración regiones: filas intentadas desde emprendedor_cobertura_regiones';
  END IF;
END $$;
