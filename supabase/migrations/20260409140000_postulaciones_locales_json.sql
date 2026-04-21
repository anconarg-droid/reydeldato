-- Permite almacenar múltiples locales en postulaciones (edición de ficha publicada / preview de panel).
-- Fuente de verdad para cambios pendientes; se sincroniza a `emprendedor_locales` al aprobar en admin.

ALTER TABLE public.postulaciones_emprendedores
  ADD COLUMN IF NOT EXISTS locales jsonb;

COMMENT ON COLUMN public.postulaciones_emprendedores.locales IS
  'Locales físicos propuestos en la postulación (JSON). Se aplica a emprendedor_locales al aprobar.';

