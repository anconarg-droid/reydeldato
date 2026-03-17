-- =============================================================================
-- Taxonomía v1 oficial: ajustes para base en Supabase.
-- 1. keyword_to_subcategory_map: UNIQUE por normalized_keyword (no por keyword).
-- 2. Categoría "Otros": solo fallback interno (es_fallback_interno), no categoría pública.
-- 3. Subcategorías: campo esencial_apertura para las que cuentan para abrir comunas.
-- 4. Idempotente. Subcategorías amplias (clases, mecanico) documentadas para posible desagregación futura.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. keyword_to_subcategory_map: solo UNIQUE(normalized_keyword)
-- Eliminar UNIQUE(keyword) si existe; UNIQUE(normalized_keyword) ya lo añade 20260329000001.
-- -----------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.keyword_to_subcategory_map'::regclass
      AND conname = 'uq_keyword_to_subcategory_keyword'
  ) THEN
    ALTER TABLE public.keyword_to_subcategory_map
      DROP CONSTRAINT uq_keyword_to_subcategory_keyword;
  END IF;
EXCEPTION
  WHEN undefined_table THEN NULL;
END $$;

-- Asegurar UNIQUE(normalized_keyword) por si esta migración corre antes de 20260329000001
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.keyword_to_subcategory_map'::regclass
      AND conname = 'uq_keyword_to_subcategory_normalized'
  ) THEN
    -- Eliminar duplicados por normalized_keyword antes de añadir constraint
    DELETE FROM public.keyword_to_subcategory_map a
    USING public.keyword_to_subcategory_map b
    WHERE a.normalized_keyword = b.normalized_keyword AND a.id > b.id;
    ALTER TABLE public.keyword_to_subcategory_map
      ADD CONSTRAINT uq_keyword_to_subcategory_normalized UNIQUE (normalized_keyword);
  END IF;
EXCEPTION
  WHEN duplicate_object THEN NULL;
  WHEN undefined_table THEN NULL;
END $$;

-- -----------------------------------------------------------------------------
-- 2. Categorías: "Otros" solo como fallback interno (no categoría pública)
-- -----------------------------------------------------------------------------
ALTER TABLE public.categorias
  ADD COLUMN IF NOT EXISTS es_fallback_interno boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.categorias.es_fallback_interno IS
  'True solo para la categoría Otros: uso interno como fallback de clasificación. No se expone como categoría pública en listados/APIs.';

UPDATE public.categorias
SET es_fallback_interno = true
WHERE slug = 'otros';

-- -----------------------------------------------------------------------------
-- 3. Subcategorías: esencial_apertura (cuentan para abrir comunas)
-- -----------------------------------------------------------------------------
ALTER TABLE public.subcategorias
  ADD COLUMN IF NOT EXISTS esencial_apertura boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.subcategorias.esencial_apertura IS
  'True si esta subcategoría cuenta para la lógica de apertura de comunas (cobertura mínima).';

-- Marcar como esenciales las subcategorías que suelen definir apertura (ajustar según negocio)
UPDATE public.subcategorias
SET esencial_apertura = true
WHERE slug IN (
  'gasfiter', 'electricista', 'panaderia', 'pasteleria', 'vulcanizacion',
  'mecanico', 'fletes', 'veterinaria', 'ferreteria', 'clases',
  'empanadas', 'comida_casera', 'peluqueria', 'minimarket'
);

-- -----------------------------------------------------------------------------
-- Nota para futuras versiones: subcategorías amplias
-- 'clases' y 'mecanico' son candidatas a desagregación (ej. clases por disciplina,
-- mecanico por tipo de servicio). No bloquea v1; revisar en v2 si se subdividen.
-- -----------------------------------------------------------------------------
