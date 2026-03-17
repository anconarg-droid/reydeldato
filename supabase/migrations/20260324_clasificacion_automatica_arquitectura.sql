-- =============================================================================
-- Arquitectura de clasificación automática: texto libre + IA → subcategorías
-- estructuradas para cobertura, apertura de comunas, filtros y SEO.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Tabla de equivalencias keyword → subcategoría (sinónimos / mapeo)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.keyword_to_subcategory_map (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  keyword text NOT NULL,
  normalized_keyword text NOT NULL,
  subcategoria_id uuid NOT NULL REFERENCES public.subcategorias(id) ON DELETE CASCADE,
  confidence_default numeric(3,2) NOT NULL DEFAULT 0.85 CHECK (confidence_default >= 0 AND confidence_default <= 1),
  activo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(keyword)
);

CREATE INDEX IF NOT EXISTS idx_keyword_to_subcategory_map_normalized
  ON public.keyword_to_subcategory_map(normalized_keyword);
CREATE INDEX IF NOT EXISTS idx_keyword_to_subcategory_map_subcategoria
  ON public.keyword_to_subcategory_map(subcategoria_id);
CREATE INDEX IF NOT EXISTS idx_keyword_to_subcategory_map_activo
  ON public.keyword_to_subcategory_map(activo) WHERE activo = true;

COMMENT ON TABLE public.keyword_to_subcategory_map IS 'Equivalencias y sinónimos para mapear texto libre/IA a subcategorías estructuradas.';

-- -----------------------------------------------------------------------------
-- 2. Columnas nuevas en emprendedores
-- -----------------------------------------------------------------------------
ALTER TABLE public.emprendedores
  ADD COLUMN IF NOT EXISTS subcategoria_principal_id uuid REFERENCES public.subcategorias(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS ai_keywords_json jsonb,
  ADD COLUMN IF NOT EXISTS ai_raw_classification_json jsonb,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

COMMENT ON COLUMN public.emprendedores.subcategoria_principal_id IS 'Subcategoría principal del emprendimiento; usada para cobertura, apertura de comunas y ranking.';
COMMENT ON COLUMN public.emprendedores.ai_keywords_json IS 'Keywords/tags detectados por IA (trazabilidad).';
COMMENT ON COLUMN public.emprendedores.ai_raw_classification_json IS 'Respuesta cruda de la clasificación IA (trazabilidad).';

CREATE INDEX IF NOT EXISTS idx_emprendedores_subcategoria_principal
  ON public.emprendedores(subcategoria_principal_id);

-- -----------------------------------------------------------------------------
-- 3. Columnas nuevas en emprendedor_subcategorias (pivote)
-- -----------------------------------------------------------------------------
ALTER TABLE public.emprendedor_subcategorias
  ADD COLUMN IF NOT EXISTS source_type text DEFAULT 'manual' CHECK (source_type IS NULL OR source_type IN ('manual', 'ai', 'fallback')),
  ADD COLUMN IF NOT EXISTS confidence_score numeric(3,2) CHECK (confidence_score IS NULL OR (confidence_score >= 0 AND confidence_score <= 1)),
  ADD COLUMN IF NOT EXISTS is_primary boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();

COMMENT ON COLUMN public.emprendedor_subcategorias.source_type IS 'Origen de la asignación: manual, ai o fallback.';
COMMENT ON COLUMN public.emprendedor_subcategorias.confidence_score IS 'Confianza de la asignación (0-1).';
COMMENT ON COLUMN public.emprendedor_subcategorias.is_primary IS 'True si es la subcategoría principal del emprendimiento.';

-- -----------------------------------------------------------------------------
-- 4. Seed inicial: equivalencias keyword → subcategoría
-- Se resuelven subcategorías por slug desde public.subcategorias.
-- -----------------------------------------------------------------------------
DO $$
DECLARE
  sid uuid;
BEGIN
  -- plomero -> gasfiter
  SELECT id INTO sid FROM public.subcategorias WHERE slug = 'gasfiter' LIMIT 1;
  IF sid IS NOT NULL THEN
    INSERT INTO public.keyword_to_subcategory_map (keyword, normalized_keyword, subcategoria_id, confidence_default, activo)
    VALUES ('plomero', 'plomero', sid, 0.95, true)
    ON CONFLICT (keyword) DO UPDATE SET subcategoria_id = EXCLUDED.subcategoria_id, updated_at = now();
  END IF;

  -- tortas -> pasteleria
  SELECT id INTO sid FROM public.subcategorias WHERE slug = 'pasteleria' LIMIT 1;
  IF sid IS NOT NULL THEN
    INSERT INTO public.keyword_to_subcategory_map (keyword, normalized_keyword, subcategoria_id, confidence_default, activo)
    VALUES ('tortas', 'tortas', sid, 0.9, true),
           ('torta casera', 'torta-casera', sid, 0.85, true)
    ON CONFLICT (keyword) DO UPDATE SET subcategoria_id = EXCLUDED.subcategoria_id, updated_at = now();
  END IF;

  -- electricidad domiciliaria -> electricista
  SELECT id INTO sid FROM public.subcategorias WHERE slug = 'electricista' LIMIT 1;
  IF sid IS NOT NULL THEN
    INSERT INTO public.keyword_to_subcategory_map (keyword, normalized_keyword, subcategoria_id, confidence_default, activo)
    VALUES ('electricidad domiciliaria', 'electricidad-domiciliaria', sid, 0.9, true),
           ('electricista', 'electricista', sid, 1.0, true)
    ON CONFLICT (keyword) DO UPDATE SET subcategoria_id = EXCLUDED.subcategoria_id, updated_at = now();
  END IF;

  -- empanadas -> empanadas (si existe la subcategoría)
  SELECT id INTO sid FROM public.subcategorias WHERE slug = 'empanadas' LIMIT 1;
  IF sid IS NOT NULL THEN
    INSERT INTO public.keyword_to_subcategory_map (keyword, normalized_keyword, subcategoria_id, confidence_default, activo)
    VALUES ('empanadas', 'empanadas', sid, 1.0, true)
    ON CONFLICT (keyword) DO UPDATE SET subcategoria_id = EXCLUDED.subcategoria_id, updated_at = now();
  END IF;

  -- clases particulares -> clases
  SELECT id INTO sid FROM public.subcategorias WHERE slug = 'clases' LIMIT 1;
  IF sid IS NOT NULL THEN
    INSERT INTO public.keyword_to_subcategory_map (keyword, normalized_keyword, subcategoria_id, confidence_default, activo)
    VALUES ('clases particulares', 'clases-particulares', sid, 0.9, true),
           ('clases', 'clases', sid, 1.0, true)
    ON CONFLICT (keyword) DO UPDATE SET subcategoria_id = EXCLUDED.subcategoria_id, updated_at = now();
  END IF;

  -- gasfiter (ya como slug)
  SELECT id INTO sid FROM public.subcategorias WHERE slug = 'gasfiter' LIMIT 1;
  IF sid IS NOT NULL THEN
    INSERT INTO public.keyword_to_subcategory_map (keyword, normalized_keyword, subcategoria_id, confidence_default, activo)
    VALUES ('gasfiter', 'gasfiter', sid, 1.0, true),
           ('gasfitero', 'gasfitero', sid, 0.95, true)
    ON CONFLICT (keyword) DO UPDATE SET subcategoria_id = EXCLUDED.subcategoria_id, updated_at = now();
  END IF;

  -- panaderia, panadero
  SELECT id INTO sid FROM public.subcategorias WHERE slug = 'panaderia' LIMIT 1;
  IF sid IS NOT NULL THEN
    INSERT INTO public.keyword_to_subcategory_map (keyword, normalized_keyword, subcategoria_id, confidence_default, activo)
    VALUES ('panaderia', 'panaderia', sid, 1.0, true),
           ('panadero', 'panadero', sid, 0.95, true)
    ON CONFLICT (keyword) DO UPDATE SET subcategoria_id = EXCLUDED.subcategoria_id, updated_at = now();
  END IF;

  -- mecanico, taller mecanico
  SELECT id INTO sid FROM public.subcategorias WHERE slug = 'mecanico' LIMIT 1;
  IF sid IS NOT NULL THEN
    INSERT INTO public.keyword_to_subcategory_map (keyword, normalized_keyword, subcategoria_id, confidence_default, activo)
    VALUES ('mecanico', 'mecanico', sid, 1.0, true),
           ('taller mecanico', 'taller-mecanico', sid, 0.95, true)
    ON CONFLICT (keyword) DO UPDATE SET subcategoria_id = EXCLUDED.subcategoria_id, updated_at = now();
  END IF;

  -- fletes
  SELECT id INTO sid FROM public.subcategorias WHERE slug = 'fletes' LIMIT 1;
  IF sid IS NOT NULL THEN
    INSERT INTO public.keyword_to_subcategory_map (keyword, normalized_keyword, subcategoria_id, confidence_default, activo)
    VALUES ('fletes', 'fletes', sid, 1.0, true),
           ('flete', 'flete', sid, 0.95, true)
    ON CONFLICT (keyword) DO UPDATE SET subcategoria_id = EXCLUDED.subcategoria_id, updated_at = now();
  END IF;

  -- veterinaria
  SELECT id INTO sid FROM public.subcategorias WHERE slug = 'veterinaria' LIMIT 1;
  IF sid IS NOT NULL THEN
    INSERT INTO public.keyword_to_subcategory_map (keyword, normalized_keyword, subcategoria_id, confidence_default, activo)
    VALUES ('veterinaria', 'veterinaria', sid, 1.0, true)
    ON CONFLICT (keyword) DO UPDATE SET subcategoria_id = EXCLUDED.subcategoria_id, updated_at = now();
  END IF;

  -- ferreteria
  SELECT id INTO sid FROM public.subcategorias WHERE slug = 'ferreteria' LIMIT 1;
  IF sid IS NOT NULL THEN
    INSERT INTO public.keyword_to_subcategory_map (keyword, normalized_keyword, subcategoria_id, confidence_default, activo)
    VALUES ('ferreteria', 'ferreteria', sid, 1.0, true)
    ON CONFLICT (keyword) DO UPDATE SET subcategoria_id = EXCLUDED.subcategoria_id, updated_at = now();
  END IF;
END $$;
