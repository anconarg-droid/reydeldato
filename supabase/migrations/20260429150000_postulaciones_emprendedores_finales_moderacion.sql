-- Columnas usadas al aprobar: guardar taxonomía/etiquetas finales en la postulación (cierre).
-- Sin ellas, PostgREST devuelve PGRST204 y el flujo queda a medias (emprendedor publicado, postulación no cerrada).

ALTER TABLE public.postulaciones_emprendedores
  ADD COLUMN IF NOT EXISTS categoria_final uuid REFERENCES public.categorias(id) ON DELETE SET NULL;

ALTER TABLE public.postulaciones_emprendedores
  ADD COLUMN IF NOT EXISTS subcategoria_final uuid REFERENCES public.subcategorias(id) ON DELETE SET NULL;

ALTER TABLE public.postulaciones_emprendedores
  ADD COLUMN IF NOT EXISTS etiquetas_finales text[];

COMMENT ON COLUMN public.postulaciones_emprendedores.categoria_final IS
  'Categoría asignada por moderación al aprobar.';
COMMENT ON COLUMN public.postulaciones_emprendedores.subcategoria_final IS
  'Subcategoría principal asignada por moderación al aprobar.';
COMMENT ON COLUMN public.postulaciones_emprendedores.etiquetas_finales IS
  'Etiquetas (keywords) finales guardadas al aprobar.';
