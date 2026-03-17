-- =============================================================================
-- Motor de clasificación IA: métricas de uso, trazabilidad y aprendizaje.
-- 1. keyword_to_subcategory_map: usage_count, source_type
-- 2. clasificacion_pendiente: columnas para cola de aprendizaje
-- 3. clasificacion_feedback_log: columnas para trazabilidad de correcciones
-- Idempotente.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. keyword_to_subcategory_map: usage_count y source_type
-- -----------------------------------------------------------------------------
ALTER TABLE public.keyword_to_subcategory_map
  ADD COLUMN IF NOT EXISTS usage_count integer NOT NULL DEFAULT 0;

ALTER TABLE public.keyword_to_subcategory_map
  ADD COLUMN IF NOT EXISTS source_type text NOT NULL DEFAULT 'seed';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.keyword_to_subcategory_map'::regclass
      AND conname = 'keyword_to_subcategory_map_source_type_check'
  ) THEN
    ALTER TABLE public.keyword_to_subcategory_map
      ADD CONSTRAINT keyword_to_subcategory_map_source_type_check
      CHECK (source_type IN ('seed', 'manual', 'ai_feedback', 'user_keyword'));
  END IF;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

COMMENT ON COLUMN public.keyword_to_subcategory_map.usage_count IS
  'Veces que esta keyword participó en una clasificación exitosa (match y subcategoría asignada).';
COMMENT ON COLUMN public.keyword_to_subcategory_map.source_type IS
  'Origen: seed (diccionario inicial), manual (corrección humana), ai_feedback (keywords IA aprendidas), user_keyword (ingresadas por usuario).';

-- Asegurar updated_at para auditoría (ya existe en creación; trigger opcional)
-- UNIQUE(normalized_keyword) ya está en 20260326000000 / 20260330000000

-- -----------------------------------------------------------------------------
-- 2. clasificacion_pendiente: columnas para flujo de aprendizaje
-- -----------------------------------------------------------------------------
ALTER TABLE public.clasificacion_pendiente
  ADD COLUMN IF NOT EXISTS texto_fuente text;

ALTER TABLE public.clasificacion_pendiente
  ADD COLUMN IF NOT EXISTS keywords_detectadas_json jsonb;

ALTER TABLE public.clasificacion_pendiente
  ADD COLUMN IF NOT EXISTS sugerencias_json jsonb;

ALTER TABLE public.clasificacion_pendiente
  ADD COLUMN IF NOT EXISTS motivo text;

ALTER TABLE public.clasificacion_pendiente
  ADD COLUMN IF NOT EXISTS reviewed_by uuid;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'auth' AND table_name = 'users')
     AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'clasificacion_pendiente_reviewed_by_fkey') THEN
    ALTER TABLE public.clasificacion_pendiente
      ADD CONSTRAINT clasificacion_pendiente_reviewed_by_fkey
      FOREIGN KEY (reviewed_by) REFERENCES auth.users(id) ON DELETE SET NULL;
  END IF;
EXCEPTION
  WHEN undefined_table THEN NULL;
  WHEN duplicate_object THEN NULL;
END $$;

COMMENT ON COLUMN public.clasificacion_pendiente.texto_fuente IS
  'Texto usado para clasificación (descripcion_negocio o equivalente).';
COMMENT ON COLUMN public.clasificacion_pendiente.keywords_detectadas_json IS
  'Keywords combinadas (usuario + IA) que se intentaron mapear.';
COMMENT ON COLUMN public.clasificacion_pendiente.sugerencias_json IS
  'Candidatas o sugerencias de la IA/clasificador para trazabilidad.';
COMMENT ON COLUMN public.clasificacion_pendiente.motivo IS
  'Motivo por el que quedó pendiente (ej. sin match, baja confianza).';
COMMENT ON COLUMN public.clasificacion_pendiente.reviewed_by IS
  'Usuario que resolvió el caso (opcional).';

-- resuelto_at ya existe para cuándo se marcó como resuelto

-- -----------------------------------------------------------------------------
-- 3. clasificacion_feedback_log: columnas para trazabilidad de corrección
-- -----------------------------------------------------------------------------
ALTER TABLE public.clasificacion_feedback_log
  ADD COLUMN IF NOT EXISTS clasificacion_ia_json jsonb;

ALTER TABLE public.clasificacion_feedback_log
  ADD COLUMN IF NOT EXISTS clasificacion_final_json jsonb;

ALTER TABLE public.clasificacion_feedback_log
  ADD COLUMN IF NOT EXISTS cambio_realizado text;

COMMENT ON COLUMN public.clasificacion_feedback_log.clasificacion_ia_json IS
  'Snapshot de la clasificación automática antes de la corrección.';
COMMENT ON COLUMN public.clasificacion_feedback_log.clasificacion_final_json IS
  'Datos de la clasificación final tras la corrección manual.';
COMMENT ON COLUMN public.clasificacion_feedback_log.cambio_realizado IS
  'Descripción breve del cambio (ej. subcategoría asignada manualmente).';

-- -----------------------------------------------------------------------------
-- 4. Función para incrementar usage_count (desde backend al clasificar con éxito)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.increment_keyword_usage_count(normalized_keywords text[])
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.keyword_to_subcategory_map
  SET usage_count = usage_count + 1,
      updated_at = now()
  WHERE normalized_keyword = ANY(normalized_keywords)
    AND activo = true;
$$;

COMMENT ON FUNCTION public.increment_keyword_usage_count(text[]) IS
  'Incrementa usage_count en keyword_to_subcategory_map para las keywords que participaron en una clasificación exitosa.';
