-- =============================================================================
-- Rellenar columna region (text) en comunas desde regiones
-- Para que en la UI de Supabase (o vistas) aparezca el nombre de la región.
-- =============================================================================

-- Crear la columna si no existe (por si se agregó manualmente en el dashboard)
ALTER TABLE public.comunas
  ADD COLUMN IF NOT EXISTS region text;

-- Rellenar/actualizar desde la tabla regiones
UPDATE public.comunas c
SET region = r.nombre
FROM public.regiones r
WHERE c.region_id = r.id
  AND (c.region IS DISTINCT FROM r.nombre);

COMMENT ON COLUMN public.comunas.region IS 'Nombre de la región (denormalizado desde regiones.nombre).';

-- Trigger para mantener region al insertar o actualizar region_id
CREATE OR REPLACE FUNCTION public.comunas_sync_region()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.region_id IS NOT NULL THEN
    SELECT nombre INTO NEW.region FROM public.regiones WHERE id = NEW.region_id;
  ELSE
    NEW.region := NULL;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS comunas_sync_region_trigger ON public.comunas;
CREATE TRIGGER comunas_sync_region_trigger
  BEFORE INSERT OR UPDATE OF region_id ON public.comunas
  FOR EACH ROW
  EXECUTE FUNCTION public.comunas_sync_region();
