-- Palabras clave del postulante en jsonb (alineado con emprendedores y APIs de moderación).
ALTER TABLE public.postulaciones_emprendedores
  ADD COLUMN IF NOT EXISTS keywords_usuario_json jsonb;

COMMENT ON COLUMN public.postulaciones_emprendedores.keywords_usuario_json IS
  'Keywords del usuario como JSON array de strings (ej. ["paltas","tomates"]); se normaliza al guardar junto con keywords_usuario (text[]).';
