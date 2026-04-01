-- Palabras clave opcionales ingresadas por el usuario (no visibles públicamente).
-- Se guardan como text[] para clasificación interna y soporte de búsqueda.

ALTER TABLE public.postulaciones_emprendedores
  ADD COLUMN IF NOT EXISTS keywords_usuario text[];

COMMENT ON COLUMN public.postulaciones_emprendedores.keywords_usuario IS
  'Keywords opcionales ingresadas por el usuario (normalizadas). No se muestran públicamente; se usan para clasificación interna.';

