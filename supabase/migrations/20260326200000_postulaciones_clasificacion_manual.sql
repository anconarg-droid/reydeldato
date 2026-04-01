-- Clasificación manual en postulaciones (formulario público simple)
ALTER TABLE public.postulaciones_emprendedores
  ADD COLUMN IF NOT EXISTS categoria_id uuid REFERENCES public.categorias(id) ON DELETE SET NULL;

ALTER TABLE public.postulaciones_emprendedores
  ADD COLUMN IF NOT EXISTS subcategorias_ids uuid[];

COMMENT ON COLUMN public.postulaciones_emprendedores.categoria_id IS
  'Categoría elegida en el formulario público antes de publicar.';
COMMENT ON COLUMN public.postulaciones_emprendedores.subcategorias_ids IS
  'Subcategorías elegidas (UUID) antes de publicar.';
