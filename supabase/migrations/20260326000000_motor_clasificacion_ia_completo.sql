-- =============================================================================
-- Motor de clasificación IA – Estructura completa
-- Tablas: subcategorias, emprendedor_subcategorias, keyword_to_subcategory_map,
--         clasificacion_pendiente, clasificacion_feedback_log
-- Columnas en emprendedores: subcategoria_principal_id, keywords_usuario_json,
--         ai_keywords_json, ai_raw_classification_json, classification_status,
--         classification_confidence, classification_review_required
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. subcategorias (solo si no existe; suele existir ya)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.subcategorias (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  categoria_id uuid NOT NULL,
  nombre text NOT NULL,
  slug text NOT NULL,
  is_destacada boolean NOT NULL DEFAULT false,
  orden_destacada int,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_subcategorias_slug UNIQUE (slug)
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables t
    JOIN information_schema.table_constraints tc ON tc.table_name = t.table_name AND tc.table_schema = t.table_schema
    WHERE t.table_schema = 'public' AND t.table_name = 'subcategorias' AND tc.constraint_name = 'subcategorias_categoria_id_fkey'
  ) THEN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'categorias') THEN
      ALTER TABLE public.subcategorias
        ADD CONSTRAINT subcategorias_categoria_id_fkey
        FOREIGN KEY (categoria_id) REFERENCES public.categorias(id) ON DELETE CASCADE;
    END IF;
  END IF;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_subcategorias_categoria_id ON public.subcategorias(categoria_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_subcategorias_slug ON public.subcategorias(slug);

COMMENT ON TABLE public.subcategorias IS 'Rubros/servicios estructurados (taxonomía interna).';

-- -----------------------------------------------------------------------------
-- 2. emprendedor_subcategorias (pivote N:M)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.emprendedor_subcategorias (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  emprendedor_id uuid NOT NULL,
  subcategoria_id uuid NOT NULL,
  source_type text NOT NULL DEFAULT 'manual' CHECK (source_type IN ('manual', 'ai', 'fallback')),
  confidence_score numeric(3,2) CHECK (confidence_score IS NULL OR (confidence_score >= 0 AND confidence_score <= 1)),
  is_primary boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_emprendedor_subcategoria UNIQUE (emprendedor_id, subcategoria_id)
);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'emprendedor_subcategorias_emprendedor_id_fkey') THEN
    ALTER TABLE public.emprendedor_subcategorias
      ADD CONSTRAINT emprendedor_subcategorias_emprendedor_id_fkey
      FOREIGN KEY (emprendedor_id) REFERENCES public.emprendedores(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'emprendedor_subcategorias_subcategoria_id_fkey') THEN
    ALTER TABLE public.emprendedor_subcategorias
      ADD CONSTRAINT emprendedor_subcategorias_subcategoria_id_fkey
      FOREIGN KEY (subcategoria_id) REFERENCES public.subcategorias(id) ON DELETE CASCADE;
  END IF;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_emprendedor_subcategorias_emprendedor ON public.emprendedor_subcategorias(emprendedor_id);
CREATE INDEX IF NOT EXISTS idx_emprendedor_subcategorias_subcategoria ON public.emprendedor_subcategorias(subcategoria_id);

COMMENT ON TABLE public.emprendedor_subcategorias IS 'Pivote N:M emprendedor–subcategoría; source_type: manual, ai, fallback.';

-- -----------------------------------------------------------------------------
-- 3. keyword_to_subcategory_map (ya puede existir por 20260324)
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
  CONSTRAINT uq_keyword_to_subcategory_normalized UNIQUE (normalized_keyword)
);

CREATE INDEX IF NOT EXISTS idx_keyword_to_subcategory_map_normalized ON public.keyword_to_subcategory_map(normalized_keyword);
CREATE INDEX IF NOT EXISTS idx_keyword_to_subcategory_map_subcategoria ON public.keyword_to_subcategory_map(subcategoria_id);
CREATE INDEX IF NOT EXISTS idx_keyword_to_subcategory_map_activo ON public.keyword_to_subcategory_map(activo) WHERE activo = true;

COMMENT ON TABLE public.keyword_to_subcategory_map IS 'Mapeo keyword/sinónimo → subcategoría para clasificación automática.';

-- -----------------------------------------------------------------------------
-- 4. clasificacion_pendiente (cola de revisión humana)
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

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'auth' AND table_name = 'users')
     AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'clasificacion_pendiente_assigned_to_fkey') THEN
    ALTER TABLE public.clasificacion_pendiente
      ADD CONSTRAINT clasificacion_pendiente_assigned_to_fkey
      FOREIGN KEY (assigned_to) REFERENCES auth.users(id) ON DELETE SET NULL;
  END IF;
EXCEPTION
  WHEN undefined_table THEN NULL;
  WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_clasificacion_pendiente_status ON public.clasificacion_pendiente(status);
CREATE INDEX IF NOT EXISTS idx_clasificacion_pendiente_prioridad_created ON public.clasificacion_pendiente(prioridad DESC, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_clasificacion_pendiente_emprendedor ON public.clasificacion_pendiente(emprendedor_id);

COMMENT ON TABLE public.clasificacion_pendiente IS 'Cola de emprendimientos cuya clasificación requiere revisión humana.';

-- -----------------------------------------------------------------------------
-- 5. clasificacion_feedback_log (registro de correcciones)
-- -----------------------------------------------------------------------------
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

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'auth' AND table_name = 'users')
     AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'clasificacion_feedback_log_reviewed_by_fkey') THEN
    ALTER TABLE public.clasificacion_feedback_log
      ADD CONSTRAINT clasificacion_feedback_log_reviewed_by_fkey
      FOREIGN KEY (reviewed_by) REFERENCES auth.users(id) ON DELETE SET NULL;
  END IF;
EXCEPTION
  WHEN undefined_table THEN NULL;
  WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_clasificacion_feedback_log_emprendedor ON public.clasificacion_feedback_log(emprendedor_id);
CREATE INDEX IF NOT EXISTS idx_clasificacion_feedback_log_created ON public.clasificacion_feedback_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_clasificacion_feedback_log_action ON public.clasificacion_feedback_log(action);

COMMENT ON TABLE public.clasificacion_feedback_log IS 'Log de correcciones y feedback de moderación sobre clasificación.';

-- -----------------------------------------------------------------------------
-- 6. Columnas en emprendedores (clasificación IA)
-- -----------------------------------------------------------------------------
ALTER TABLE public.emprendedores
  ADD COLUMN IF NOT EXISTS subcategoria_principal_id uuid REFERENCES public.subcategorias(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS keywords_usuario_json jsonb,
  ADD COLUMN IF NOT EXISTS ai_keywords_json jsonb,
  ADD COLUMN IF NOT EXISTS ai_raw_classification_json jsonb,
  ADD COLUMN IF NOT EXISTS classification_status text DEFAULT 'pendiente_revision' CHECK (classification_status IS NULL OR classification_status IN ('automatica', 'pendiente_revision', 'corregida_manual')),
  ADD COLUMN IF NOT EXISTS classification_confidence numeric(3,2) CHECK (classification_confidence IS NULL OR (classification_confidence >= 0 AND classification_confidence <= 1)),
  ADD COLUMN IF NOT EXISTS classification_review_required boolean DEFAULT true;

COMMENT ON COLUMN public.emprendedores.subcategoria_principal_id IS 'Subcategoría principal; usada para cobertura, apertura de comunas y ranking.';
COMMENT ON COLUMN public.emprendedores.keywords_usuario_json IS 'Palabras clave ingresadas por el usuario (ej. ["pan","repostería"]).';
COMMENT ON COLUMN public.emprendedores.ai_keywords_json IS 'Salida IA: keywords/tags y confianza (trazabilidad).';
COMMENT ON COLUMN public.emprendedores.ai_raw_classification_json IS 'Respuesta cruda del modelo (trazabilidad).';
COMMENT ON COLUMN public.emprendedores.classification_status IS 'automatica | pendiente_revision | corregida_manual.';
COMMENT ON COLUMN public.emprendedores.classification_confidence IS 'Confianza global de la clasificación automática (0-1).';
COMMENT ON COLUMN public.emprendedores.classification_review_required IS 'True si requiere revisión humana.';

CREATE INDEX IF NOT EXISTS idx_emprendedores_subcategoria_principal ON public.emprendedores(subcategoria_principal_id);
CREATE INDEX IF NOT EXISTS idx_emprendedores_classification_status ON public.emprendedores(classification_status);
CREATE INDEX IF NOT EXISTS idx_emprendedores_classification_review_required ON public.emprendedores(classification_review_required) WHERE classification_review_required = true;
