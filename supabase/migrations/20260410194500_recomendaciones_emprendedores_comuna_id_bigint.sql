-- =============================================================================
-- REQUIERE MIGRACIÓN
--
-- Alinear recomendaciones_emprendedores.comuna_id con public.comunas.id.
-- La columna previa (p. ej. uuid) no es convertible 1:1; se elimina y se
-- repone con el MISMO tipo que comunas.id (integer / bigint / smallint / …),
-- FK y backfill por texto comuna (nombre libre) cuando coincida con
-- trim(lower(comunas.nombre)).
--
-- Pre-flight en prod (opcional): ver tipo real de comunas.id
--   SELECT format_type(a.atttypid, a.atttypmod) AS comunas_id_type
--   FROM pg_attribute a JOIN pg_class c ON c.oid = a.attrelid
--   JOIN pg_namespace n ON n.oid = c.relnamespace
--   WHERE n.nspname = 'public' AND c.relname = 'comunas'
--     AND a.attname = 'id' AND a.attnum > 0 AND NOT a.attisdropped;
-- =============================================================================

BEGIN;

-- Quitar FK antigua sobre comuna_id (el nombre en Supabase/prod puede variar).
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT c.conname
    FROM pg_constraint c
    JOIN pg_class t ON c.conrelid = t.oid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'public'
      AND t.relname = 'recomendaciones_emprendedores'
      AND c.contype = 'f'
      AND pg_get_constraintdef(c.oid) LIKE '%comuna_id%'
  LOOP
    EXECUTE format('ALTER TABLE public.recomendaciones_emprendedores DROP CONSTRAINT IF EXISTS %I', r.conname);
  END LOOP;
END $$;

ALTER TABLE public.recomendaciones_emprendedores
  DROP COLUMN IF EXISTS comuna_id;

DO $$
DECLARE
  comuna_ty text;
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

  IF comuna_ty IS NULL THEN
    RAISE EXCEPTION 'Migración: no se encontró public.comunas.id';
  END IF;

  EXECUTE format(
    'ALTER TABLE public.recomendaciones_emprendedores ADD COLUMN comuna_id %s REFERENCES public.comunas(id) ON DELETE SET NULL',
    comuna_ty
  );
END $$;

UPDATE public.recomendaciones_emprendedores r
SET comuna_id = c.id
FROM public.comunas c
WHERE r.comuna IS NOT NULL
  AND trim(lower(c.nombre)) = trim(lower(r.comuna));

CREATE INDEX IF NOT EXISTS recomendaciones_emprendedores_comuna_id_created_idx
  ON public.recomendaciones_emprendedores (comuna_id, created_at DESC NULLS LAST);

COMMENT ON COLUMN public.recomendaciones_emprendedores.comuna_id IS
  'FK a public.comunas(id). Reemplaza tipo incompatible previo cuando existía.';

COMMIT;
