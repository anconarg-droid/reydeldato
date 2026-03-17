-- =============================================================================
-- Activación automática de comunas: columnas en comunas + trigger al publicar
-- Cuando emprendimientos_registrados >= meta_emprendimientos → status = activa
-- =============================================================================

-- Columnas en comunas (sin romper estructura existente)
ALTER TABLE public.comunas
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'pendiente',
  ADD COLUMN IF NOT EXISTS meta_emprendimientos integer NOT NULL DEFAULT 50,
  ADD COLUMN IF NOT EXISTS emprendimientos_registrados integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS activated_at timestamptz;

COMMENT ON COLUMN public.comunas.status IS 'pendiente | activa; se actualiza cuando emprendimientos_registrados >= meta_emprendimientos.';
COMMENT ON COLUMN public.comunas.meta_emprendimientos IS 'Meta de emprendimientos para activar la comuna (por defecto 50).';
COMMENT ON COLUMN public.comunas.emprendimientos_registrados IS 'Conteo de emprendedores publicados con comuna_base_id = esta comuna; se actualiza con trigger.';
COMMENT ON COLUMN public.comunas.activated_at IS 'Fecha en que la comuna pasó a activa (cuando se alcanzó la meta).';

-- Asegurar valores permitidos en status
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.comunas'::regclass AND conname = 'comunas_status_check') THEN
    ALTER TABLE public.comunas ADD CONSTRAINT comunas_status_check CHECK (status IN ('pendiente', 'activa'));
  END IF;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Función: recalcular y actualizar comunas afectadas (la nueva y la anterior si cambió)
CREATE OR REPLACE FUNCTION public.comuna_sync_emprendimientos_registrados()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Actualizar la comuna actual del emprendimiento si está publicado
  IF NEW.estado_publicacion = 'publicado' AND NEW.comuna_base_id IS NOT NULL THEN
    PERFORM public.comuna_update_count(NEW.comuna_base_id);
  END IF;

  -- En UPDATE: si tenía otra comuna o dejó de estar publicado, actualizar la comuna anterior
  IF TG_OP = 'UPDATE' AND OLD.comuna_base_id IS NOT NULL
     AND (OLD.comuna_base_id IS DISTINCT FROM NEW.comuna_base_id OR OLD.estado_publicacion = 'publicado') THEN
    PERFORM public.comuna_update_count(OLD.comuna_base_id);
  END IF;

  RETURN NEW;
END;
$$;

-- Función auxiliar: actualizar conteo y status de una comuna
CREATE OR REPLACE FUNCTION public.comuna_update_count(p_comuna_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count int;
  v_meta int;
BEGIN
  SELECT COUNT(*)::int INTO v_count
  FROM public.emprendedores
  WHERE comuna_base_id = p_comuna_id
    AND estado_publicacion = 'publicado';

  UPDATE public.comunas
  SET
    emprendimientos_registrados = v_count,
    status = CASE
      WHEN v_count >= COALESCE(meta_emprendimientos, 50) THEN 'activa'
      ELSE 'pendiente'
    END,
    activated_at = CASE
      WHEN v_count >= COALESCE(meta_emprendimientos, 50) AND activated_at IS NULL THEN now()
      ELSE activated_at
    END
  WHERE id = p_comuna_id;

  RETURN;
END;
$$;

-- Trigger: después de insert o update en emprendedores
DROP TRIGGER IF EXISTS trg_comuna_sync_emprendimientos ON public.emprendedores;
CREATE TRIGGER trg_comuna_sync_emprendimientos
  AFTER INSERT OR UPDATE OF comuna_base_id, estado_publicacion ON public.emprendedores
  FOR EACH ROW
  EXECUTE FUNCTION public.comuna_sync_emprendimientos_registrados();

-- Backfill: actualizar todas las comunas con su conteo actual
UPDATE public.comunas c
SET
  emprendimientos_registrados = (
    SELECT COUNT(*)::int FROM public.emprendedores e
    WHERE e.comuna_base_id = c.id AND e.estado_publicacion = 'publicado'
  ),
  meta_emprendimientos = COALESCE(c.meta_emprendimientos, 50),
  status = CASE
    WHEN (SELECT COUNT(*)::int FROM public.emprendedores e WHERE e.comuna_base_id = c.id AND e.estado_publicacion = 'publicado') >= COALESCE(c.meta_emprendimientos, 50)
    THEN 'activa'
    ELSE 'pendiente'
  END,
  activated_at = CASE
    WHEN (SELECT COUNT(*)::int FROM public.emprendedores e WHERE e.comuna_base_id = c.id AND e.estado_publicacion = 'publicado') >= COALESCE(c.meta_emprendimientos, 50)
    THEN COALESCE(c.activated_at, now())
    ELSE c.activated_at
  END
WHERE c.id IS NOT NULL;
