-- =============================================================================
-- Estados de clasificación y publicación – Definición definitiva
-- Separa claramente:
--   Clasificación: sin_clasificar | clasificada_automatica | pendiente_revision | clasificada_manual
--   Publicación:   borrador | pendiente_aprobacion | publicado | rechazado
-- Mantiene clasificacion_pendiente y clasificacion_feedback_log para aprendizaje futuro.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Normalizar datos existentes antes de restricciones
-- -----------------------------------------------------------------------------
UPDATE public.emprendedores
SET estado_publicacion = 'pendiente_aprobacion'
WHERE estado_publicacion = 'pendiente_verificacion';

UPDATE public.emprendedores
SET classification_status = CASE
  WHEN classification_status = 'automatica' THEN 'clasificada_automatica'
  WHEN classification_status = 'corregida_manual' THEN 'clasificada_manual'
  WHEN classification_status = 'pendiente_revision' THEN 'pendiente_revision'
  ELSE 'sin_clasificar'
END
WHERE classification_status IS NOT NULL
  AND classification_status NOT IN ('sin_clasificar', 'clasificada_automatica', 'pendiente_revision', 'clasificada_manual');

UPDATE public.emprendedores
SET classification_status = 'sin_clasificar'
WHERE classification_status IS NULL;

-- -----------------------------------------------------------------------------
-- 2. Restricción estado de clasificación (classification_status)
-- Valores: sin_clasificar | clasificada_automatica | pendiente_revision | clasificada_manual
-- -----------------------------------------------------------------------------
DO $$
DECLARE
  cn name;
BEGIN
  FOR cn IN
    SELECT c.conname
    FROM pg_constraint c
    JOIN pg_class t ON c.conrelid = t.oid
    WHERE t.relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
      AND t.relname = 'emprendedores'
      AND c.contype = 'c'
      AND pg_get_constraintdef(c.oid) LIKE '%classification_status%'
  LOOP
    EXECUTE format('ALTER TABLE public.emprendedores DROP CONSTRAINT IF EXISTS %I', cn);
  END LOOP;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'emprendedores' AND column_name = 'classification_status'
  ) THEN
    ALTER TABLE public.emprendedores
      ADD CONSTRAINT emprendedores_classification_status_check
      CHECK (classification_status IN (
        'sin_clasificar',
        'clasificada_automatica',
        'pendiente_revision',
        'clasificada_manual'
      ));
  END IF;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

COMMENT ON COLUMN public.emprendedores.classification_status IS
  'Estado de clasificación: sin_clasificar | clasificada_automatica | pendiente_revision | clasificada_manual';

-- -----------------------------------------------------------------------------
-- 3. Restricción estado de publicación (estado_publicacion)
-- Valores: borrador | pendiente_aprobacion | publicado | rechazado
-- -----------------------------------------------------------------------------
DO $$
DECLARE
  cn name;
BEGIN
  FOR cn IN
    SELECT c.conname
    FROM pg_constraint c
    JOIN pg_class t ON c.conrelid = t.oid
    WHERE t.relname = 'emprendedores'
      AND c.contype = 'c'
      AND pg_get_constraintdef(c.oid) LIKE '%estado_publicacion%'
  LOOP
    EXECUTE format('ALTER TABLE public.emprendedores DROP CONSTRAINT IF EXISTS %I', cn);
  END LOOP;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'emprendedores' AND column_name = 'estado_publicacion'
  ) THEN
    ALTER TABLE public.emprendedores
      ADD CONSTRAINT emprendedores_estado_publicacion_check
      CHECK (estado_publicacion IN (
        'borrador',
        'pendiente_aprobacion',
        'publicado',
        'rechazado'
      ));
  END IF;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

COMMENT ON COLUMN public.emprendedores.estado_publicacion IS
  'Estado de publicación: borrador | pendiente_aprobacion | publicado | rechazado';

-- -----------------------------------------------------------------------------
-- 4. Tablas para aprendizaje futuro (asegurar que existen)
-- clasificacion_pendiente: cola de revisión humana
-- clasificacion_feedback_log: registro de correcciones
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.clasificacion_pendiente (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  emprendedor_id uuid NOT NULL REFERENCES public.emprendedores(id) ON DELETE CASCADE,
  prioridad smallint NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pendiente' CHECK (status IN ('pendiente', 'en_revision', 'resuelto')),
  assigned_to uuid,
  resuelto_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_clasificacion_pendiente_emprendedor UNIQUE (emprendedor_id)
);

CREATE TABLE IF NOT EXISTS public.clasificacion_feedback_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  emprendedor_id uuid NOT NULL REFERENCES public.emprendedores(id) ON DELETE CASCADE,
  action text NOT NULL CHECK (action IN ('correccion', 'aprobacion', 'rechazo', 'observacion')),
  old_subcategoria_id uuid REFERENCES public.subcategorias(id) ON DELETE SET NULL,
  new_subcategoria_id uuid REFERENCES public.subcategorias(id) ON DELETE SET NULL,
  reviewed_by uuid,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_clasificacion_pendiente_status ON public.clasificacion_pendiente(status);
CREATE INDEX IF NOT EXISTS idx_clasificacion_pendiente_prioridad_created ON public.clasificacion_pendiente(prioridad DESC, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_clasificacion_pendiente_emprendedor ON public.clasificacion_pendiente(emprendedor_id);

CREATE INDEX IF NOT EXISTS idx_clasificacion_feedback_log_emprendedor ON public.clasificacion_feedback_log(emprendedor_id);
CREATE INDEX IF NOT EXISTS idx_clasificacion_feedback_log_created ON public.clasificacion_feedback_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_clasificacion_feedback_log_action ON public.clasificacion_feedback_log(action);

COMMENT ON TABLE public.clasificacion_pendiente IS
  'Cola de emprendimientos cuya clasificación requiere revisión humana. Base para aprendizaje futuro.';
COMMENT ON TABLE public.clasificacion_feedback_log IS
  'Log de correcciones y feedback de moderación. Base para aprendizaje futuro.';
