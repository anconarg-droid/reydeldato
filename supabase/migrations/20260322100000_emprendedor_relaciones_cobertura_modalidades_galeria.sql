-- =============================================================================
-- Pivotes usados al aprobar postulaciones y en el panel (cobertura, modalidades, galería).
-- comuna_id / region_id usan el MISMO tipo que public.comunas.id y public.regiones.id
-- (p. ej. smallint en proyectos legacy o uuid en otros); se resuelve en tiempo de migración.
-- =============================================================================

DO $$
DECLARE
  comuna_ty text;
  region_ty text;
BEGIN
  SELECT format_type(a.atttypid, a.atttypmod) INTO comuna_ty
  FROM pg_attribute a
  JOIN pg_class c ON c.oid = a.attrelid
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public'
    AND c.relname = 'comunas'
    AND a.attname = 'id'
    AND a.attnum > 0
    AND NOT a.attisdropped;

  SELECT format_type(a.atttypid, a.atttypmod) INTO region_ty
  FROM pg_attribute a
  JOIN pg_class c ON c.oid = a.attrelid
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public'
    AND c.relname = 'regiones'
    AND a.attname = 'id'
    AND a.attnum > 0
    AND NOT a.attisdropped;

  IF comuna_ty IS NULL THEN
    RAISE EXCEPTION 'Migración: no se encontró public.comunas.id';
  END IF;
  IF region_ty IS NULL THEN
    RAISE EXCEPTION 'Migración: no se encontró public.regiones.id';
  END IF;

  EXECUTE format(
    'CREATE TABLE IF NOT EXISTS public.emprendedor_comunas_cobertura (
      emprendedor_id uuid NOT NULL
        REFERENCES public.emprendedores(id) ON DELETE CASCADE,
      comuna_id %s NOT NULL
        REFERENCES public.comunas(id) ON DELETE CASCADE,
      PRIMARY KEY (emprendedor_id, comuna_id)
    )',
    comuna_ty
  );

  EXECUTE format(
    'CREATE TABLE IF NOT EXISTS public.emprendedor_regiones_cobertura (
      emprendedor_id uuid NOT NULL
        REFERENCES public.emprendedores(id) ON DELETE CASCADE,
      region_id %s NOT NULL
        REFERENCES public.regiones(id) ON DELETE CASCADE,
      PRIMARY KEY (emprendedor_id, region_id)
    )',
    region_ty
  );
END $$;

CREATE INDEX IF NOT EXISTS idx_emprendedor_comunas_cobertura_emprendedor
  ON public.emprendedor_comunas_cobertura (emprendedor_id);
CREATE INDEX IF NOT EXISTS idx_emprendedor_comunas_cobertura_comuna
  ON public.emprendedor_comunas_cobertura (comuna_id);

COMMENT ON TABLE public.emprendedor_comunas_cobertura IS
  'N:M emprendimiento–comuna para cobertura declarada (slugs también en emprendedores.comunas_cobertura).';

CREATE INDEX IF NOT EXISTS idx_emprendedor_regiones_cobertura_emprendedor
  ON public.emprendedor_regiones_cobertura (emprendedor_id);

COMMENT ON TABLE public.emprendedor_regiones_cobertura IS
  'N:M emprendimiento–región para cobertura regional/nacional segmentada.';

CREATE TABLE IF NOT EXISTS public.emprendedor_modalidades (
  emprendedor_id uuid NOT NULL
    REFERENCES public.emprendedores(id) ON DELETE CASCADE,
  modalidad text NOT NULL,
  PRIMARY KEY (emprendedor_id, modalidad),
  CONSTRAINT emprendedor_modalidades_modalidad_check CHECK (
    modalidad IN ('local_fisico', 'presencial_terreno', 'online')
  )
);

CREATE INDEX IF NOT EXISTS idx_emprendedor_modalidades_emprendedor
  ON public.emprendedor_modalidades (emprendedor_id);

COMMENT ON TABLE public.emprendedor_modalidades IS
  'Modalidades de atención del emprendimiento; alineado con panel y aprobar postulación.';

CREATE TABLE IF NOT EXISTS public.emprendedor_galeria (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  emprendedor_id uuid NOT NULL
    REFERENCES public.emprendedores(id) ON DELETE CASCADE,
  imagen_url text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_emprendedor_galeria_emprendedor
  ON public.emprendedor_galeria (emprendedor_id);

COMMENT ON TABLE public.emprendedor_galeria IS
  'Imágenes adicionales del emprendimiento; sync desde postulación/panel.';
