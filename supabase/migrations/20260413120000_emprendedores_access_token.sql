-- Link mágico para editar ficha sin login (panel emprendedor vía /revisar?token=...)
ALTER TABLE public.emprendedores
  ADD COLUMN IF NOT EXISTS access_token text,
  ADD COLUMN IF NOT EXISTS access_token_expira_at timestamptz;

CREATE INDEX IF NOT EXISTS emprendedores_access_token_idx
  ON public.emprendedores (access_token)
  WHERE access_token IS NOT NULL;

COMMENT ON COLUMN public.emprendedores.access_token IS 'Token opaco para acceso sin sesión a /revisar (no es JWT).';
COMMENT ON COLUMN public.emprendedores.access_token_expira_at IS 'Caducidad del access_token; NULL o pasado = inválido.';
