-- =============================================================================
-- Campos finales (fuente de verdad pública) en emprendedores
-- No elimina columnas legacy/detectadas. Solo agrega campos *_final.
-- =============================================================================

ALTER TABLE public.emprendedores
  ADD COLUMN IF NOT EXISTS categoria_slug_final text,
  ADD COLUMN IF NOT EXISTS subcategoria_slug_final text,
  ADD COLUMN IF NOT EXISTS keywords_finales text[];

