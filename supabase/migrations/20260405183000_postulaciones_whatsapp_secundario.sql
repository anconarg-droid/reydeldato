-- WhatsApp secundario opcional en borrador/postulación (espejo antes de publicar).
ALTER TABLE public.postulaciones_emprendedores
  ADD COLUMN IF NOT EXISTS whatsapp_secundario text;

COMMENT ON COLUMN public.postulaciones_emprendedores.whatsapp_secundario IS
  'WhatsApp secundario opcional; máximo 2 números por ficha.';
