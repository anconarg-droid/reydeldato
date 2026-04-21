-- Access token opaco para editar borrador sin exponer `id` en URL pública.
ALTER TABLE public.postulaciones_emprendedores
  ADD COLUMN IF NOT EXISTS access_token text,
  ADD COLUMN IF NOT EXISTS access_token_expira_at timestamptz;

-- Índice único parcial: token solo si está presente.
CREATE UNIQUE INDEX IF NOT EXISTS postulaciones_emprendedores_access_token_uidx
  ON public.postulaciones_emprendedores (access_token)
  WHERE access_token IS NOT NULL;

COMMENT ON COLUMN public.postulaciones_emprendedores.access_token IS 'Token opaco para editar borrador (/publicar?token=...).';
COMMENT ON COLUMN public.postulaciones_emprendedores.access_token_expira_at IS 'Caducidad del access_token del borrador; NULL o pasado = inválido.';

