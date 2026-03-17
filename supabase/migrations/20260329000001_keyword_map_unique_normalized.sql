-- =============================================================================
-- keyword_to_subcategory_map: evitar duplicados por normalized_keyword
-- Permite crecer el diccionario con ON CONFLICT (normalized_keyword) DO UPDATE.
-- =============================================================================

-- Eliminar duplicados por normalized_keyword (conservar el de menor id)
DELETE FROM public.keyword_to_subcategory_map a
USING public.keyword_to_subcategory_map b
WHERE a.normalized_keyword = b.normalized_keyword
  AND a.id > b.id;

-- Añadir restricción única por normalized_keyword (idempotente)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'uq_keyword_to_subcategory_normalized'
  ) THEN
    ALTER TABLE public.keyword_to_subcategory_map
      ADD CONSTRAINT uq_keyword_to_subcategory_normalized UNIQUE (normalized_keyword);
  END IF;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_keyword_to_subcategory_map_normalized
  ON public.keyword_to_subcategory_map(normalized_keyword);

COMMENT ON COLUMN public.keyword_to_subcategory_map.normalized_keyword IS
  'Forma normalizada (slug) para matching; debe ser única para evitar duplicados al alimentar desde clasificacion_pendiente o feedback.';
